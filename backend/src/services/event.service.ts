import { pool, withTx, Db } from "../config/database";
import { AuthUser } from "../types/user.types";
import { HttpError } from "../utils/httpError";
import { requireRole } from "../utils/permissions";
import { writeAudit } from "./audit.service";

/** Loads an event and checks the user may VIEW it. Students only see published events. */
export async function loadEventForUser(db: Db, user: AuthUser, eventId: string) {
  const ev = (await db.query(
    `SELECT e.*, u.name AS organizer_name FROM events e JOIN users u ON u.id=e.organizer_id WHERE e.id=$1`,
    [eventId])).rows[0];
  if (!ev) throw new HttpError(404, "Event not found.");
  if (user.role === "STUDENT" && ev.status !== "PUBLISHED") throw new HttpError(404, "Event not found.");
  if (user.role === "ORGANIZER" && ev.organizer_id !== user.id)
    throw new HttpError(403, "You can only access your own events.", { eventId });
  return ev;
}

/** Checks the user may MANAGE an event: its organizer, or an admin. */
export async function assertCanManageEvent(db: Db, user: AuthUser, eventId: string) {
  requireRole(user, "ORGANIZER", "ADMIN");
  const ev = (await db.query(`SELECT id, organizer_id FROM events WHERE id=$1`, [eventId])).rows[0];
  if (!ev) throw new HttpError(404, "Event not found.");
  if (user.role === "ORGANIZER" && ev.organizer_id !== user.id)
    throw new HttpError(403, "You can only manage your own events.", { eventId });
  return ev;
}

export async function listEvents(user: AuthUser) {
  const where = user.role === "STUDENT" ? "e.status='PUBLISHED'" : user.role === "ORGANIZER" ? "e.organizer_id=$1" : "TRUE";
  const params = user.role === "ORGANIZER" ? [user.id] : [];
  return (await pool.query(
    `SELECT e.id, e.title, e.description, e.venue, e.start_time, e.status, e.version, u.name AS organizer_name,
            COUNT(s.id)::int AS total_seats,
            COUNT(s.id) FILTER (WHERE s.status='AVAILABLE' OR (s.status='HELD' AND s.held_until<=now()))::int AS available_seats
     FROM events e JOIN users u ON u.id=e.organizer_id LEFT JOIN seats s ON s.event_id=e.id
     WHERE ${where} GROUP BY e.id, u.name ORDER BY e.start_time`, params)).rows;
}

export const getEvent = (user: AuthUser, eventId: string) => loadEventForUser(pool, user, eventId);

export async function createEvent(user: AuthUser, input: any) {
  requireRole(user, "ORGANIZER", "ADMIN");
  return withTx(async c => {
    const ev = (await c.query(
      `INSERT INTO events (organizer_id,title,description,venue,start_time,status) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [user.id, input.title, input.description, input.venue, input.start_time, input.status])).rows[0];
    await c.query(
      `INSERT INTO seats (event_id,label,row_label,seat_number)
       SELECT $1, chr(64+r)||c, chr(64+r), c FROM generate_series(1,$2) r, generate_series(1,$3) c`,
      [ev.id, input.rows, input.cols]);
    await writeAudit(c, { actorId: user.id, eventId: ev.id, action: "EVENT_UPDATED", details: { created: true } });
    return ev;
  });
}

/** Optimistic locking: UPDATE ... WHERE version = <what the user saw>. */
export async function updateEvent(user: AuthUser, eventId: string, input: any) {
  await assertCanManageEvent(pool, user, eventId);
  return withTx(async c => {
    const r = await c.query(
      `UPDATE events SET title=COALESCE($3,title), description=COALESCE($4,description), venue=COALESCE($5,venue),
              start_time=COALESCE($6,start_time), status=COALESCE($7,status), version=version+1, updated_at=now()
       WHERE id=$1 AND version=$2 RETURNING *`,
      [eventId, input.version, input.title, input.description, input.venue, input.start_time, input.status]);
    if (!r.rowCount) {
      const cur = (await c.query(`SELECT version FROM events WHERE id=$1`, [eventId])).rows[0];
      throw new HttpError(409, "Someone else changed this event. Reload and try again.", { current_version: cur?.version });
    }
    await writeAudit(c, { actorId: user.id, eventId, action: "EVENT_UPDATED", details: { fields: Object.keys(input).filter(k => k !== "version") } });
    return r.rows[0];
  });
}

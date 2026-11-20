import { pool, withTx } from "../config/database";
import { AuthUser } from "../types/user.types";
import { HttpError } from "../utils/httpError";
import { assertCanManageEvent, loadEventForUser } from "./event.service";
import { writeAudit } from "./audit.service";

/** Seat map. Expired holds are shown as AVAILABLE (computed, no cron needed). */
export async function getSeatMap(user: AuthUser, eventId: string) {
  const event = await loadEventForUser(pool, user, eventId);
  const seats = (await pool.query(
    `SELECT s.id, s.label, s.row_label, s.seat_number,
            CASE WHEN s.status='HELD' AND s.held_until<=now() THEN 'AVAILABLE' ELSE s.status END AS status,
            COALESCE(h.user_id = $2, false) AS mine
     FROM seats s LEFT JOIN holds h ON h.id=s.hold_id AND s.status='HELD' AND s.held_until>now()
     WHERE s.event_id=$1 ORDER BY s.row_label, s.seat_number`, [eventId, user.id])).rows;
  const my_hold = (await pool.query(
    `SELECT id, expires_at, EXTRACT(EPOCH FROM expires_at-now())::int AS seconds_left FROM holds
     WHERE user_id=$1 AND event_id=$2 AND status='ACTIVE' AND expires_at>now()`, [user.id, eventId])).rows[0] ?? null;
  return { event, seats, my_hold };
}

/** Organizer/admin: block or unblock seats. Booked (or actively held) seats can never be blocked. */
export async function blockSeats(user: AuthUser, eventId: string, seatIds: string[], blocked: boolean) {
  await assertCanManageEvent(pool, user, eventId);
  const ids = [...new Set(seatIds)].sort();
  return withTx(async c => {
    const rows = (await c.query(
      `SELECT id,label,status,held_until FROM seats WHERE event_id=$1 AND id=ANY($2::uuid[]) ORDER BY id FOR UPDATE`,
      [eventId, ids])).rows;
    if (rows.length !== ids.length) throw new HttpError(404, "Some seats were not found.");
    const bad = rows.filter(r => blocked
      ? !(r.status === "AVAILABLE" || (r.status === "HELD" && new Date(r.held_until) <= new Date()) || r.status === "BLOCKED")
      : r.status !== "BLOCKED");
    if (bad.length) throw new HttpError(409, blocked ? "Booked or held seats cannot be blocked." : "Only blocked seats can be unblocked.",
      { seats: bad.map(b => b.label) });
    await c.query(
      `UPDATE seats SET status=$2, hold_id=NULL, held_until=NULL WHERE id=ANY($1::uuid[])`,
      [ids, blocked ? "BLOCKED" : "AVAILABLE"]);
    await writeAudit(c, { actorId: user.id, eventId, action: "EVENT_UPDATED", details: { seats: rows.map(r => r.label), blocked } });
    return { updated: rows.length };
  });
}

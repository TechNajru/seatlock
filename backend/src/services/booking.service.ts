import { pool, withTx } from "../config/database";
import { AuthUser } from "../types/user.types";
import { HttpError } from "../utils/httpError";
import { requireRole } from "../utils/permissions";
import { assertCanManageEvent } from "./event.service";
import { writeAudit } from "./audit.service";

const MAX_SEATS = 4;

/* ------------------------------------------------------------------ *
 * holdSeats  --  THE CORE OF SEATLOCK
 *   1 transaction, rows locked in sorted order, all-or-nothing.
 *   Lock order everywhere: seats (sorted by id) -> holds -> bookings.
 * ------------------------------------------------------------------ */
export async function holdSeats(user: AuthUser, eventId: string, seatIds: string[]) {
  requireRole(user, "STUDENT");
  const ids = [...new Set(seatIds)].sort(); // stable order = no deadlocks
  if (ids.length < 1 || ids.length > MAX_SEATS) throw new HttpError(400, `Choose 1 to ${MAX_SEATS} seats.`);

  try {
    return await withTx(async c => {
      // 1. Event must be published and not started (checked with DB clock)
      const ev = (await c.query(`SELECT status, start_time <= now() AS closed FROM events WHERE id=$1`, [eventId])).rows[0];
      if (!ev || ev.status !== "PUBLISHED") throw new HttpError(404, "Event not found.");
      if (ev.closed) throw new HttpError(409, "Booking is closed. The event has started.");

      // 2. LOCK requested seats + seats of my old hold, in one sorted statement
      const locked = (await c.query(
        `SELECT s.id, s.label, s.status, s.held_until > now() AS hold_live,
                EXISTS (SELECT 1 FROM holds h WHERE h.id=s.hold_id AND h.user_id=$3 AND h.status='ACTIVE') AS mine
         FROM seats s
         WHERE s.event_id=$1 AND (s.id = ANY($2::uuid[])
           OR s.hold_id IN (SELECT id FROM holds WHERE user_id=$3 AND event_id=$1 AND status='ACTIVE'))
         ORDER BY s.id FOR UPDATE`, [eventId, ids, user.id])).rows;

      const byId = new Map(locked.map(r => [r.id, r]));
      if (ids.some(id => !byId.has(id))) throw new HttpError(404, "Some seats were not found.");

      // 3. All-or-nothing availability check (expired holds count as free; my own old hold too)
      const unavailable = ids.map(id => byId.get(id)).filter(s =>
        !(s.status === "AVAILABLE" || (s.status === "HELD" && (!s.hold_live || s.mine))));
      if (unavailable.length) {
        throw new HttpError(409, "Some seats are no longer available.",
          { unavailable: unavailable.map(s => ({ id: s.id, label: s.label, status: s.status })) });
      }

      // 4. Limit: booked seats + new hold <= 4
      const booked = (await c.query(
        `SELECT COUNT(*)::int AS n FROM booking_seats bs JOIN bookings b ON b.id=bs.booking_id
         WHERE b.user_id=$1 AND b.event_id=$2 AND bs.status='CONFIRMED'`, [user.id, eventId])).rows[0].n;
      if (booked + ids.length > MAX_SEATS)
        throw new HttpError(409, `You can own at most ${MAX_SEATS} seats per event (you already have ${booked}).`);

      // 5. Replace my previous active hold
      await c.query(
        `UPDATE seats SET status='AVAILABLE', hold_id=NULL, held_until=NULL
         WHERE event_id=$1 AND hold_id IN (SELECT id FROM holds WHERE user_id=$2 AND event_id=$1 AND status='ACTIVE')`,
        [eventId, user.id]);
      await c.query(`UPDATE holds SET status='REPLACED' WHERE user_id=$1 AND event_id=$2 AND status='ACTIVE'`, [user.id, eventId]);

      // 6. Create the 5-minute hold and mark seats (unique index = safety net)
      const hold = (await c.query(
        `INSERT INTO holds (event_id,user_id,expires_at) VALUES ($1,$2, now() + interval '5 minutes')
         RETURNING id, expires_at, EXTRACT(EPOCH FROM expires_at-now())::int AS seconds_left`, [eventId, user.id])).rows[0];
      await c.query(
        `UPDATE seats SET status='HELD', hold_id=$1, held_until=$2 WHERE id = ANY($3::uuid[])`,
        [hold.id, hold.expires_at, ids]);

      // 7. Audit in the SAME transaction
      await writeAudit(c, { actorId: user.id, eventId, action: "SEAT_HOLD", details: { hold_id: hold.id, seat_ids: ids } });
      return { hold_id: hold.id, seat_ids: ids, expires_at: hold.expires_at, seconds_left: hold.seconds_left };
    });
  } catch (e) {
    // The transaction rolled back, so the rejection is logged in its own write.
    if (e instanceof HttpError && e.status === 409) {
      await writeAudit(pool, { actorId: user.id, eventId, action: "SEAT_HOLD_REJECTED", details: { reason: e.message, ...e.data } }).catch(() => {});
    }
    throw e;
  }
}

/* ------------------------------------------------------------------ *
 * confirmHold -- turn my unexpired hold into a booking (idempotent)
 * ------------------------------------------------------------------ */
export async function confirmHold(user: AuthUser, holdId: string) {
  requireRole(user, "STUDENT");
  const h0 = (await pool.query(`SELECT user_id, event_id FROM holds WHERE id=$1`, [holdId])).rows[0];
  if (!h0) throw new HttpError(404, "Hold not found.");
  if (h0.user_id !== user.id) throw new HttpError(403, "This hold belongs to someone else.", { eventId: h0.event_id });

  return withTx(async c => {
    // lock order: seats first, then the hold row
    await c.query(`SELECT id FROM seats WHERE hold_id=$1 ORDER BY id FOR UPDATE`, [holdId]);
    const hold = (await c.query(`SELECT *, expires_at <= now() AS expired FROM holds WHERE id=$1 FOR UPDATE`, [holdId])).rows[0];

    if (hold.status === "CONFIRMED") { // clicked twice? return the same booking
      const b = (await c.query(`SELECT id FROM bookings WHERE hold_id=$1`, [holdId])).rows[0];
      return { booking_id: b.id, replay: true };
    }
    if (hold.status !== "ACTIVE") throw new HttpError(409, "This hold is no longer active.");
    if (hold.expired) throw new HttpError(409, "Your hold expired. Please choose your seats again.");

    const ev = (await c.query(`SELECT start_time <= now() AS closed FROM events WHERE id=$1`, [hold.event_id])).rows[0];
    if (ev.closed) throw new HttpError(409, "Booking is closed. The event has started.");

    const seats = (await c.query(`SELECT id FROM seats WHERE hold_id=$1`, [holdId])).rows;
    if (!seats.length) throw new HttpError(409, "Your seats are no longer held.");

    const owned = (await c.query(
      `SELECT COUNT(*)::int AS n FROM booking_seats bs JOIN bookings b ON b.id=bs.booking_id
       WHERE b.user_id=$1 AND b.event_id=$2 AND bs.status='CONFIRMED'`, [user.id, hold.event_id])).rows[0].n;
    if (owned + seats.length > MAX_SEATS) throw new HttpError(409, `You can own at most ${MAX_SEATS} seats per event.`);

    const booking = (await c.query(
      `INSERT INTO bookings (event_id,user_id,hold_id) VALUES ($1,$2,$3) RETURNING id`, [hold.event_id, user.id, holdId])).rows[0];
    await c.query(`INSERT INTO booking_seats (booking_id, seat_id) SELECT $1, id FROM seats WHERE hold_id=$2`, [booking.id, holdId]);
    await c.query(`UPDATE seats SET status='BOOKED', hold_id=NULL, held_until=NULL WHERE hold_id=$1`, [holdId]);
    await c.query(`UPDATE holds SET status='CONFIRMED' WHERE id=$1`, [holdId]);
    await writeAudit(c, { actorId: user.id, eventId: hold.event_id, action: "BOOKING_CONFIRMED",
      details: { booking_id: booking.id, seat_ids: seats.map(s => s.id) } });
    return { booking_id: booking.id, replay: false };
  });
}

/* ------------------------------------------------------------------ *
 * cancelBooking -- only my own booking
 * ------------------------------------------------------------------ */
export async function cancelBooking(user: AuthUser, bookingId: string) {
  requireRole(user, "STUDENT");
  const b0 = (await pool.query(`SELECT user_id, event_id FROM bookings WHERE id=$1`, [bookingId])).rows[0];
  if (!b0) throw new HttpError(404, "Booking not found.");
  if (b0.user_id !== user.id) throw new HttpError(403, "This booking belongs to someone else.", { eventId: b0.event_id });

  return withTx(async c => {
    const seatIds = (await c.query(
      `SELECT seat_id FROM booking_seats WHERE booking_id=$1 ORDER BY seat_id`, [bookingId])).rows.map(r => r.seat_id);
    await c.query(`SELECT id FROM seats WHERE id = ANY($1::uuid[]) ORDER BY id FOR UPDATE`, [seatIds]);
    const b = (await c.query(`SELECT status FROM bookings WHERE id=$1 FOR UPDATE`, [bookingId])).rows[0];
    if (b.status !== "CONFIRMED") throw new HttpError(409, "This booking is already cancelled.");

    await c.query(`UPDATE bookings SET status='CANCELLED', cancelled_at=now() WHERE id=$1`, [bookingId]);
    await c.query(`UPDATE booking_seats SET status='CANCELLED' WHERE booking_id=$1`, [bookingId]);
    await c.query(`UPDATE seats SET status='AVAILABLE', hold_id=NULL, held_until=NULL WHERE id = ANY($1::uuid[])`, [seatIds]);
    await writeAudit(c, { actorId: user.id, eventId: b0.event_id, action: "BOOKING_CANCELLED", details: { booking_id: bookingId, seats: seatIds.length } });
    return { cancelled: true };
  });
}

export async function listMyBookings(user: AuthUser) {
  requireRole(user, "STUDENT");
  return (await pool.query(
    `SELECT b.id, b.status, b.checked_in_at, b.created_at, e.id AS event_id, e.title, e.venue, e.start_time,
            array_agg(s.label ORDER BY s.label) AS seats
     FROM bookings b JOIN events e ON e.id=b.event_id
     JOIN booking_seats bs ON bs.booking_id=b.id JOIN seats s ON s.id=bs.seat_id
     WHERE b.user_id=$1 GROUP BY b.id, e.id ORDER BY b.created_at DESC`, [user.id])).rows;
}

/** Organizer (own events) or admin: attendee list. */
export async function listEventBookings(user: AuthUser, eventId: string) {
  await assertCanManageEvent(pool, user, eventId);
  return (await pool.query(
    `SELECT b.id, b.status, b.checked_in_at, b.created_at, u.name AS student_name, u.email AS student_email,
            array_agg(s.label ORDER BY s.label) AS seats
     FROM bookings b JOIN users u ON u.id=b.user_id
     JOIN booking_seats bs ON bs.booking_id=b.id JOIN seats s ON s.id=bs.seat_id
     WHERE b.event_id=$1 GROUP BY b.id, u.id ORDER BY u.name`, [eventId])).rows;
}

export async function checkIn(user: AuthUser, bookingId: string) {
  requireRole(user, "ORGANIZER", "ADMIN");
  const b = (await pool.query(`SELECT event_id FROM bookings WHERE id=$1`, [bookingId])).rows[0];
  if (!b) throw new HttpError(404, "Booking not found.");
  await assertCanManageEvent(pool, user, b.event_id);
  return withTx(async c => {
    const r = await c.query(
      `UPDATE bookings SET checked_in_at=now() WHERE id=$1 AND status='CONFIRMED' AND checked_in_at IS NULL RETURNING checked_in_at`, [bookingId]);
    if (!r.rowCount) throw new HttpError(409, "Already checked in, or the booking is cancelled.");
    await writeAudit(c, { actorId: user.id, eventId: b.event_id, action: "CHECKIN", details: { booking_id: bookingId } });
    return { checked_in_at: r.rows[0].checked_in_at };
  });
}

/* ------------------------------------------------------------------ *
 * sweepExpiredHolds -- background cleanup. Logs HOLD_EXPIRED.
 * (Seat maps already treat expired holds as free, this just tidies the data.)
 * ------------------------------------------------------------------ */
export async function sweepExpiredHolds() {
  return withTx(async c => {
    await c.query(
      `WITH l AS (SELECT id FROM seats WHERE status='HELD' AND held_until<=now() ORDER BY id FOR UPDATE SKIP LOCKED)
       UPDATE seats s SET status='AVAILABLE', hold_id=NULL, held_until=NULL FROM l WHERE s.id=l.id`);
    const expired = (await c.query(
      `UPDATE holds SET status='EXPIRED' WHERE status='ACTIVE' AND expires_at<=now() RETURNING id, user_id, event_id`)).rows;
    for (const h of expired) {
      await writeAudit(c, { actorId: h.user_id, eventId: h.event_id, action: "HOLD_EXPIRED", details: { hold_id: h.id } });
    }
    return expired.length;
  });
}

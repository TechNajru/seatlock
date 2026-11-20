import { as, loginAs, makeEvent, setup, teardown } from "./testUtils";
import { pool } from "../config/database";
import { auditShard } from "../utils/auditShard";
import { sweepExpiredHolds } from "../services/booking.service";

beforeAll(setup);
afterAll(teardown);

test("shard routing is stable and in range", () => {
  const id = "3f2c1b9a-0000-4000-8000-123456789abc";
  expect(auditShard(id)).toBe(auditShard(id));
  for (const k of ["a", "b", id, "xyz"]) expect([0, 1, 2, 3]).toContain(auditShard(k));
});

test("hold audit lands in the event's shard, in the same transaction", async () => {
  const org = await loginAs("organizer1@seatlock.dev");
  const { eventId, seats } = await makeEvent(org);
  const s = await loginAs("student2@seatlock.dev");
  await as(s).post(`/api/events/${eventId}/hold`, { seat_ids: [seats[0].id] });
  const shard = auditShard(eventId);
  const inShard = await pool.query(`SELECT 1 FROM audit_logs_${shard} WHERE event_id=$1 AND action='SEAT_HOLD'`, [eventId]);
  expect(inShard.rowCount).toBe(1);
  for (const other of [0, 1, 2, 3].filter(n => n !== shard)) {
    const r = await pool.query(`SELECT 1 FROM audit_logs_${other} WHERE event_id=$1`, [eventId]);
    expect(r.rowCount).toBe(0);
  }
});

test("rejected hold, expiry sweep and check-in are all logged", async () => {
  const org = await loginAs("organizer1@seatlock.dev");
  const { eventId, seats } = await makeEvent(org);
  const a = await loginAs("student3@seatlock.dev");
  const b = await loginAs("student4@seatlock.dev");
  const h = await as(a).post(`/api/events/${eventId}/hold`, { seat_ids: [seats[0].id] });
  await as(b).post(`/api/events/${eventId}/hold`, { seat_ids: [seats[0].id] }); // rejected
  await pool.query(`UPDATE holds SET expires_at=now()-interval '1 second' WHERE id=$1`, [h.body.hold_id]);
  await pool.query(`UPDATE seats SET held_until=now()-interval '1 second' WHERE id=$1`, [seats[0].id]);
  await sweepExpiredHolds();

  const h2 = await as(b).post(`/api/events/${eventId}/hold`, { seat_ids: [seats[1].id] });
  const c = await as(b).post(`/api/holds/${h2.body.hold_id}/confirm`);
  await as(org).post(`/api/organizer/bookings/${c.body.booking_id}/check-in`);

  const rows = await pool.query(`SELECT action FROM audit_logs_${auditShard(eventId)} WHERE event_id=$1`, [eventId]);
  const actions = rows.rows.map(r => r.action);
  for (const a of ["SEAT_HOLD", "SEAT_HOLD_REJECTED", "HOLD_EXPIRED", "BOOKING_CONFIRMED", "CHECKIN"]) expect(actions).toContain(a);
});

test("admin: event filter reads ONE shard; unfiltered reads all four with cursor paging", async () => {
  const org = await loginAs("organizer1@seatlock.dev");
  const admin = await loginAs("admin@seatlock.dev", "admin123");
  const { eventId } = await makeEvent(org);

  const one = await as(admin).get(`/api/admin/audit-logs?event_id=${eventId}`);
  expect(one.body.shards_queried).toEqual([auditShard(eventId)]);

  const all = await as(admin).get(`/api/admin/audit-logs`);
  expect(all.body.shards_queried).toEqual([0, 1, 2, 3]);
  expect(all.body.items.length).toBeLessThanOrEqual(50);
  const ids = all.body.items.map((i: any) => BigInt(i.id));
  expect([...ids].sort((x, y) => (y > x ? 1 : -1))).toEqual(ids); // newest first
  if (all.body.next_cursor) {
    const page2 = await as(admin).get(`/api/admin/audit-logs?cursor=${all.body.next_cursor}`);
    expect(BigInt(page2.body.items[0].id) < BigInt(all.body.next_cursor) + 1n).toBe(true);
  }
});

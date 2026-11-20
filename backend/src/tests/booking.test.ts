import { as, loginAs, makeEvent, setup, teardown } from "./testUtils";
import { pool } from "../config/database";

beforeAll(setup);
afterAll(teardown);

test("hold -> confirm -> cancel flow, with replace and limits", async () => {
  const org = await loginAs("organizer1@seatlock.dev");
  const { eventId, seats } = await makeEvent(org);
  const s = await loginAs("student5@seatlock.dev");

  const h1 = await as(s).post(`/api/events/${eventId}/hold`, { seat_ids: [seats[0].id] });
  expect(h1.status).toBe(201);
  // new hold replaces the old one
  const h2 = await as(s).post(`/api/events/${eventId}/hold`, { seat_ids: [seats[1].id, seats[2].id] });
  expect(h2.status).toBe(201);
  const first = await pool.query(`SELECT status FROM seats WHERE id=$1`, [seats[0].id]);
  expect(first.rows[0].status).toBe("AVAILABLE");
  // more than 4 seats rejected
  const tooMany = await as(s).post(`/api/events/${eventId}/hold`, { seat_ids: seats.slice(0, 5).map(x => x.id) });
  expect(tooMany.status).toBe(400);

  const c1 = await as(s).post(`/api/holds/${h2.body.hold_id}/confirm`);
  expect(c1.status).toBe(200);
  const c2 = await as(s).post(`/api/holds/${h2.body.hold_id}/confirm`); // idempotent
  expect(c2.body.booking_id).toBe(c1.body.booking_id);

  const mine = await as(s).get("/api/bookings/my");
  expect(mine.body[0].seats).toHaveLength(2);

  const cancel = await as(s).post(`/api/bookings/${c1.body.booking_id}/cancel`);
  expect(cancel.status).toBe(200);
  const after = await pool.query(`SELECT status FROM seats WHERE id=$1`, [seats[1].id]);
  expect(after.rows[0].status).toBe("AVAILABLE");
});

test("expired hold cannot be confirmed and its seat is free again", async () => {
  const org = await loginAs("organizer1@seatlock.dev");
  const { eventId, seats } = await makeEvent(org);
  const a = await loginAs("student6@seatlock.dev");
  const b = await loginAs("student7@seatlock.dev");
  const h = await as(a).post(`/api/events/${eventId}/hold`, { seat_ids: [seats[0].id] });
  await pool.query(`UPDATE holds SET expires_at = now() - interval '1 second' WHERE id=$1`, [h.body.hold_id]);
  await pool.query(`UPDATE seats SET held_until = now() - interval '1 second' WHERE id=$1`, [seats[0].id]);

  expect((await as(a).post(`/api/holds/${h.body.hold_id}/confirm`)).status).toBe(409);
  expect((await as(b).post(`/api/events/${eventId}/hold`, { seat_ids: [seats[0].id] })).status).toBe(201);
});

test("optimistic locking: stale version gets 409", async () => {
  const org = await loginAs("organizer1@seatlock.dev");
  const { eventId } = await makeEvent(org);
  const ok = await as(org).patch(`/api/events/${eventId}`, { version: 1, title: "Renamed" });
  expect(ok.status).toBe(200);
  const stale = await as(org).patch(`/api/events/${eventId}`, { version: 1, title: "Again" });
  expect(stale.status).toBe(409);
});

test("organizer cannot block a booked seat", async () => {
  const org = await loginAs("organizer1@seatlock.dev");
  const { eventId, seats } = await makeEvent(org);
  const s = await loginAs("student8@seatlock.dev");
  const h = await as(s).post(`/api/events/${eventId}/hold`, { seat_ids: [seats[0].id] });
  await as(s).post(`/api/holds/${h.body.hold_id}/confirm`);
  const res = await as(org).post(`/api/organizer/events/${eventId}/seats/block`, { seat_ids: [seats[0].id], blocked: true });
  expect(res.status).toBe(409);
  const free = await as(org).post(`/api/organizer/events/${eventId}/seats/block`, { seat_ids: [seats[1].id], blocked: true });
  expect(free.status).toBe(200);
});

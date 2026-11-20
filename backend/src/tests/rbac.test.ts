import { api, as, loginAs, makeEvent, setup, teardown } from "./testUtils";
import { pool } from "../config/database";
import { auditShard } from "../utils/auditShard";

beforeAll(setup);
afterAll(teardown);

test("no login -> 401", async () => {
  expect((await api().get("/api/events")).status).toBe(401);
});

test("student calling an organizer route -> 403 + ACCESS_DENIED audit", async () => {
  const org = await loginAs("organizer1@seatlock.dev");
  const { eventId } = await makeEvent(org);
  const s = await loginAs("student9@seatlock.dev");
  const res = await as(s).get(`/api/organizer/events/${eventId}/bookings`);
  expect(res.status).toBe(403);
  const shard = auditShard(eventId);
  const log = await pool.query(`SELECT * FROM audit_logs_${shard} WHERE event_id=$1 AND action='ACCESS_DENIED'`, [eventId]);
  expect(log.rowCount).toBeGreaterThan(0);
});

test("organizer cannot touch another organizer's event (service-level check)", async () => {
  const o1 = await loginAs("organizer1@seatlock.dev");
  const o2 = await loginAs("organizer2@seatlock.dev");
  const { eventId, seats } = await makeEvent(o1);
  expect((await as(o2).get(`/api/events/${eventId}/seats`)).status).toBe(403);
  expect((await as(o2).patch(`/api/events/${eventId}`, { version: 1, title: "Hacked" })).status).toBe(403);
  expect((await as(o2).post(`/api/organizer/events/${eventId}/seats/block`, { seat_ids: [seats[0].id], blocked: true })).status).toBe(403);
});

test("student cannot confirm or cancel someone else's hold/booking", async () => {
  const org = await loginAs("organizer1@seatlock.dev");
  const { eventId, seats } = await makeEvent(org);
  const a = await loginAs("student10@seatlock.dev");
  const b = await loginAs("student11@seatlock.dev");
  const h = await as(a).post(`/api/events/${eventId}/hold`, { seat_ids: [seats[0].id] });
  expect((await as(b).post(`/api/holds/${h.body.hold_id}/confirm`)).status).toBe(403);
});

test("missing CSRF header on a write -> 403", async () => {
  const s = await loginAs("student12@seatlock.dev");
  const res = await api().post("/api/bookings/00000000-0000-0000-0000-000000000000/cancel").set("Cookie", s.cookies);
  expect(res.status).toBe(403);
});

test("student cannot read audit logs, admin can", async () => {
  const s = await loginAs("student1@seatlock.dev");
  const admin = await loginAs("admin@seatlock.dev", "admin123");
  expect((await as(s).get("/api/admin/audit-logs")).status).toBe(403);
  expect((await as(admin).get("/api/admin/audit-logs")).status).toBe(200);
});

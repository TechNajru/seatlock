import { as, loginAs, makeEvent, setup, teardown } from "./testUtils";
import { pool } from "../config/database";

beforeAll(setup);
afterAll(teardown);

test("10 students race for the SAME seat: exactly one wins", async () => {
  const org = await loginAs("organizer1@seatlock.dev");
  const { eventId, seats } = await makeEvent(org);
  const students = await Promise.all(Array.from({ length: 10 }, (_, i) => loginAs(`student${i + 1}@seatlock.dev`)));

  const results = await Promise.all(
    students.map(s => as(s).post(`/api/events/${eventId}/hold`, { seat_ids: [seats[0].id] })));
  const codes = results.map(r => r.status);

  expect(codes.filter(c => c === 201)).toHaveLength(1);
  expect(codes.filter(c => c === 409)).toHaveLength(9);
  const held = await pool.query(`SELECT COUNT(*)::int n FROM holds WHERE event_id=$1 AND status='ACTIVE'`, [eventId]);
  expect(held.rows[0].n).toBe(1);
});

test("multi-seat hold is all-or-nothing", async () => {
  const org = await loginAs("organizer1@seatlock.dev");
  const { eventId, seats } = await makeEvent(org);
  const [a, b] = await Promise.all([loginAs("student1@seatlock.dev"), loginAs("student2@seatlock.dev")]);

  expect((await as(a).post(`/api/events/${eventId}/hold`, { seat_ids: [seats[0].id] })).status).toBe(201);
  const res = await as(b).post(`/api/events/${eventId}/hold`, { seat_ids: [seats[0].id, seats[1].id] });
  expect(res.status).toBe(409);
  expect(res.body.unavailable[0].label).toBe(seats[0].label);
  // seat 2 must NOT be held by student 2
  const s2 = await pool.query(`SELECT status FROM seats WHERE id=$1`, [seats[1].id]);
  expect(s2.rows[0].status).toBe("AVAILABLE");
});

test("crossing seat sets (A,B) and (B,A) never deadlock", async () => {
  const org = await loginAs("organizer1@seatlock.dev");
  const { eventId, seats } = await makeEvent(org);
  const [a, b] = await Promise.all([loginAs("student3@seatlock.dev"), loginAs("student4@seatlock.dev")]);
  const [ra, rb] = await Promise.all([
    as(a).post(`/api/events/${eventId}/hold`, { seat_ids: [seats[0].id, seats[1].id] }),
    as(b).post(`/api/events/${eventId}/hold`, { seat_ids: [seats[1].id, seats[0].id] }),
  ]);
  expect([ra.status, rb.status].sort()).toEqual([201, 409]);
});

import request from "supertest";
import { app } from "../app";
import { pool } from "../config/database";
import { migrateAndSeed } from "../db/migrate";

export const api = () => request(app);

export async function setup() { await migrateAndSeed(); }
export async function teardown() { await pool.end(); }

export interface Session { cookies: string[]; csrf: string; id: string; }

export async function loginAs(email: string, password = "password123"): Promise<Session> {
  const res = await api().post("/api/auth/login").send({ email, password });
  if (res.status !== 200) throw new Error(`login failed for ${email}: ${res.status}`);
  const cookies = (res.headers["set-cookie"] as unknown as string[]).map(c => c.split(";")[0]);
  return { cookies, csrf: res.body.csrf_token, id: res.body.user.id };
}

/** Helper that sends a request as a logged-in session (cookie + CSRF header). */
export const as = (s: Session) => ({
  get: (url: string) => api().get(url).set("Cookie", s.cookies),
  post: (url: string, body: object = {}) => api().post(url).set("Cookie", s.cookies).set("x-csrf-token", s.csrf).send(body),
  patch: (url: string, body: object = {}) => api().patch(url).set("Cookie", s.cookies).set("x-csrf-token", s.csrf).send(body),
});

/** Creates a fresh published event (3 rows x 5 seats) owned by organizer1. */
export async function makeEvent(org: Session, days = 5) {
  const res = await as(org).post("/api/events", {
    title: "Test event " + Date.now(), start_time: new Date(Date.now() + days * 86400000).toISOString(),
    status: "PUBLISHED", rows: 3, cols: 5,
  });
  const eventId = res.body.id as string;
  const seats = (await as(org).get(`/api/events/${eventId}/seats`)).body.seats as { id: string; label: string }[];
  return { eventId, seats };
}

import { api, as, loginAs, setup, teardown } from "./testUtils";

beforeAll(setup);
afterAll(teardown);

test("login works and /me returns the user", async () => {
  const s = await loginAs("student1@seatlock.dev");
  const me = await as(s).get("/api/auth/me");
  expect(me.body.user.role).toBe("STUDENT");
});
test("wrong password -> 401", async () => {
  const res = await api().post("/api/auth/login").send({ email: "student1@seatlock.dev", password: "nope" });
  expect(res.status).toBe(401);
});
test("auth cookie is HttpOnly", async () => {
  const res = await api().post("/api/auth/login").send({ email: "student1@seatlock.dev", password: "password123" });
  const token = (res.headers["set-cookie"] as unknown as string[]).find(c => c.startsWith("seatlock_token"))!;
  expect(token).toMatch(/HttpOnly/i);
});

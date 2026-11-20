/**
 * Demo load test: N students try to hold the SAME seat at the same instant.
 * Run:  npm run loadtest        (API must be running on BASE_URL)
 */
const BASE = process.env.BASE_URL || "http://localhost:4000";
const N = Number(process.env.STUDENTS || 12);

type Sess = { cookie: string; csrf: string };

async function login(email: string, password = "password123"): Promise<Sess> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`login failed: ${email}`);
  const cookie = (res.headers.getSetCookie() as string[]).map(c => c.split(";")[0]).join("; ");
  return { cookie, csrf: (await res.json()).csrf_token };
}
const call = (s: Sess, method: string, path: string, body?: object) =>
  fetch(`${BASE}${path}`, { method, headers: { "content-type": "application/json", cookie: s.cookie, "x-csrf-token": s.csrf },
    body: body ? JSON.stringify(body) : undefined });

(async () => {
  const org = await login("organizer1@seatlock.dev");
  const ev = await (await call(org, "POST", "/api/events", {
    title: `Load test ${new Date().toISOString()}`, status: "PUBLISHED", rows: 2, cols: 5,
    start_time: new Date(Date.now() + 3 * 86400000).toISOString(),
  })).json();
  const map = await (await call(org, "GET", `/api/events/${ev.id}/seats`)).json();
  const seat = map.seats[0];
  console.log(`\nEvent: ${ev.id}\nContested seat: ${seat.label}\nStudents racing: ${N}\n`);

  const students = await Promise.all(Array.from({ length: N }, (_, i) => login(`student${i + 1}@seatlock.dev`)));
  const t0 = Date.now();
  const results = await Promise.all(students.map(async (s, i) => {
    const r = await call(s, "POST", `/api/events/${ev.id}/hold`, { seat_ids: [seat.id] });
    return { student: i + 1, status: r.status };
  }));
  const ms = Date.now() - t0;

  const wins = results.filter(r => r.status === 201);
  const conflicts = results.filter(r => r.status === 409);
  const busy = results.filter(r => r.status === 503);
  results.forEach(r => console.log(`student${r.student}: HTTP ${r.status} ${r.status === 201 ? "<-- WON" : ""}`));
  console.log(`\n201 (won): ${wins.length} | 409 (conflict): ${conflicts.length} | 503 (busy): ${busy.length} | ${ms} ms`);

  const final = await (await call(org, "GET", `/api/events/${ev.id}/seats`)).json();
  const held = final.seats.filter((s: any) => s.status === "HELD");
  console.log(`Seats in HELD state afterwards: ${held.length}`);

  if (wins.length === 1 && held.length === 1) { console.log("\nPASS: exactly one winner.\n"); process.exit(0); }
  console.log("\nFAIL: expected exactly one winner.\n"); process.exit(1);
})();

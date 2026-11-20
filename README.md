# SeatLock

Secure, server-rendered seat booking for a college fest. One seat can be held by only one student, roles are enforced on the server, and every important action is written to four sharded audit tables.

**Stack:** Next.js 14 (SSR) · Express + TypeScript · PostgreSQL · Zod · Docker Compose

## Run it

```bash
docker compose up --build
```
- App: http://localhost:3000
- API: http://localhost:4000

The API creates the tables and demo data automatically on first start.

**Without Docker** (needs a local PostgreSQL):
```bash
# terminal 1
cd backend && cp .env.example .env && npm install && npm run dev
# terminal 2
cd frontend && cp .env.local.example .env.local && npm install && npm run dev
```

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@seatlock.dev | admin123 |
| Organizer | organizer1@seatlock.dev / organizer2@seatlock.dev | password123 |
| Student | student1@seatlock.dev … student12@seatlock.dev | password123 |

## Tests

```bash
cd backend
DATABASE_URL=postgres://seatlock:seatlock@localhost:5432/seatlock npm test   # 20 tests, real database
npm run loadtest                                                            # 12 students race for one seat (API must be running)
```

## Locking strategy (and why)

`holdSeats` runs in **one ACID transaction** and uses **pessimistic row locks**:

1. `SET LOCAL lock_timeout = '2s'`, so waiting too long returns **HTTP 503** instead of hanging.
2. `SELECT ... ORDER BY id FOR UPDATE` locks the requested seats **in sorted order**. A stable order means two students asking for (A,B) and (B,A) can never deadlock.
3. While holding the locks it checks the event is open, every seat is free (expired holds count as free), and the 4-seat limit.
4. All-or-nothing: if any seat is unavailable, nothing is held and the response lists the taken seats (**HTTP 409**).
5. Old hold is replaced, new 5-minute hold is created, seats are marked HELD, and the audit row is written **in the same transaction**.

**Why pessimistic locking?** Under a rush for the same seat, the second request simply waits a few milliseconds, then sees the new state and fails cleanly. Optimistic retries would just burn CPU and make users see random failures.

**Safety nets in the schema:** `one_booking_per_seat` (unique partial index on confirmed booking seats) and `one_active_hold` (one active hold per student per event). A unique violation is turned into HTTP 409.

**Lock order everywhere:** seats → holds → bookings. Confirm and cancel follow the same order.

**Expiry:** seat maps and checks treat `held_until < now()` as available, so correctness never depends on a cron job. A sweeper runs every 10 s only to tidy data and write `HOLD_EXPIRED`.

**Event edits** use optimistic locking: `UPDATE ... WHERE version = <seen>`. A stale version returns 409.

**Idempotent confirm (bonus):** confirming the same hold twice returns the same booking.

## Audit sharding

- Tables `audit_logs_0 … audit_logs_3`.
- Shard = `FNV-1a(event_id) % 4`; for actions with no event (login) it uses `actor_id`.
- IDs come from one shared Postgres sequence, so they are **globally unique and time-ordered**.
- Event filter → **one shard** is read. No filter → all four are read, merged by ID, latest 50 returned with a cursor (`id < cursor`). The audit page shows which shards were read.
- Booking audit rows are written in the booking transaction. Rejections (rolled back) are written right after.
- Every 403 is turned into an `ACCESS_DENIED` record by the error handler.

**Moving from 4 to 8 shards:** keep the same hash and change `% 4` to `% 8`. Rows for events whose shard changes (hash mod 8 ≠ hash mod 4) are copied to the new table, then deleted from the old one. Because IDs are global, merged reads stay correct during the move.

## Security (RBAC)

- Route middleware (`authenticate`, `authorize`) **and** checks inside services (`requireRole`, ownership checks).
- Organizers can touch only their own events; students only their own holds/bookings.
- Login sets an **HttpOnly JWT cookie**; a CSRF double-submit token protects every write; Helmet; Zod validation on all inputs; parameterized SQL only.

## Project layout

```
backend/src  config · middleware · routes · services · repositories · validators · utils · types · tests · db
frontend/src app (pages) · components · hooks · lib · types · utils
```
Routes are thin and call services. Services own the SQL for transactions; user and audit SQL lives in repositories.

## 8-minute demo script

1. Log in as **student1** → open *Neon Nights* → select seats → **Hold** → watch the timer → **Confirm** → *My bookings*.
2. Still as student, open `/organizer/dashboard` → **403** page.
3. Terminal: `npm run loadtest` → one 201, eleven 409.
4. Log in as **admin** → *Audit logs* → filter by event → "Shards read: audit_logs_N" (one shard) → clear filter (all four).
5. Explain: row locks, sorted order, RBAC in two layers, hash sharding.

## Notes

- The official starter kit (schema, seed, load-test) was not available while building. `backend/src/db/schema.sql` and the seed in `backend/src/db/migrate.ts` replace it. To use the official schema, adjust the SQL in `services/` to its column names.
- Waitlist and SERIALIZABLE retries are not implemented. Live seat-map refresh (4 s polling), organizer seat blocking and idempotent confirm are.

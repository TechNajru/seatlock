CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('ADMIN','ORGANIZER','STUDENT')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL REFERENCES users(id),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  venue text NOT NULL DEFAULT '',
  start_time timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PUBLISHED')),
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id),
  user_id uuid NOT NULL REFERENCES users(id),
  status text NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','REPLACED','CONFIRMED','EXPIRED')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- safety net: one active hold per student per event
CREATE UNIQUE INDEX IF NOT EXISTS one_active_hold
  ON holds (user_id, event_id) WHERE status = 'ACTIVE';

CREATE TABLE IF NOT EXISTS seats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id),
  label text NOT NULL,
  row_label text NOT NULL,
  seat_number integer NOT NULL,
  status text NOT NULL DEFAULT 'AVAILABLE'
    CHECK (status IN ('AVAILABLE','HELD','BOOKED','BLOCKED')),
  hold_id uuid REFERENCES holds(id),
  held_until timestamptz,
  UNIQUE (event_id, label)
);
CREATE INDEX IF NOT EXISTS seats_event_idx ON seats (event_id);
CREATE INDEX IF NOT EXISTS seats_hold_idx ON seats (hold_id);

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id),
  user_id uuid NOT NULL REFERENCES users(id),
  hold_id uuid UNIQUE REFERENCES holds(id),
  status text NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED','CANCELLED')),
  checked_in_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz
);
CREATE INDEX IF NOT EXISTS bookings_user_idx ON bookings (user_id, event_id);

CREATE TABLE IF NOT EXISTS booking_seats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id),
  seat_id uuid NOT NULL REFERENCES seats(id),
  status text NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED','CANCELLED'))
);
-- safety net: a seat can be in only ONE confirmed booking
CREATE UNIQUE INDEX IF NOT EXISTS one_booking_per_seat
  ON booking_seats (seat_id) WHERE status = 'CONFIRMED';

-- one shared sequence => globally unique, time-ordered audit IDs across all shards
CREATE SEQUENCE IF NOT EXISTS audit_id_seq;

CREATE TABLE IF NOT EXISTS audit_logs_0 (
  id bigint PRIMARY KEY DEFAULT nextval('audit_id_seq'),
  actor_id uuid, event_id uuid, action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS audit_logs_1 (
  id bigint PRIMARY KEY DEFAULT nextval('audit_id_seq'),
  actor_id uuid, event_id uuid, action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS audit_logs_2 (
  id bigint PRIMARY KEY DEFAULT nextval('audit_id_seq'),
  actor_id uuid, event_id uuid, action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS audit_logs_3 (
  id bigint PRIMARY KEY DEFAULT nextval('audit_id_seq'),
  actor_id uuid, event_id uuid, action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now());

CREATE INDEX IF NOT EXISTS audit_0_event_idx ON audit_logs_0 (event_id, id DESC);
CREATE INDEX IF NOT EXISTS audit_1_event_idx ON audit_logs_1 (event_id, id DESC);
CREATE INDEX IF NOT EXISTS audit_2_event_idx ON audit_logs_2 (event_id, id DESC);
CREATE INDEX IF NOT EXISTS audit_3_event_idx ON audit_logs_3 (event_id, id DESC);

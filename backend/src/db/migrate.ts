import fs from "fs";
import path from "path";
import { pool } from "../config/database";
import { hashPassword } from "../utils/password";

/** Creates tables (idempotent) and seeds demo data when the DB is empty. */
export async function migrateAndSeed() {
  await pool.query(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM users`);
  if (rows[0].n > 0) return;

  const pw = await hashPassword("password123");
  const adminPw = await hashPassword("admin123");
  const ins = async (email: string, name: string, role: string, hash: string) =>
    (await pool.query(`INSERT INTO users (email,name,role,password_hash) VALUES ($1,$2,$3,$4) RETURNING id`, [email, name, role, hash])).rows[0].id;

  await ins("admin@seatlock.dev", "Alex Admin", "ADMIN", adminPw);
  const org1 = await ins("organizer1@seatlock.dev", "Olivia Organizer", "ORGANIZER", pw);
  const org2 = await ins("organizer2@seatlock.dev", "Omar Organizer", "ORGANIZER", pw);
  for (let i = 1; i <= 12; i++) await ins(`student${i}@seatlock.dev`, `Student ${i}`, "STUDENT", pw);

  const mkEvent = async (org: string, title: string, venue: string, days: number, status: string, rowsN: number, cols: number) => {
    const ev = (await pool.query(
      `INSERT INTO events (organizer_id,title,description,venue,start_time,status)
       VALUES ($1,$2,$3,$4, now() + ($5 || ' days')::interval, $6) RETURNING id`,
      [org, title, `${title} — the headline show of the college fest.`, venue, String(days), status])).rows[0];
    await pool.query(
      `INSERT INTO seats (event_id,label,row_label,seat_number)
       SELECT $1, chr(64+r)||c, chr(64+r), c FROM generate_series(1,$2) r, generate_series(1,$3) c`, [ev.id, rowsN, cols]);
  };
  await mkEvent(org1, "Neon Nights — Headline Concert", "Main Auditorium", 7, "PUBLISHED", 6, 10);
  await mkEvent(org1, "Stand-up Comedy Evening", "Open Air Theatre", 10, "PUBLISHED", 4, 10);
  await mkEvent(org2, "Battle of the Bands", "Amphitheatre", 14, "PUBLISHED", 5, 10);
  await mkEvent(org2, "Secret Guest Night (draft)", "Sports Hall", 20, "DRAFT", 3, 10);
}

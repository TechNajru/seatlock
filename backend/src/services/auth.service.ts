import jwt from "jsonwebtoken";
import { pool } from "../config/database";
import { env } from "../config/env";
import { HttpError } from "../utils/httpError";
import { verifyPassword } from "../utils/password";
import { findUserByEmail } from "../repositories/user.repository";
import { writeAudit } from "./audit.service";

export async function login(email: string, password: string) {
  const u = await findUserByEmail(pool, email);
  const ok = u && (await verifyPassword(password, u.password_hash));
  if (!ok) {
    await writeAudit(pool, { actorId: u?.id, action: "LOGIN_FAILED", shardKey: email.toLowerCase(), details: { email } });
    throw new HttpError(401, "Wrong email or password.");
  }
  await writeAudit(pool, { actorId: u.id, action: "LOGIN" });
  const token = jwt.sign({ sub: u.id }, env.jwtSecret, { expiresIn: "8h" });
  return { token, user: { id: u.id, email: u.email, name: u.name, role: u.role } };
}

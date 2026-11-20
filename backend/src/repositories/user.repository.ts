import { Db } from "../config/database";

export const findUserByEmail = async (db: Db, email: string) =>
  (await db.query(`SELECT * FROM users WHERE lower(email)=lower($1)`, [email])).rows[0];

export const findUserById = async (db: Db, id: string) =>
  (await db.query(`SELECT id,email,name,role FROM users WHERE id=$1`, [id])).rows[0];

export const listUsers = async (db: Db) =>
  (await db.query(`SELECT id,email,name,role,created_at FROM users ORDER BY role,name`)).rows;

export const updateUserRole = async (db: Db, id: string, role: string) =>
  (await db.query(`UPDATE users SET role=$2 WHERE id=$1 RETURNING id,email,name,role`, [id, role])).rows[0];

import { pool } from "../config/database";
import { AuthUser } from "../types/user.types";
import { HttpError } from "../utils/httpError";
import { requireRole } from "../utils/permissions";
import { listUsers as repoList, updateUserRole } from "../repositories/user.repository";

export async function listUsers(user: AuthUser) {
  requireRole(user, "ADMIN");
  return repoList(pool);
}

export async function changeUserRole(user: AuthUser, userId: string, role: string) {
  requireRole(user, "ADMIN");
  if (userId === user.id) throw new HttpError(400, "You cannot change your own role.");
  const u = await updateUserRole(pool, userId, role);
  if (!u) throw new HttpError(404, "User not found.");
  return u;
}

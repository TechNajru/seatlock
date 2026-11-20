import { HttpError } from "./httpError";
import { AuthUser, Role } from "../types/user.types";

/** Used inside services (second layer of RBAC, after route middleware). */
export function requireRole(user: AuthUser | undefined, ...roles: Role[]): asserts user is AuthUser {
  if (!user || !roles.includes(user.role)) {
    throw new HttpError(403, "You do not have permission to do this.");
  }
}

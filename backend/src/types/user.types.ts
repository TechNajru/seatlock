export type Role = "ADMIN" | "ORGANIZER" | "STUDENT";
export interface AuthUser { id: string; email: string; name: string; role: Role; }
declare global {
  namespace Express { interface Request { user?: AuthUser } }
}

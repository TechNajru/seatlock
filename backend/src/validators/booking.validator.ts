import { z } from "zod";
export const holdSchema = z.object({ seat_ids: z.array(z.string().uuid()).min(1).max(4) });
export const roleSchema = z.object({ role: z.enum(["ADMIN", "ORGANIZER", "STUDENT"]) });
export const uuidParam = z.string().uuid();

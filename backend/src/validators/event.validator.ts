import { z } from "zod";
export const createEventSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(2000).default(""),
  venue: z.string().max(200).default(""),
  start_time: z.string().datetime({ offset: true }),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  rows: z.number().int().min(1).max(26).default(5),
  cols: z.number().int().min(1).max(30).default(10),
});
export const updateEventSchema = z.object({
  version: z.number().int().min(1),
  title: z.string().min(2).max(120).optional(),
  description: z.string().max(2000).optional(),
  venue: z.string().max(200).optional(),
  start_time: z.string().datetime({ offset: true }).optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
});
export const blockSeatsSchema = z.object({
  seat_ids: z.array(z.string().uuid()).min(1).max(50),
  blocked: z.boolean(),
});

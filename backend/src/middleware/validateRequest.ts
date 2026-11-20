import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { HttpError } from "../utils/httpError";

export const validateBody = (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
  const r = schema.safeParse(req.body);
  if (!r.success) {
    return next(new HttpError(400, "Invalid input.", { issues: r.error.issues.map(i => `${i.path.join(".")}: ${i.message}`) }));
  }
  req.body = r.data;
  next();
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Reject malformed IDs in the URL with 400 instead of a database error. */
export const uuidParams = (...names: string[]) => (req: Request, _res: Response, next: NextFunction) => {
  for (const n of names) {
    if (!UUID_RE.test(String(req.params[n]))) return next(new HttpError(400, `Invalid ${n}.`));
  }
  next();
};

import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import { CSRF_COOKIE } from "../config/session";
import { HttpError } from "../utils/httpError";

export const newCsrfToken = () => crypto.randomBytes(24).toString("hex");

/** Double-submit cookie: header must equal the csrf cookie on every state-changing request. */
export function csrfProtection(req: Request, _res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  if (req.path === "/api/auth/login") return next(); // no session yet
  const header = req.get("x-csrf-token");
  const cookie = req.cookies?.[CSRF_COOKIE];
  if (!header || !cookie || header !== cookie) return next(new HttpError(403, "Invalid CSRF token."));
  next();
}

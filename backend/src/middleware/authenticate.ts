import jwt from "jsonwebtoken";
import { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { pool } from "../config/database";
import { TOKEN_COOKIE } from "../config/session";
import { HttpError } from "../utils/httpError";
import { findUserById } from "../repositories/user.repository";

/** Reads the HttpOnly cookie, verifies the JWT, loads the user fresh from the DB. */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[TOKEN_COOKIE];
    if (!token) throw new HttpError(401, "Please log in.");
    let payload: any;
    try { payload = jwt.verify(token, env.jwtSecret); } catch { throw new HttpError(401, "Session expired. Please log in."); }
    const user = await findUserById(pool, payload.sub);
    if (!user) throw new HttpError(401, "Please log in.");
    req.user = user;
    next();
  } catch (e) { next(e); }
}

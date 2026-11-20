import { CookieOptions } from "express";
import { env } from "./env";

export const TOKEN_COOKIE = "seatlock_token";
export const CSRF_COOKIE = "csrf_token";

export const tokenCookieOptions: CookieOptions = {
  httpOnly: true, sameSite: "lax", secure: env.cookieSecure, maxAge: 8 * 60 * 60 * 1000, path: "/",
};
// readable by JS on purpose: the page copies it into the x-csrf-token header
export const csrfCookieOptions: CookieOptions = {
  httpOnly: false, sameSite: "lax", secure: env.cookieSecure, maxAge: 8 * 60 * 60 * 1000, path: "/",
};

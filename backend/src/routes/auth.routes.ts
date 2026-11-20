import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { validateBody } from "../middleware/validateRequest";
import { authenticate } from "../middleware/authenticate";
import { loginSchema } from "../validators/auth.validator";
import { login } from "../services/auth.service";
import { newCsrfToken } from "../middleware/csrf";
import { CSRF_COOKIE, TOKEN_COOKIE, csrfCookieOptions, tokenCookieOptions } from "../config/session";

const r = Router();

r.post("/login", validateBody(loginSchema), asyncHandler(async (req, res) => {
  const { token, user } = await login(req.body.email, req.body.password);
  const csrf = newCsrfToken();
  res.cookie(TOKEN_COOKIE, token, tokenCookieOptions);
  res.cookie(CSRF_COOKIE, csrf, csrfCookieOptions);
  res.json({ user, csrf_token: csrf });
}));

r.post("/logout", (_req, res) => {
  res.clearCookie(TOKEN_COOKIE, { path: "/" });
  res.clearCookie(CSRF_COOKIE, { path: "/" });
  res.json({ ok: true });
});

r.get("/me", authenticate, (req, res) => res.json({ user: req.user }));
export default r;

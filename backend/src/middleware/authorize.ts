import { NextFunction, Request, Response } from "express";
import { Role } from "../types/user.types";
import { HttpError } from "../utils/httpError";

/** Route-level RBAC. A 403 here is logged as ACCESS_DENIED by the error handler. */
export const authorize = (...roles: Role[]) => (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new HttpError(403, "You do not have permission to do this."));
  }
  next();
};

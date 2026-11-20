import { NextFunction, Request, Response } from "express";
import { pool } from "../config/database";
import { HttpError } from "../utils/httpError";
import { insertAudit } from "../repositories/audit.repository";

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export async function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    // RULE: every 403 creates an ACCESS_DENIED audit record.
    if (err.status === 403) {
      const eventId = (err.data?.eventId as string) ?? (req.originalUrl.match(/events\/([0-9a-f-]{36})/i)?.[1]);
      await insertAudit(pool, {
        actorId: req.user?.id,
        eventId: eventId && UUID.test(eventId) ? eventId : null,
        action: "ACCESS_DENIED",
        shardKey: req.ip || "anonymous",
        details: { method: req.method, path: req.originalUrl.split("?")[0], reason: err.message },
      }).catch(e => console.error("audit failed", e));
    }
    const { eventId: _ignore, ...publicData } = err.data ?? {};
    return res.status(err.status).json({ error: err.message, ...publicData });
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong on our side." });
}

import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { uuidParams, validateBody } from "../middleware/validateRequest";
import { roleSchema } from "../validators/booking.validator";
import { changeUserRole, listUsers } from "../services/admin.service";
import { listAuditLogs } from "../services/audit.service";

const r = Router();
r.use(authenticate, authorize("ADMIN"));
r.get("/users", asyncHandler(async (req, res) => res.json(await listUsers(req.user!))));
r.patch("/users/:userId/role", uuidParams("userId"), validateBody(roleSchema),
  asyncHandler(async (req, res) => res.json(await changeUserRole(req.user!, req.params.userId, req.body.role))));
r.get("/audit-logs", asyncHandler(async (req, res) => {
  const q = req.query as Record<string, string | undefined>;
  res.json(await listAuditLogs(req.user!, { eventId: q.event_id || undefined, from: q.from || undefined, to: q.to || undefined, cursor: q.cursor || undefined }));
}));
export default r;

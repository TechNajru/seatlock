import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { uuidParams, validateBody } from "../middleware/validateRequest";
import { createEventSchema, updateEventSchema } from "../validators/event.validator";
import * as events from "../services/event.service";

const r = Router();
r.use(authenticate);
r.get("/", asyncHandler(async (req, res) => res.json(await events.listEvents(req.user!))));
r.get("/:eventId", uuidParams("eventId"), asyncHandler(async (req, res) => res.json(await events.getEvent(req.user!, req.params.eventId))));
r.post("/", authorize("ORGANIZER", "ADMIN"), validateBody(createEventSchema),
  asyncHandler(async (req, res) => res.status(201).json(await events.createEvent(req.user!, req.body))));
r.patch("/:eventId", authorize("ORGANIZER", "ADMIN"), uuidParams("eventId"), validateBody(updateEventSchema),
  asyncHandler(async (req, res) => res.json(await events.updateEvent(req.user!, req.params.eventId, req.body))));
export default r;

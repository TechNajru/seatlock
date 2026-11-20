import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { uuidParams, validateBody } from "../middleware/validateRequest";
import { holdSchema } from "../validators/booking.validator";
import { getSeatMap } from "../services/seat.service";
import { holdSeats } from "../services/booking.service";

const r = Router();
r.use(authenticate);
r.get("/:eventId/seats", uuidParams("eventId"), asyncHandler(async (req, res) => res.json(await getSeatMap(req.user!, req.params.eventId))));
r.post("/:eventId/hold", authorize("STUDENT"), uuidParams("eventId"), validateBody(holdSchema),
  asyncHandler(async (req, res) => res.status(201).json(await holdSeats(req.user!, req.params.eventId, req.body.seat_ids))));
export default r;

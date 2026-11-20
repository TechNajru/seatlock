import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { uuidParams, validateBody } from "../middleware/validateRequest";
import { blockSeatsSchema } from "../validators/event.validator";
import { checkIn, listEventBookings } from "../services/booking.service";
import { blockSeats } from "../services/seat.service";
import { listEvents } from "../services/event.service";

const r = Router();
r.use(authenticate, authorize("ORGANIZER", "ADMIN"));
r.get("/events", asyncHandler(async (req, res) => res.json(await listEvents(req.user!))));
r.get("/events/:eventId/bookings", uuidParams("eventId"), asyncHandler(async (req, res) => res.json(await listEventBookings(req.user!, req.params.eventId))));
r.post("/bookings/:bookingId/check-in", uuidParams("bookingId"), asyncHandler(async (req, res) => res.json(await checkIn(req.user!, req.params.bookingId))));
r.post("/events/:eventId/seats/block", uuidParams("eventId"), validateBody(blockSeatsSchema),
  asyncHandler(async (req, res) => res.json(await blockSeats(req.user!, req.params.eventId, req.body.seat_ids, req.body.blocked))));
export default r;

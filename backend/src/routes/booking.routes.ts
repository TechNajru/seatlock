import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { uuidParams } from "../middleware/validateRequest";
import { cancelBooking, confirmHold, listMyBookings } from "../services/booking.service";

const r = Router();
const student = [authenticate, authorize("STUDENT")]; // per route, so other /api routers are not affected
r.post("/holds/:holdId/confirm", ...student, uuidParams("holdId"), asyncHandler(async (req, res) => res.json(await confirmHold(req.user!, req.params.holdId))));
r.get("/bookings/my", ...student, asyncHandler(async (req, res) => res.json(await listMyBookings(req.user!))));
r.post("/bookings/:bookingId/cancel", ...student, uuidParams("bookingId"), asyncHandler(async (req, res) => res.json(await cancelBooking(req.user!, req.params.bookingId))));
export default r;

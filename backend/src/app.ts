import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { csrfProtection } from "./middleware/csrf";
import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/auth.routes";
import eventRoutes from "./routes/event.routes";
import seatRoutes from "./routes/seat.routes";
import bookingRoutes from "./routes/booking.routes";
import organizerRoutes from "./routes/organizer.routes";
import adminRoutes from "./routes/admin.routes";

export const app = express();
app.use(helmet());
app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.get("/health", (_req, res) => res.json({ ok: true }));
app.use(csrfProtection);

app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/events", seatRoutes);       // /:eventId/seats and /:eventId/hold
app.use("/api", bookingRoutes);           // /holds/:id/confirm, /bookings/...
app.use("/api/organizer", organizerRoutes);
app.use("/api/admin", adminRoutes);

app.use((_req, res) => res.status(404).json({ error: "Not found." }));
app.use(errorHandler);

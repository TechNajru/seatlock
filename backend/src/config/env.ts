export const env = {
  databaseUrl: process.env.DATABASE_URL || "postgres://seatlock:seatlock@localhost:5432/seatlock",
  jwtSecret: process.env.JWT_SECRET || "dev-only-secret-change-me",
  port: Number(process.env.PORT || 4000),
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
  cookieSecure: process.env.COOKIE_SECURE === "true",
};

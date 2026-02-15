import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";

import { env } from "./config/env";
import { prisma } from "./database/prisma";
import { ApiError } from "./utils/api-error";
import { errorMiddleware } from "./middlewares/error.middleware";
import { asyncHandler } from "./utils/async-handler";

export const app = express();

/* -----------------------------------------------------
   GLOBAL MIDDLEWARE
----------------------------------------------------- */

// Security headers
app.use(helmet());

// Compress responses
app.use(compression());

// Parse JSON body
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// CORS configuration
app.use(
  cors({
    origin:true,
    credentials: true,
  })
);

// Logging
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));

/* -----------------------------------------------------
   HEALTH CHECK
   (used by load balancers, uptime monitors, etc.)
----------------------------------------------------- */
app.get("/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "lewa-backend",
    environment: env.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

/* -----------------------------------------------------
   ROUTES
----------------------------------------------------- */

// Example: Students route
app.get(
  "/students",
  asyncHandler(async (_req, res) => {
    const students = await prisma.student.findMany();
    res.json({
      success: true,
      data: students,
    });
  })
);

/* -----------------------------------------------------
   404 HANDLER
   Runs if no route matched above
----------------------------------------------------- */
app.use((_req, _res, next) => {
  next(new ApiError(404, "Route not found"));
});

/* -----------------------------------------------------
   GLOBAL ERROR HANDLER (MUST BE LAST)
----------------------------------------------------- */
app.use(errorMiddleware);
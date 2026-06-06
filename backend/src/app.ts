import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";

import { env, isCorsOriginAllowed } from "./config/env";
import { prisma } from "./database/prisma";
import { ApiError } from "./utils/api-error";
import { errorMiddleware } from "./middlewares/error.middleware";
import routes from "./routes";

export const app = express();

// The deployed service runs behind the hosting provider's reverse proxy.
app.set("trust proxy", 1);

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
    // Browser traffic is limited to configured dashboard origins.
    origin: (origin, callback) => {
      if (isCorsOriginAllowed(origin)) {
        callback(null, true);
        return;
      }

      callback(new ApiError(403, "Origin is not allowed by CORS"));
    },
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

app.get("/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      ok: true,
      database: "ready",
      service: "lewa-backend",
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({
      ok: false,
      database: "unavailable",
      service: "lewa-backend",
      timestamp: new Date().toISOString(),
    });
  }
});

/* -----------------------------------------------------
   ROUTES
----------------------------------------------------- */

app.use("/api", routes);



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

import "./instrument";

import { createServer } from "http";

import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./database/prisma";
import {
  startNewsNotificationScheduler,
  stopNewsNotificationScheduler,
} from "./modules/news/news.scheduler";
import {
  closeRealtime,
  initializeRealtime,
} from "./realtime/socket.service";

const httpServer = createServer(app);
let shuttingDown = false;

// I attach realtime traffic to the same HTTP server so the API and sockets share one deployment target.
initializeRealtime(httpServer);

httpServer.listen(env.port, "0.0.0.0", () => {
  console.log(`Lewa backend listening on port ${env.port}`);
  console.log("Campay base url:", env.campayBaseUrl);

  startNewsNotificationScheduler();

  if (!env.newsNotificationsEnabled) {
    console.log(
      "[news-notifications] push disabled; in-app news notifications will still be saved"
    );
  }
});

httpServer.on("error", (error) => {
  console.error("Backend server error:", error);
  process.exitCode = 1;
});

// I close external connections cleanly when the hosting platform restarts the service.
const shutdown = async (signal: string) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`${signal} received; shutting down Lewa backend`);

  const forceExitTimer = setTimeout(() => {
    console.error("Graceful shutdown timed out");
    process.exit(1);
  }, 10_000);
  forceExitTimer.unref();

  try {
    stopNewsNotificationScheduler();
    await closeRealtime();
    await prisma.$disconnect();
    clearTimeout(forceExitTimer);
    process.exit(0);
  } catch (error) {
    console.error("Backend shutdown failed:", error);
    clearTimeout(forceExitTimer);
    process.exit(1);
  }
};

process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.once("SIGINT", () => {
  void shutdown("SIGINT");
});

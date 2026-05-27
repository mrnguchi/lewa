import { createServer } from "http";

import { app } from "./app";
import { env } from "./config/env";
import { startNewsNotificationScheduler } from "./modules/news/news.scheduler";
import { initializeRealtime } from "./realtime/socket.service";

const httpServer = createServer(app);

// I attach realtime traffic to the same HTTP server so the API and sockets share one deployment target.
initializeRealtime(httpServer);

httpServer.listen(env.port, () => {
  console.log(`Lewa backend running at http://localhost:${env.port}`);
  console.log("Campay base url:", process.env.CAMPAY_BASE_URL);

  startNewsNotificationScheduler();

  if (!env.newsNotificationsEnabled) {
    console.log(
      "[news-notifications] push disabled; in-app news notifications will still be saved"
    );
  }
});

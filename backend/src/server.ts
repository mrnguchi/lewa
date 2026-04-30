import { app } from "./app";
import { env } from "./config/env";
import { startNewsNotificationScheduler } from "./modules/news/news.scheduler";

app.listen(env.port, () => {
  console.log(`Lewa backend running at http://localhost:${env.port}`);
  console.log("Campay base url:", process.env.CAMPAY_BASE_URL);
  startNewsNotificationScheduler();
});

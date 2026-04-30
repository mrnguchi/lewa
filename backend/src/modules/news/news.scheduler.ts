import { env } from "../../config/env";
import { dispatchDueNewsNotifications } from "./news.service";

let schedulerStarted = false;
let schedulerBusy = false;

// Polls for news that has reached its publish time and still needs a push notification.
export function startNewsNotificationScheduler() {
  if (schedulerStarted) {
    return;
  }

  schedulerStarted = true;

  const runTick = async () => {
    if (schedulerBusy) {
      return;
    }

    schedulerBusy = true;

    try {
      const result = await dispatchDueNewsNotifications();

      if (result.sent > 0) {
        console.log(
          `[news-notifications] dispatched ${result.sent} scheduled notification(s)`
        );
      }
    } catch (error) {
      console.error("[news-notifications] scheduler tick failed", error);
    } finally {
      schedulerBusy = false;
    }
  };

  void runTick();

  const timer = setInterval(() => {
    void runTick();
  }, env.newsNotificationPollMs);

  timer.unref?.();
}

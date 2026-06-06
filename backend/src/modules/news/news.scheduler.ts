import { env } from "../../config/env";
import { dispatchDueNewsNotifications } from "./news.service";

let schedulerStarted = false;
let schedulerBusy = false;
let schedulerTimer: NodeJS.Timeout | null = null;

// Polls for news that has reached its publish time and still needs an app notification.
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

  schedulerTimer = setInterval(() => {
    void runTick();
  }, env.newsNotificationPollMs);

  schedulerTimer.unref?.();
}

// I stop the interval cleanly when the hosting service restarts the backend.
export function stopNewsNotificationScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }

  schedulerStarted = false;
}

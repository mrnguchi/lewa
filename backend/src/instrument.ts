import dotenv from "dotenv";
import * as Sentry from "@sentry/node";

dotenv.config();

const sentryEnabled =
  process.env.SENTRY_ENABLED?.trim().toLowerCase() === "true";
const configuredSampleRate = Number(
  process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1"
);
const tracesSampleRate =
  Number.isFinite(configuredSampleRate) &&
  configuredSampleRate >= 0 &&
  configuredSampleRate <= 1
    ? configuredSampleRate
    : 0.1;

// I initialize monitoring before Express so Sentry can instrument the whole request lifecycle.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: sentryEnabled && Boolean(process.env.SENTRY_DSN),
  environment: process.env.NODE_ENV ?? "development",
  sendDefaultPii: false,
  enableLogs: false,
  tracesSampleRate,

  // I remove student, authentication, and payment details before an event leaves the server.
  beforeSend(event) {
    if (event.request) {
      event.request.data = undefined;
      event.request.cookies = undefined;
      event.request.headers = undefined;
      event.request.query_string = undefined;

      if (event.request.url) {
        event.request.url = event.request.url.split("?")[0];
      }
    }

    event.user = event.user?.id ? { id: event.user.id } : undefined;
    return event;
  },

  // Console output may contain operational data, so I do not attach it as breadcrumbs.
  beforeBreadcrumb(breadcrumb) {
    return breadcrumb.category === "console" ? null : breadcrumb;
  },
});

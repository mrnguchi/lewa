import dotenv from "dotenv";

dotenv.config();

const nodeEnv = process.env.NODE_ENV ?? "development";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

const parseCorsOrigins = (value: string) =>
  value
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);

function readBooleanEnv(name: string, defaultValue = false): boolean {
  const value = process.env[name];

  if (value === undefined) {
    return defaultValue;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

const newsNotificationPollMs = Number(process.env.NEWS_NOTIFICATION_POLL_MS ?? 60000);
const corsOrigin = requireEnv("CORS_ORIGIN");
const corsOrigins = corsOrigin === "*" ? [] : parseCorsOrigins(corsOrigin);
const jwtSecret = requireEnv("JWT_SECRET");

if (nodeEnv === "production" && corsOrigin === "*") {
  throw new Error("CORS_ORIGIN must list trusted origins in production");
}

if (nodeEnv === "production" && jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must contain at least 32 characters in production");
}

export const env = {
  nodeEnv,
  port: Number(process.env.PORT ?? 4000),
  newsNotificationsEnabled: readBooleanEnv("NEWS_NOTIFICATIONS_ENABLED"),
  newsNotificationPollMs:
    Number.isFinite(newsNotificationPollMs) && newsNotificationPollMs > 0
      ? newsNotificationPollMs
      : 60000,

  databaseUrl: requireEnv("DATABASE_URL"),
  jwtSecret,
  corsOrigin,
  corsOrigins,
  allowAnyCorsOrigin: corsOrigin === "*",

  campayBaseUrl: requireEnv("CAMPAY_BASE_URL"),
  campayToken: requireEnv("CAMPAY_ACCESS_TOKEN"),
  campayWebhookKey: requireEnv("CAMPAY_WEBHOOK_KEY"),

  cloudinaryCloudName: requireEnv("CLOUDINARY_CLOUD_NAME"),
  cloudinaryApiKey: requireEnv("CLOUDINARY_API_KEY"),
  cloudinaryApiSecret: requireEnv("CLOUDINARY_API_SECRET"),
  cloudinaryUploadPreset: requireEnv("CLOUDINARY_UPLOAD_PRESET"),

  openAiApiKey: process.env.OPENAI_API_KEY,
  openAiModel: process.env.OPENAI_MODEL,
  openAiVectorStoreId: process.env.OPENAI_VECTOR_STORE_ID,
};

// Native apps send no browser origin, while browser requests must match our allowlist.
export const isCorsOriginAllowed = (origin?: string) =>
  !origin ||
  env.allowAnyCorsOrigin ||
  env.corsOrigins.includes(origin.replace(/\/$/, ""));

import dotenv from "dotenv";

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function readBooleanEnv(name: string, defaultValue = false): boolean {
  const value = process.env[name];

  if (value === undefined) {
    return defaultValue;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

const newsNotificationPollMs = Number(process.env.NEWS_NOTIFICATION_POLL_MS ?? 60000);

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  newsNotificationsEnabled: readBooleanEnv("NEWS_NOTIFICATIONS_ENABLED"),
  newsNotificationPollMs:
    Number.isFinite(newsNotificationPollMs) && newsNotificationPollMs > 0
      ? newsNotificationPollMs
      : 60000,

  jwtSecret: process.env.JWT_SECRET!,
  corsOrigin: process.env.CORS_ORIGIN ?? "*",

  campayBaseUrl: process.env.CAMPAY_BASE_URL!,
  campayToken: process.env.CAMPAY_ACCESS_TOKEN!,
  campayWebhookKey: process.env.CAMPAY_WEBHOOK_KEY!,

  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME!,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY!,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET!,
  cloudinaryUploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET!,

  openAiApiKey: process.env.OPENAI_API_KEY,
  openAiModel: process.env.OPENAI_MODEL,
  openAiVectorStoreId: process.env.OPENAI_VECTOR_STORE_ID,
};

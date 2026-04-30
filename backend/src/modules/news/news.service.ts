import { Prisma } from "@prisma/client";
import axios from "axios";
import { prisma } from "../../database/prisma";
import { ApiError } from "../../utils/api-error";
import { CreateNewsInput } from "./news.schema";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

type CreateNewsOptions = {
  authorStudentId?: string;
};

const NEWS_NOTIFICATION_PREVIEW_LIMIT = 260;
const NEWS_NOTIFICATION_BATCH_LIMIT = 25;
const NEWS_NOTIFICATION_CLAIM_TIMEOUT_MS = 15 * 60 * 1000;

const newsPublicSelect = {
  id: true,
  title: true,
  intro: true,
  description: true,
  category: true,
  image_url: true,
  lewa_logo_url: true,
  published_at: true,
  created_at: true,
  updated_at: true,
} as const;

const newsNotificationSelect = {
  ...newsPublicSelect,
  notification_sent_at: true,
  notification_dispatch_started_at: true,
  author_student_id: true,
} as const;

type DueNewsNotificationRecord = Prisma.newsGetPayload<{
  select: typeof newsNotificationSelect;
}>;

/**
 * Builds a readable notification preview from the article description.
 */
function buildNewsNotificationPreview(newsItem: {
  description?: string;
  intro: string;
}) {
  const sourceText = (newsItem.description || newsItem.intro).replace(/\s+/g, " ").trim();

  if (!sourceText) {
    return "Tap to open the latest Lewa News article.";
  }

  if (sourceText.length <= NEWS_NOTIFICATION_PREVIEW_LIMIT) {
    return sourceText;
  }

  return `${sourceText.slice(0, NEWS_NOTIFICATION_PREVIEW_LIMIT - 3).trimEnd()}...`;
}

/**
 * Removes internal notification-tracking fields before returning an article payload publicly.
 */
function toPublicNewsItem<
  T extends {
    notification_sent_at?: Date | null;
    notification_dispatch_started_at?: Date | null;
    author_student_id?: string | null;
  },
>(
  newsItem: T
) {
  const {
    notification_sent_at: _notificationSentAt,
    notification_dispatch_started_at: _notificationDispatchStartedAt,
    author_student_id: _authorStudentId,
    ...publicFields
  } = newsItem;
  return publicFields;
}

/**
 * Returns the latest published news items, newest first.
 */
export const getNews = async (limit?: number) => {
  return prisma.news.findMany({
    select: newsPublicSelect,
    where: {
      published_at: {
        lte: new Date(),
      },
    },
    orderBy: [{ published_at: "desc" }, { created_at: "desc" }],
    take: limit,
  });
};

/**
 * Returns a single published news article by id.
 */
export const getNewsById = async (id: string) => {
  const newsItem = await prisma.news.findFirst({
    select: newsPublicSelect,
    where: {
      id,
      published_at: {
        lte: new Date(),
      },
    },
  });

  if (!newsItem) {
    throw new ApiError(404, "News item not found");
  }

  return newsItem;
};

/**
 * Creates a news article and notifies subscribed students when it is immediately publishable.
 */
export const createNews = async (
  data: CreateNewsInput,
  options: CreateNewsOptions = {}
) => {
  const publishedAt = data.published_at ? new Date(data.published_at) : new Date();

  const newsItem = await prisma.news.create({
    select: newsNotificationSelect,
    data: {
      id: crypto.randomUUID(),
      title: data.title.trim(),
      intro: data.intro.trim(),
      description: data.description.trim(),
      category: data.category,
      image_url: data.image_url,
      lewa_logo_url: data.lewa_logo_url,
      published_at: publishedAt,
      author_student_id: options.authorStudentId,
    },
  });

  if (publishedAt <= new Date()) {
    try {
      await dispatchDueNewsNotifications({
        newsIds: [newsItem.id],
      });
    } catch (error) {
      console.error("Failed to send news push notifications", error);
    }
  }

  return toPublicNewsItem(newsItem);
};

/**
 * Sends Expo push notifications to all opted-in students except the author.
 */
async function notifyStudentsAboutNews(
  newsItem: {
    id: string;
    title: string;
    intro: string;
    description: string;
    image_url: string;
    category: string;
  },
  authorStudentId?: string
) {
  const recipients = await prisma.students.findMany({
    where: {
      is_active: true,
      notifications_enabled: true,
      expo_push_token: {
        not: null,
      },
      ...(authorStudentId
        ? {
            id: {
              not: authorStudentId,
            },
          }
        : {}),
    },
    select: {
      expo_push_token: true,
    },
  });

  const messages = recipients
    .map((recipient) => recipient.expo_push_token)
    .filter((token): token is string => Boolean(token))
    .map((token) => ({
      to: token,
      title: "Lewa News",
      subtitle: newsItem.category,
      body: buildNewsNotificationPreview(newsItem),
      data: {
        type: "news_article",
        newsId: newsItem.id,
        intro: newsItem.intro,
      },
      richContent: {
        image: newsItem.image_url,
      },
      sound: "default",
    }));

  if (!messages.length) {
    return;
  }

  await axios.post(EXPO_PUSH_URL, messages, {
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/**
 * Claims due news rows in the database so multiple backend instances do not send the same article twice.
 */
async function claimDueNewsNotifications(options?: { newsIds?: string[] }) {
  const staleClaimCutoff = new Date(Date.now() - NEWS_NOTIFICATION_CLAIM_TIMEOUT_MS);
  const newsIdFilter =
    options?.newsIds?.length
      ? Prisma.sql`AND "id" IN (${Prisma.join(options.newsIds)})`
      : Prisma.empty;

  return prisma.$queryRaw<DueNewsNotificationRecord[]>(Prisma.sql`
    UPDATE "news"
    SET "notification_dispatch_started_at" = NOW()
    WHERE "id" IN (
      SELECT "id"
      FROM "news"
      WHERE "notification_sent_at" IS NULL
        AND "published_at" <= NOW()
        AND (
          "notification_dispatch_started_at" IS NULL
          OR "notification_dispatch_started_at" <= ${staleClaimCutoff}
        )
        ${newsIdFilter}
      ORDER BY "published_at" ASC, "created_at" ASC
      LIMIT ${NEWS_NOTIFICATION_BATCH_LIMIT}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING
      "id",
      "title",
      "intro",
      "description",
      "category",
      "image_url",
      "lewa_logo_url",
      "published_at",
      "created_at",
      "updated_at",
      "notification_sent_at",
      "notification_dispatch_started_at",
      "author_student_id"
  `);
}

/**
 * Dispatches notifications for published news articles that have not been sent yet.
 */
export async function dispatchDueNewsNotifications(options?: { newsIds?: string[] }) {
  const dueNewsItems = await claimDueNewsNotifications(options);

  let sentCount = 0;

  for (const newsItem of dueNewsItems) {
    try {
      await notifyStudentsAboutNews(newsItem, newsItem.author_student_id ?? undefined);

      await prisma.$executeRaw(
        Prisma.sql`
          UPDATE "news"
          SET
            "notification_sent_at" = NOW(),
            "notification_dispatch_started_at" = NULL
          WHERE "id" = ${newsItem.id}
        `
      );

      sentCount += 1;
    } catch (error) {
      await prisma.$executeRaw(
        Prisma.sql`
          UPDATE "news"
          SET "notification_dispatch_started_at" = NULL
          WHERE "id" = ${newsItem.id}
        `
      );

      console.error(`Failed to dispatch news notification for article ${newsItem.id}`, error);
    }
  }

  return {
    checked: dueNewsItems.length,
    sent: sentCount,
  };
}

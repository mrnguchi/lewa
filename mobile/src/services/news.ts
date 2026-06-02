import { api } from "./api";

export const NEWS_CATEGORIES = [
  "All",
  "Tech",
  "Business",
  "Sports",
  "Events",
  "Announcement",
  "Lost & Found",
] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

export interface NewsArticle {
  id: string;
  title: string;
  intro: string;
  description: string;
  category: Exclude<NewsCategory, "All">;
  image_url: string;
  lewa_logo_url?: string | null;
  published_at: string;
  created_at?: string;
  updated_at?: string;
}

interface NewsListResponse {
  success: boolean;
  data: NewsArticle[];
}

interface NewsItemResponse {
  success: boolean;
  data: NewsArticle;
  message?: string;
}

interface UploadSignatureResponse {
  success: boolean;
  data: {
    cloudName: string;
    apiKey: string;
    uploadPreset: string;
    timestamp: number;
    signature: string;
    publicId: string;
    resourceType: "image";
    uploadUrl: string;
  };
}

export interface CreateNewsArticleInput {
  title: string;
  intro: string;
  description: string;
  category: Exclude<NewsCategory, "All">;
  image_url: string;
  lewa_logo_url?: string;
  published_at?: string;
}

/**
 * Fetches the latest published news articles from the backend.
 */
export async function fetchLatestNewsArticles(
  limit = 10,
  category?: Exclude<NewsCategory, "All">
): Promise<NewsArticle[]> {
  const query = [`limit=${encodeURIComponent(String(limit))}`];

  if (category) {
    query.push(`category=${encodeURIComponent(category)}`);
  }

  const response = await api.get<NewsListResponse>(`/api/news?${query.join("&")}`);
  return response.data.data;
}

/**
 * Fetches a single published news article by id from the backend.
 */
export async function fetchNewsArticleById(newsId: string): Promise<NewsArticle> {
  const response = await api.get<NewsItemResponse>(`/api/news/${newsId}`);
  return response.data.data;
}

/**
 * Creates a new news article in the backend.
 */
export async function createNewsArticle(
  payload: CreateNewsArticleInput
): Promise<NewsArticle> {
  const response = await api.post<NewsItemResponse>("/api/news", payload);
  return response.data.data;
}

/**
 * Uploads a locally selected news poster to Cloudinary using a signed upload.
 */
export async function uploadNewsPoster(
  uri: string,
  fileName?: string | null
): Promise<string> {
  const signatureResponse = await api.post<UploadSignatureResponse>(
    "/api/uploads/news-poster-signature",
    {
      filename: fileName ?? undefined,
    }
  );

  const signature = signatureResponse.data.data;
  const formData = new FormData();
  const fileExtension = getFileExtension(uri, fileName);

  formData.append("file", {
    uri,
    name: fileName ?? `news-poster.${fileExtension}`,
    type: `image/${fileExtension}`,
  } as any);
  formData.append("api_key", signature.apiKey);
  formData.append("timestamp", String(signature.timestamp));
  formData.append("signature", signature.signature);
  formData.append("upload_preset", signature.uploadPreset);
  formData.append("public_id", signature.publicId);

  const uploadResponse = await fetch(signature.uploadUrl, {
    method: "POST",
    body: formData,
  });

  const uploadPayload = await uploadResponse.json();

  if (!uploadResponse.ok || !uploadPayload.secure_url) {
    throw new Error("Poster upload failed");
  }

  return uploadPayload.secure_url as string;
}

/**
 * Formats a published timestamp into the friendly date label used by the news UI.
 */
export function formatNewsPublishedDate(isoDate: string): string {
  const publishedDate = new Date(isoDate);

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(publishedDate);
}

/**
 * Formats a published timestamp into a relative time string for the news UI.
 */
export function formatNewsRelativeTime(isoDate: string): string {
  const publishedDate = new Date(isoDate).getTime();
  const now = Date.now();
  const diffInMinutes = Math.max(1, Math.floor((now - publishedDate) / (1000 * 60)));

  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? "" : "s"} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? "" : "s"} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays === 1 ? "" : "s"} ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 5) {
    return `${diffInWeeks} week${diffInWeeks === 1 ? "" : "s"} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths} month${diffInMonths === 1 ? "" : "s"} ago`;
}

/**
 * Returns whether an article should already be visible to readers.
 */
export function isPublishedNewsArticle(article: NewsArticle): boolean {
  return new Date(article.published_at).getTime() <= Date.now();
}

/**
 * Builds an ISO timestamp from separate date and time inputs.
 */
export function buildPublishedAtIso(date: string, time: string): string {
  const scheduledDate = new Date(`${date}T${time}:00`);

  if (Number.isNaN(scheduledDate.getTime())) {
    throw new Error('Invalid publish schedule');
  }

  return scheduledDate.toISOString();
}

/**
 * Derives a best-effort image extension for poster uploads.
 */
function getFileExtension(uri: string, fileName?: string | null) {
  const candidate = fileName ?? uri.split("?")[0];
  const extension = candidate.split(".").pop()?.toLowerCase();

  if (extension === "png" || extension === "webp") {
    return extension;
  }

  return "jpeg";
}

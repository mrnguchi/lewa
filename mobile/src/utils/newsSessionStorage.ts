import AsyncStorage from "@react-native-async-storage/async-storage";
import { NewsArticle, isPublishedNewsArticle } from "../services/news";

const NEWS_SESSION_CACHE_KEY = "sessionNewsArticles";

/**
 * Clears the session-scoped news cache when a new app launch begins.
 */
export async function clearNewsSessionCache(): Promise<void> {
  await AsyncStorage.removeItem(NEWS_SESSION_CACHE_KEY);
}

/**
 * Reads the currently cached session news articles.
 */
export async function getCachedNewsArticles(): Promise<NewsArticle[]> {
  const cachedValue = await AsyncStorage.getItem(NEWS_SESSION_CACHE_KEY);

  if (!cachedValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(cachedValue) as NewsArticle[];
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
}

/**
 * Replaces the cached session news articles with the newest fetched payload.
 */
export async function cacheNewsArticles(articles: NewsArticle[]): Promise<void> {
  await AsyncStorage.setItem(NEWS_SESSION_CACHE_KEY, JSON.stringify(articles));
}

/**
 * Updates the session cache after a successful publish so the next screen focus is instant.
 */
export async function upsertPublishedArticleInCache(
  article: NewsArticle,
  limit = 10
): Promise<void> {
  if (!isPublishedNewsArticle(article)) {
    return;
  }

  const existingArticles = await getCachedNewsArticles();
  const nextArticles = [article, ...existingArticles.filter((item) => item.id !== article.id)].slice(
    0,
    limit
  );

  await cacheNewsArticles(nextArticles);
}

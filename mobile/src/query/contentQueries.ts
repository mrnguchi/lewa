import { useCallback } from 'react';
import { QueryKey, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';

import { fetchLatestNewsArticles, NewsArticle } from '../services/news';
import { getResources } from '../services/resources';
import { ResourceItem } from '../types/resources';

export const contentQueryKeys = {
  news: ['content', 'news'] as const,
  resources: ['content', 'resources'] as const,
};

const NEWS_STALE_TIME_MS = 3 * 60 * 1000;
const RESOURCES_STALE_TIME_MS = 10 * 60 * 1000;
const CACHE_RETENTION_MS = 24 * 60 * 60 * 1000;

/**
 * Refreshes focused screens only after their cached content becomes stale.
 */
const useRefreshStaleQueryOnFocus = (queryKey: QueryKey, staleTime: number) => {
  const queryClient = useQueryClient();

  useFocusEffect(
    useCallback(() => {
      const state = queryClient.getQueryState(queryKey);

      if (state?.fetchStatus === 'fetching') {
        return;
      }

      const isStale =
        !state?.dataUpdatedAt || Date.now() - state.dataUpdatedAt >= staleTime;

      if (isStale) {
        queryClient
          .refetchQueries({ queryKey, exact: true, type: 'active' })
          .catch(() => undefined);
      }
    }, [queryClient, queryKey, staleTime])
  );
};

/**
 * Shares the persisted Lewa news feed between Home and the full news screen.
 */
export const useLatestNewsQuery = () => {
  useRefreshStaleQueryOnFocus(contentQueryKeys.news, NEWS_STALE_TIME_MS);

  return useQuery<NewsArticle[]>({
    queryKey: contentQueryKeys.news,
    queryFn: () => fetchLatestNewsArticles(10),
    staleTime: NEWS_STALE_TIME_MS,
    gcTime: CACHE_RETENTION_MS,
    meta: { persist: true },
  });
};

/**
 * Shares one persisted resource catalogue between Home and Resources.
 */
export const useResourcesQuery = () => {
  useRefreshStaleQueryOnFocus(contentQueryKeys.resources, RESOURCES_STALE_TIME_MS);

  return useQuery<ResourceItem[]>({
    queryKey: contentQueryKeys.resources,
    queryFn: () => getResources(),
    staleTime: RESOURCES_STALE_TIME_MS,
    gcTime: CACHE_RETENTION_MS,
    meta: { persist: true },
  });
};

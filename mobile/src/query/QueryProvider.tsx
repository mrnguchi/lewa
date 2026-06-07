import React, { ReactNode, useEffect } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  defaultShouldDehydrateQuery,
  focusManager,
  QueryClient,
} from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: CACHE_MAX_AGE_MS,
      retry: 1,
      refetchOnReconnect: true,
    },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'lewa-query-cache',
  throttleTime: 1000,
});

/**
 * Restores selected catalogue queries and refreshes them when the app returns.
 */
export function AppQueryProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      focusManager.setFocused(status === 'active');
    });

    return () => subscription.remove();
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: asyncStoragePersister,
        maxAge: CACHE_MAX_AGE_MS,
        buster: 'lewa-content-v1',
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            query.meta?.persist === true && defaultShouldDehydrateQuery(query),
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}

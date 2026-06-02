import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { io, Socket } from 'socket.io-client';

import { useAuth } from '../hooks/useAuth';
import { API_BASE_URL } from '../services/api';
import { getUnreadChatCount } from '../services/lewaChat';
import { getUnreadNotificationCount } from '../services/notifications';

type SupportConversationUpdate = {
  id?: string;
  student_id?: string;
};

type AppSyncContextValue = {
  chatUnreadCount: number;
  notificationUnreadCount: number;
  lastSupportConversationUpdate: number;
  refreshSync: () => Promise<void>;
  joinSupportConversation: (conversationId: string) => void;
  leaveSupportConversation: (conversationId: string) => void;
};

const AppSyncContext = createContext<AppSyncContextValue>({
  chatUnreadCount: 0,
  notificationUnreadCount: 0,
  lastSupportConversationUpdate: 0,
  refreshSync: async () => {},
  joinSupportConversation: () => {},
  leaveSupportConversation: () => {},
});

const SYNC_FALLBACK_INTERVAL_MS = 60 * 1000;

export const AppSyncProvider = ({ children }: { children: ReactNode }) => {
  const { token, isAuthenticated } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const [lastSupportConversationUpdate, setLastSupportConversationUpdate] = useState(0);

  // I keep this request tiny so the fallback poll stays cheap over time.
  const refreshSync = useCallback(async () => {
    if (!isAuthenticated) {
      setChatUnreadCount(0);
      setNotificationUnreadCount(0);
      return;
    }

    const [nextNotificationCount, nextChatCount] = await Promise.all([
      getUnreadNotificationCount(),
      getUnreadChatCount(),
    ]);

    setNotificationUnreadCount(nextNotificationCount);
    setChatUnreadCount(nextChatCount);
  }, [isAuthenticated]);

  const disconnectSocket = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
  }, []);

  const connectSocket = useCallback(() => {
    if (!token || !isAuthenticated || socketRef.current) {
      return;
    }

    const socket = io(API_BASE_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('notifications:changed', () => {
      getUnreadNotificationCount()
        .then(setNotificationUnreadCount)
        .catch(() => undefined);
    });

    socket.on('support:conversation-updated', (_conversation: SupportConversationUpdate) => {
      setLastSupportConversationUpdate(Date.now());
      getUnreadChatCount()
        .then(setChatUnreadCount)
        .catch(() => undefined);
    });

    socket.on('connect', () => {
      refreshSync().catch(() => undefined);
    });
  }, [disconnectSocket, isAuthenticated, refreshSync, token]);

  useEffect(() => {
    if (!isAuthenticated || !token || appStateRef.current !== 'active') {
      disconnectSocket();
      return;
    }

    connectSocket();

    return disconnectSocket;
  }, [connectSocket, disconnectSocket, isAuthenticated, token]);

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }

    refreshSync().catch(() => undefined);

    const intervalId = setInterval(() => {
      if (appStateRef.current === 'active') {
        refreshSync().catch(() => undefined);
      }
    }, SYNC_FALLBACK_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [isAuthenticated, refreshSync]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      appStateRef.current = nextState;

      if (nextState === 'active') {
        connectSocket();
        refreshSync().catch(() => undefined);
        return;
      }

      disconnectSocket();
    });

    return () => subscription.remove();
  }, [connectSocket, disconnectSocket, refreshSync]);

  const joinSupportConversation = useCallback((conversationId: string) => {
    socketRef.current?.emit('support:join-conversation', conversationId);
  }, []);

  const leaveSupportConversation = useCallback((conversationId: string) => {
    socketRef.current?.emit('support:leave-conversation', conversationId);
  }, []);

  return (
    <AppSyncContext.Provider
      value={{
        chatUnreadCount,
        notificationUnreadCount,
        lastSupportConversationUpdate,
        refreshSync,
        joinSupportConversation,
        leaveSupportConversation,
      }}
    >
      {children}
    </AppSyncContext.Provider>
  );
};

export const useAppSync = () => useContext(AppSyncContext);

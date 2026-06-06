import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { api } from './api';
import { navigationRef } from '../navigation/navigationRef';

type ChatNotificationTarget = {
  type: 'chat_message';
  conversationId: string;
  conversationType: 'school_admin' | 'lewa_ai';
};

type NewsNotificationTarget = {
  type: 'news_article';
  newsId: string;
};

type PaymentNotificationTarget = {
  type: 'payment';
  notificationType: 'payment_success' | 'payment_pending' | 'payment_failed';
  paymentReference?: string;
};

type NotificationTarget =
  | ChatNotificationTarget
  | NewsNotificationTarget
  | PaymentNotificationTarget;

export type AppNotificationType =
  | 'chat_message'
  | 'payment_success'
  | 'payment_pending'
  | 'payment_failed'
  | 'news_article';

export interface AppNotification {
  id: string;
  type: AppNotificationType;
  title: string;
  body: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
  readAt?: string | null;
  createdAt: string;
}

const PENDING_NOTIFICATION_TARGET_KEY = 'pending_notification_target';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Reads the Expo project id required for push token registration.
 */
function getExpoProjectId(): string | null {
  return (
    Constants?.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId ??
    null
  );
}

/**
 * Registers the current device for Expo push notifications and returns its token.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  if (Device.osName === 'Android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#167846',
    });
  }

  const existingPermissions = await Notifications.getPermissionsAsync();
  let finalStatus = existingPermissions.status;

  if (finalStatus !== 'granted') {
    const requestedPermissions = await Notifications.requestPermissionsAsync();
    finalStatus = requestedPermissions.status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId = getExpoProjectId();

  if (!projectId) {
    console.warn('Push notifications are not configured because no Expo projectId was found.');
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}

/**
 * Saves the latest Expo push token for the authenticated student.
 */
export async function syncStudentPushToken(studentId: string): Promise<void> {
  const expoPushToken = await registerForPushNotificationsAsync();

  if (!expoPushToken) {
    return;
  }

  await api.put(`/api/students/${studentId}/push-token`, {
    expo_push_token: expoPushToken,
  });
}

// Extracts a supported app navigation target from a notification payload.
export function getNotificationTarget(data: unknown): NotificationTarget | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const payload = data as Record<string, unknown>;

  if (payload.type === 'chat_message') {
    if (
      typeof payload.conversationId !== 'string' ||
      typeof payload.conversationType !== 'string'
    ) {
      return null;
    }

    if (payload.conversationType !== 'school_admin' && payload.conversationType !== 'lewa_ai') {
      return null;
    }

    return {
      type: 'chat_message',
      conversationId: payload.conversationId,
      conversationType: payload.conversationType,
    };
  }

  if (payload.type === 'news_article' && typeof payload.newsId === 'string') {
    return {
      type: 'news_article',
      newsId: payload.newsId,
    };
  }

  if (
    payload.type === 'payment_success' ||
    payload.type === 'payment_pending' ||
    payload.type === 'payment_failed'
  ) {
    return {
      type: 'payment',
      notificationType: payload.type,
      paymentReference:
        typeof payload.paymentReference === 'string'
          ? payload.paymentReference
          : undefined,
    };
  }

  return null;
}

// Persists a pending notification target for cases where navigation or auth is not ready yet.
export async function savePendingNotificationTarget(target: NotificationTarget): Promise<void> {
  await AsyncStorage.setItem(PENDING_NOTIFICATION_TARGET_KEY, JSON.stringify(target));
}

// Reads and clears the next pending notification target.
export async function consumePendingNotificationTarget(): Promise<NotificationTarget | null> {
  const rawValue = await AsyncStorage.getItem(PENDING_NOTIFICATION_TARGET_KEY);

  if (!rawValue) {
    return null;
  }

  await AsyncStorage.removeItem(PENDING_NOTIFICATION_TARGET_KEY);

  try {
    return getNotificationTarget(JSON.parse(rawValue));
  } catch (error) {
    return null;
  }
}

// Navigates directly into the app flow represented by a notification payload.
export function navigateToNotificationTarget(target: NotificationTarget): boolean {
  if (!navigationRef.isReady()) {
    return false;
  }

  if (target.type === 'news_article') {
    navigationRef.navigate('NewsDetails', {
      newsId: target.newsId,
    });
    return true;
  }

  if (target.type === 'payment') {
    if (target.notificationType === 'payment_pending') {
      if (!target.paymentReference) {
        return false;
      }

      navigationRef.navigate('PaymentProcessing', {
        reference: target.paymentReference,
      });
      return true;
    }

    navigationRef.navigate('Receipts', {
      notificationType: target.notificationType,
    });
    return true;
  }

  if (target.conversationType === 'lewa_ai') {
    navigationRef.navigate('LewaAIChat', {
      conversationId: target.conversationId,
    });
    return true;
  }

  navigationRef.navigate('SchoolAdminChat', {
    conversationId: target.conversationId,
  });
  return true;
}

// Routes a notification response immediately when possible, otherwise stores it for later.
export async function handleNotificationResponseRouting(params: {
  data: unknown;
  isAuthenticated: boolean;
}) {
  const target = getNotificationTarget(params.data);

  if (!target) {
    return;
  }

  if (!params.isAuthenticated || !navigateToNotificationTarget(target)) {
    await savePendingNotificationTarget(target);
  }
}

// Checks the most recent notification response and routes it after app startup.
export async function processLastNotificationResponse(isAuthenticated: boolean) {
  const lastResponse = await Notifications.getLastNotificationResponseAsync();

  if (lastResponse) {
    await handleNotificationResponseRouting({
      data: lastResponse.notification.request.content.data,
      isAuthenticated,
    });
  }
}

export async function getStudentNotifications(limit = 20): Promise<AppNotification[]> {
  const response = await api.get<{ success: boolean; data: AppNotification[] }>(
    '/api/notifications/my',
    {
      params: { limit },
    }
  );

  return response.data.data;
}

export async function getUnreadNotificationCount(): Promise<number> {
  const response = await api.get<{ success: boolean; data: { count: number } }>(
    '/api/notifications/unread-count'
  );

  return response.data.data.count;
}

export async function markNotificationRead(notificationId: string): Promise<AppNotification> {
  const response = await api.patch<{ success: boolean; data: AppNotification }>(
    `/api/notifications/${notificationId}/read`
  );

  return response.data.data;
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.patch('/api/notifications/read-all');
}

export async function deleteNotification(notificationId: string): Promise<void> {
  await api.delete(`/api/notifications/${notificationId}`);
}

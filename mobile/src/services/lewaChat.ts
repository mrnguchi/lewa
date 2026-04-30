import AsyncStorage from '@react-native-async-storage/async-storage';

import { api } from './api';

export type ChatThreadType = 'school_admin' | 'lewa_ai';
export type ChatSender = 'user' | 'assistant' | 'admin';

export interface ChatMessage {
  id: string;
  sender: ChatSender;
  text: string;
  createdAt: string;
  metadata?: unknown;
}

export interface ChatThread {
  id: string;
  type: ChatThreadType;
  title: string;
  preview: string;
  updatedAt: string;
  unreadCount: number;
  messages: ChatMessage[];
  status?: string;
  source?: string;
}

type ConversationDetailResponse = {
  conversation: ChatThread;
  messages: ChatMessage[];
};

type ComplaintConversationResponse = ConversationDetailResponse & {
  complaintId: string;
};

type SendMessageResponse = ConversationDetailResponse & {
  createdConversation: boolean;
};

const AI_WELCOME_SEEN_STORAGE_KEY = 'lewa_ai_welcome_seen';

let hasSeenAiWelcome = false;
let hasLoadedAiWelcomeState = false;

// Loads the persisted AI onboarding state once so the chat hub can route correctly.
export const ensureAiWelcomeStateLoaded = async () => {
  if (hasLoadedAiWelcomeState) {
    return hasSeenAiWelcome;
  }

  try {
    const storedValue = await AsyncStorage.getItem(AI_WELCOME_SEEN_STORAGE_KEY);
    hasSeenAiWelcome = storedValue === 'true';
  } catch (error) {
    hasSeenAiWelcome = false;
  } finally {
    hasLoadedAiWelcomeState = true;
  }

  return hasSeenAiWelcome;
};

// Returns the in-memory AI welcome flag after it has been loaded from storage.
export const hasSeenAiWelcomeScreen = () => hasSeenAiWelcome;

// Marks the AI onboarding screen as completed on this device.
export const markAiWelcomeSeen = async () => {
  hasSeenAiWelcome = true;
  hasLoadedAiWelcomeState = true;

  await AsyncStorage.setItem(AI_WELCOME_SEEN_STORAGE_KEY, 'true');
};

// Fetches the student's chat thread list for one conversation type.
async function getThreadsByType(type: ChatThreadType): Promise<ChatThread[]> {
  const response = await api.get<{ success: boolean; data: ChatThread[] }>('/api/chat/conversations', {
    params: { type },
  });

  return response.data.data;
}

// Loads the authenticated student's School Admin conversations from the backend.
export const getSchoolAdminThreads = async () => getThreadsByType('school_admin');

// Loads the authenticated student's AI conversations from the backend.
export const getAiThreads = async () => getThreadsByType('lewa_ai');

// Loads one saved AI conversation with its full message history from the backend.
export const getAiThreadById = async (threadId: string) => {
  const response = await api.get<{ success: boolean; data: ConversationDetailResponse }>(
    `/api/chat/conversations/${threadId}`
  );

  return {
    ...response.data.data.conversation,
    messages: response.data.data.messages,
  };
};

// Loads one saved School Admin conversation with its full message history.
export const getSchoolAdminThreadById = async (threadId: string) => {
  const response = await api.get<{ success: boolean; data: ConversationDetailResponse }>(
    `/api/chat/conversations/${threadId}`
  );

  return {
    ...response.data.data.conversation,
    messages: response.data.data.messages,
  };
};

// Sends a student message and returns the refreshed conversation snapshot from the backend.
export const sendAiMessage = async (payload: {
  conversationId?: string | null;
  text: string;
}): Promise<SendMessageResponse> => {
  const response = await api.post<{ success: boolean; data: SendMessageResponse }>('/api/chat/messages', {
    conversation_id: payload.conversationId ?? undefined,
    conversation_type: 'lewa_ai',
    message_text: payload.text,
  });

  return response.data.data;
};

// Sends a student message into a School Admin conversation and returns the refreshed thread.
export const sendSchoolAdminMessage = async (payload: {
  conversationId?: string | null;
  text: string;
}): Promise<SendMessageResponse> => {
  const response = await api.post<{ success: boolean; data: SendMessageResponse }>('/api/chat/messages', {
    conversation_id: payload.conversationId ?? undefined,
    conversation_type: 'school_admin',
    message_text: payload.text,
  });

  return response.data.data;
};

// Creates a new complaint-backed School Admin conversation from the Support Desk form.
export const createComplaintConversation = async (payload: {
  title?: string;
  description: string;
}): Promise<ComplaintConversationResponse> => {
  const response = await api.post<{ success: boolean; data: ComplaintConversationResponse }>(
    '/api/chat/support/complaints',
    payload
  );

  return response.data.data;
};

// Deletes a stored conversation so the app can return the user to a clean draft chat.
export const deleteChatConversation = async (conversationId: string) => {
  await api.delete(`/api/chat/conversations/${conversationId}`);
};

// Formats thread timestamps into the compact labels used in the conversation list.
export const formatConversationUpdatedAt = (isoDate: string) => {
  const target = new Date(isoDate);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTargetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const diffInDays = Math.round(
    (startOfToday.getTime() - startOfTargetDay.getTime()) / (24 * 60 * 60 * 1000)
  );

  if (diffInDays === 0) {
    return target.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  if (diffInDays === 1) {
    return 'Yesterday';
  }

  if (diffInDays < 7) {
    return target.toLocaleDateString([], { weekday: 'short' });
  }

  return target.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
};

// Formats message timestamps into short chat-friendly clock labels.
export const formatMessageTimestamp = (isoDate: string) =>
  new Date(isoDate).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";

import { API_BASE_URL } from "@/lib/api";
import type {
  AdminScopeParams,
  AdminSupportConversation,
} from "@/lib/admin-api";

type AdminRealtimeOptions = {
  onRefreshSupportThreads: () => Promise<void>;
  token: string;
  scope: AdminScopeParams;
  selectedConversationId?: string;
  onConversationUpdated: (conversation: AdminSupportConversation) => void;
  onRefreshOverview: () => Promise<void>;
  onThreadUpdated: (conversation: AdminSupportConversation) => void;
  pollIntervalMs?: number;
};

const ADMIN_REALTIME_POLL_MS = 60_000;

const conversationMatchesScope = (
  conversation: AdminSupportConversation,
  scope: AdminScopeParams,
) => {
  if (scope.faculty && conversation.students.faculty !== scope.faculty) {
    return false;
  }

  if (scope.department && conversation.students.department !== scope.department) {
    return false;
  }

  return true;
};

export function useAdminRealtime({
  onRefreshSupportThreads,
  token,
  scope,
  selectedConversationId,
  onConversationUpdated,
  onRefreshOverview,
  onThreadUpdated,
  pollIntervalMs = ADMIN_REALTIME_POLL_MS,
}: AdminRealtimeOptions) {
  const socketRef = useRef<Socket | null>(null);
  const callbacksRef = useRef({
    onConversationUpdated,
    onRefreshOverview,
    onRefreshSupportThreads,
    onThreadUpdated,
    pollIntervalMs,
    scope,
    selectedConversationId,
  });
  const refreshTimerRef = useRef<number | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  useEffect(() => {
    callbacksRef.current = {
      onConversationUpdated,
      onRefreshOverview,
      onRefreshSupportThreads,
      onThreadUpdated,
      pollIntervalMs,
      scope,
      selectedConversationId,
    };
  }, [
    onConversationUpdated,
    onRefreshOverview,
    onRefreshSupportThreads,
    onThreadUpdated,
    pollIntervalMs,
    scope,
    selectedConversationId,
  ]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const refreshDashboardSnapshot = () => {
      const current = callbacksRef.current;

      // I keep this as one shared refresh path so socket and polling update the same dashboard data.
      void Promise.allSettled([
        current.onRefreshOverview(),
        current.onRefreshSupportThreads(),
      ]);
    };

    const scheduleDashboardRefresh = () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }

      // I debounce overview refreshes because a single chat update can touch counts and the thread list.
      refreshTimerRef.current = window.setTimeout(() => {
        refreshDashboardSnapshot();
      }, 500);
    };

    const pollDashboardSnapshot = () => {
      if (document.visibilityState === "hidden") {
        return;
      }

      refreshDashboardSnapshot();
    };

    const handleThreadUpdate = (conversation: AdminSupportConversation) => {
      const current = callbacksRef.current;

      if (!conversationMatchesScope(conversation, current.scope)) {
        return;
      }

      current.onThreadUpdated(conversation);
      scheduleDashboardRefresh();
    };

    const handleConversationUpdate = (conversation: AdminSupportConversation) => {
      const current = callbacksRef.current;

      if (!conversationMatchesScope(conversation, current.scope)) {
        return;
      }

      current.onThreadUpdated(conversation);

      if (conversation.id === current.selectedConversationId) {
        current.onConversationUpdated(conversation);
      }

      scheduleDashboardRefresh();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        pollDashboardSnapshot();
      }
    };

    const socket = io(API_BASE_URL, {
      auth: {
        token,
      },
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;
    socket.on("connect", scheduleDashboardRefresh);
    socket.on("support:thread-updated", handleThreadUpdate);
    socket.on("support:conversation-updated", handleConversationUpdate);
    pollTimerRef.current = window.setInterval(
      pollDashboardSnapshot,
      callbacksRef.current.pollIntervalMs,
    );
    window.addEventListener("focus", pollDashboardSnapshot);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }

      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }

      window.removeEventListener("focus", pollDashboardSnapshot);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      socket.off("connect", scheduleDashboardRefresh);
      socket.off("support:thread-updated", handleThreadUpdate);
      socket.off("support:conversation-updated", handleConversationUpdate);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  useEffect(() => {
    const socket = socketRef.current;

    if (!socket || !selectedConversationId) {
      return;
    }

    socket.emit("support:join-conversation", selectedConversationId);

    return () => {
      socket.emit("support:leave-conversation", selectedConversationId);
    };
  }, [selectedConversationId]);
}

import type { AdminSupportConversation } from "@/lib/admin-api";

export const isAdminSender = (senderType: string) =>
  ["admin", "hod", "assistant", "ai"].includes(senderType);

export const getSupportTitle = () => "Student support";

export const getSupportPreview = (conversation: AdminSupportConversation) => {
  const latestMessage = conversation.lastMessage ?? conversation.messages.at(-1);

  return latestMessage?.message_text?.trim() || "No messages yet";
};

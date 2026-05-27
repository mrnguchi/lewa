import axios from "axios";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";

import { env } from "../../config/env";
import { prisma } from "../../database/prisma";
import { createStudentNotification } from "../notification/notification.service";
import { emitSupportConversationChanged } from "../../realtime/socket.service";
import { ApiError } from "../../utils/api-error";
import {
  AdminReplyInput,
  ChatConversationType,
  CreateComplaintInput,
  SendMessageInput,
} from "./chat.schema";

type ConversationSummaryRecord = {
  id: string;
  conversation_type: string;
  title: string | null;
  status: string;
  source: string;
  updated_at: Date;
  last_message_at: Date;
  student_last_read_at: Date | null;
  messages: MessageRecord[];
  students?: {
    department: string;
  };
  unreadCount?: number;
};

type ConversationDetailRecord = {
  id: string;
  conversation_type: string;
  title: string | null;
  status: string;
  source: string;
  updated_at: Date;
  last_message_at: Date;
  student_last_read_at: Date | null;
  messages: MessageRecord[];
  students?: {
    department: string;
  };
  unreadCount?: number;
};

type MessageRecord = {
  id: string;
  sender_type: string;
  message_text: string | null;
  created_at: Date;
  metadata: Prisma.JsonValue | null;
};

type AiReplyResult = {
  text: string;
  metadata: Prisma.InputJsonObject;
};

const DEFAULT_AI_PREVIEW = "Ask anything within UB and get guided help right away.";
const DEFAULT_SUPPORT_PREVIEW = "Open a conversation and we will help you follow it up.";
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DB_AI_CONVERSATION_TYPE = "ai";
const DB_SUPPORT_CONVERSATION_TYPE = "complaint";
const LEGACY_AI_CONVERSATION_TYPE = "ai_chat";
const LEGACY_SUPPORT_CONVERSATION_TYPE = "school_admin";

// Keeps the public mobile API on "lewa_ai" while supporting the existing DB check constraint.
const toDatabaseConversationType = (type: ChatConversationType) =>
  type === "lewa_ai" ? DB_AI_CONVERSATION_TYPE : DB_SUPPORT_CONVERSATION_TYPE;

// Normalizes legacy DB labels back into the app-facing conversation type.
const toApiConversationType = (type: string): ChatConversationType =>
  type === DB_AI_CONVERSATION_TYPE || type === LEGACY_AI_CONVERSATION_TYPE
    ? "lewa_ai"
    : "school_admin";

const isAiConversationType = (type: string) =>
  type === "lewa_ai" ||
  type === DB_AI_CONVERSATION_TYPE ||
  type === LEGACY_AI_CONVERSATION_TYPE;

const isSupportConversationType = (type: string) =>
  type === "school_admin" ||
  type === DB_SUPPORT_CONVERSATION_TYPE ||
  type === LEGACY_SUPPORT_CONVERSATION_TYPE;

const toDatabaseSenderType = (senderType: "student" | "assistant" | "admin") => {
  if (senderType === "assistant") {
    return "ai";
  }

  if (senderType === "admin") {
    return "hod";
  }

  return "student";
};

const messageSelect = {
  id: true,
  sender_type: true,
  message_text: true,
  created_at: true,
  metadata: true,
} as const;

const SUPPORT_TITLE_STOP_WORDS = new Set(["department", "of", "and", "&"]);

// Converts DB sender labels into the mobile-friendly sender values already used by the UI.
const mapSenderType = (senderType: string): "user" | "assistant" | "admin" => {
  if (senderType === "assistant" || senderType === "ai") {
    return "assistant";
  }

  if (senderType === "admin" || senderType === "hod") {
    return "admin";
  }

  return "user";
};

// Keeps thread titles compact and readable from the first real user prompt.
const createConversationTitle = (text: string) => {
  const trimmedText = text.trim();

  if (!trimmedText) {
    return "New chat";
  }

  if (trimmedText.length <= 28) {
    return trimmedText;
  }

  return `${trimmedText.slice(0, 25).trimEnd()}...`;
};

// I show support threads by department so students can immediately tell which office owns the chat.
const getDepartmentSupportTitle = (department?: string | null) => {
  const normalizedDepartment = department?.trim();

  if (!normalizedDepartment) {
    return "Support";
  }

  const abbreviation = normalizedDepartment
    .replace(/[()]/g, " ")
    .split(/\s+/)
    .filter((word) => word && !SUPPORT_TITLE_STOP_WORDS.has(word.toLowerCase()))
    .map((word) => word[0]?.toUpperCase())
    .join("");

  return `${abbreviation || normalizedDepartment} - Support`;
};

const getStudentSupportTitle = async (studentId: string) => {
  const student = await prisma.students.findUnique({
    where: {
      id: studentId,
    },
    select: {
      department: true,
    },
  });

  if (!student) {
    throw new ApiError(404, "Student not found");
  }

  return getDepartmentSupportTitle(student.department);
};

// Normalizes a stored message row into the shape expected by the mobile chat UI.
const mapMessage = (message: MessageRecord) => ({
  id: message.id,
  sender: mapSenderType(message.sender_type),
  text: message.message_text?.trim() || "",
  createdAt: message.created_at.toISOString(),
  metadata: message.metadata,
});

// Builds a clean conversation summary from the latest message and conversation metadata.
const mapConversationSummary = (conversation: ConversationSummaryRecord) => {
  const latestMessage = conversation.messages.at(-1) ?? conversation.messages[0];
  const isAiConversation = isAiConversationType(conversation.conversation_type);
  const isSupportConversation = isSupportConversationType(conversation.conversation_type);
  const preview =
    latestMessage?.message_text?.trim() ||
    (isAiConversation ? DEFAULT_AI_PREVIEW : DEFAULT_SUPPORT_PREVIEW);

  return {
    id: conversation.id,
    type: toApiConversationType(conversation.conversation_type),
    title:
      isSupportConversation
        ? getDepartmentSupportTitle(conversation.students?.department)
        : conversation.title?.trim() || "New chat",
    preview,
    updatedAt: conversation.last_message_at.toISOString(),
    unreadCount: conversation.unreadCount ?? 0,
    status: conversation.status,
    source: conversation.source,
    messages: conversation.messages.map(mapMessage),
  };
};

const getStudentUnreadCount = async (
  conversation: {
    id: string;
    conversation_type: string;
    student_last_read_at: Date | null;
  }
) => {
  const incomingSenderTypes = isAiConversationType(conversation.conversation_type)
    ? ["ai", "assistant"]
    : ["admin", "hod"];

  return prisma.messages.count({
    where: {
      conversation_id: conversation.id,
      sender_type: {
        in: incomingSenderTypes,
      },
      ...(conversation.student_last_read_at
        ? {
            created_at: {
              gt: conversation.student_last_read_at,
            },
          }
        : {}),
    },
  });
};

// Loads a conversation owned by the authenticated student or throws a 404.
async function getOwnedConversation(studentId: string, conversationId: string) {
  const conversation = await prisma.conversations.findFirst({
    where: {
      id: conversationId,
      student_id: studentId,
    },
    select: {
      id: true,
      student_id: true,
      conversation_type: true,
      title: true,
      status: true,
      source: true,
      updated_at: true,
      last_message_at: true,
    },
  });

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  return conversation;
}

// Loads any conversation by id so staff-style reply flows can validate the target thread.
async function getConversationById(conversationId: string) {
  const conversation = await prisma.conversations.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      student_id: true,
      complaint_id: true,
      conversation_type: true,
      title: true,
      status: true,
      source: true,
      updated_at: true,
      last_message_at: true,
    },
  });

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  return conversation;
}

// Builds a compact UB-grounding snapshot from data you already store in Postgres.
async function buildUbContext(studentId: string) {
  const today = new Date();
  const student = await prisma.students.findUnique({
    where: { id: studentId },
    select: {
      full_name: true,
      faculty: true,
      department: true,
      level: true,
      fee_status: true,
      subscribed: true,
    },
  });

  const [upcomingEntries, faqs, resources] = await Promise.all([
    prisma.calendar_entries.findMany({
      where: {
        status: "published",
        start_date: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        },
      },
      orderBy: [{ start_date: "asc" }],
      take: 5,
      select: {
        entry_type: true,
        title: true,
        summary: true,
        start_date: true,
        end_date: true,
      },
    }),
    prisma.faqs.findMany({
      orderBy: [{ display_order: "asc" }, { created_at: "desc" }],
      take: 6,
      select: {
        question: true,
        answer: true,
      },
    }),
    prisma.resources.findMany({
      where: {
        OR: [{ faculty: null }, ...(student?.faculty ? [{ faculty: student.faculty }] : [])],
        ...(student?.level
          ? {
              level: student.level,
            }
          : {}),
      },
      orderBy: [{ created_at: "desc" }],
      take: 5,
      select: {
        code: true,
        title: true,
        faculty: true,
        level: true,
        type: true,
      },
    }),
  ]);

  return {
    student,
    upcomingEntries,
    faqs,
    resources,
  };
}

// Shapes recent conversation history into a compact transcript for the AI call.
const buildTranscript = (messages: MessageRecord[]) =>
  messages
    .map((message) => `${mapSenderType(message.sender_type)}: ${message.message_text?.trim() || ""}`)
    .join("\n");

// Builds the prompt payload that keeps Lewa AI scoped to UB-relevant support.
function buildOpenAiPrompt(params: {
  question: string;
  transcript: string;
  ubContext: Awaited<ReturnType<typeof buildUbContext>>;
}) {
  const { question, transcript, ubContext } = params;

  return [
    "Student context:",
    JSON.stringify(ubContext.student ?? {}, null, 2),
    "",
    "Upcoming UB calendar items:",
    JSON.stringify(ubContext.upcomingEntries, null, 2),
    "",
    "UB FAQs:",
    JSON.stringify(ubContext.faqs, null, 2),
    "",
    "Relevant resources:",
    JSON.stringify(ubContext.resources, null, 2),
    "",
    "Recent conversation transcript:",
    transcript || "No previous messages.",
    "",
    `Latest student question: ${question}`,
  ].join("\n");
}

// Supports both the legacy output_text convenience field and the structured Responses output array.
function extractOpenAiResponseText(responseData: any) {
  if (typeof responseData?.output_text === "string") {
    return responseData.output_text.trim();
  }

  if (typeof responseData?.text === "string") {
    return responseData.text.trim();
  }

  if (typeof responseData?.text?.value === "string") {
    return responseData.text.value.trim();
  }

  const output = Array.isArray(responseData?.output) ? responseData.output : [];
  const textParts = output.flatMap((item: any) => {
    const content = Array.isArray(item?.content) ? item.content : [];

    return content
      .map((contentItem: any) =>
        typeof contentItem?.text === "string" ? contentItem.text.trim() : ""
      )
      .filter(Boolean);
  });

  return textParts.join("\n").trim();
}

// Falls back to deterministic UB-focused replies when the OpenAI integration is not ready.
function createFallbackAiReply(question: string) {
  const normalizedQuestion = question.trim().toLowerCase();

  if (!normalizedQuestion) {
    return "I am ready whenever you want to ask about UB fees, exams, resources, or support processes.";
  }

  if (normalizedQuestion.includes("exam")) {
    return "I can help with UB exam timing, revision planning, and calendar follow-up. If you want a precise answer, mention your faculty or course.";
  }

  if (normalizedQuestion.includes("fee")) {
    return "I can guide you through fee deadlines, payment flow, receipt follow-up, and what to do if your payment is delayed.";
  }

  if (normalizedQuestion.includes("transcript")) {
    return "For transcript questions, I can help you identify the likely office, the supporting details you may need, and the next step to take.";
  }

  if (normalizedQuestion.includes("result")) {
    return "I can help you check the likely result timeline and point you to the right UB channel to confirm it.";
  }

  return `I can help you with UB-related guidance on "${question.trim()}". If you want a more accurate answer, add your faculty, department, or the exact process you are asking about.`;
}

// I save admin replies as app notifications so the bell has the same story as push.
async function notifyStudentAboutAdminReply(params: {
  studentId: string;
  conversationId: string;
  messageId: string;
  conversationTitle: string;
  messageText: string;
}) {
  await createStudentNotification({
    studentId: params.studentId,
    type: "chat_message",
    title: "School Admin",
    body: params.messageText,
    targetType: "chat_message",
    targetId: params.messageId,
    metadata: {
      conversationId: params.conversationId,
      conversationType: "school_admin",
      threadTitle: params.conversationTitle,
    },
  });
}

// Calls OpenAI through the Responses API when configured, with file search support when available.
async function generateAiReply(params: {
  studentId: string;
  question: string;
  recentMessages: MessageRecord[];
}): Promise<AiReplyResult> {
  if (!env.openAiApiKey) {
    return {
      text: createFallbackAiReply(params.question),
      metadata: {
        provider: "fallback",
        reason: "missing_openai_api_key",
      },
    };
  }

  const ubContext = await buildUbContext(params.studentId);
  const transcript = buildTranscript(params.recentMessages);
  const requestBody: Record<string, unknown> = {
    model: env.openAiModel || "gpt-5.4-mini",
    instructions: [
      "You are Lewa AI, the University of Buea assistant inside the Lewa student app.",
      "Answer with a UB-specific, practical, and trustworthy tone.",
      "Use the provided UB context first, and use retrieved files if available.",
      "Do not invent fees, dates, or policies that are not supported by the supplied context or retrieved knowledge.",
      "If you are unsure, say you do not have verified information yet and advise the student to check the official UB office or School Admin chat.",
      "Keep answers concise, helpful, and action-oriented.",
    ].join(" "),
    input: buildOpenAiPrompt({
      question: params.question,
      transcript,
      ubContext,
    }),
  };

  if (env.openAiVectorStoreId) {
    requestBody.tools = [
      {
        type: "file_search",
        vector_store_ids: [env.openAiVectorStoreId],
      },
    ];
  }

  try {
    const response = await axios.post(OPENAI_RESPONSES_URL, requestBody, {
      headers: {
        Authorization: `Bearer ${env.openAiApiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 25000,
    });

    const outputText = extractOpenAiResponseText(response.data);

    if (!outputText) {
      throw new Error("OpenAI response did not contain assistant text");
    }

    return {
      text: outputText,
      metadata: {
        provider: "openai",
        model: String(requestBody.model),
        vector_store_enabled: Boolean(env.openAiVectorStoreId),
      },
    };
  } catch (error) {
    console.error("Failed to generate OpenAI chat reply", error);

    return {
      text: createFallbackAiReply(params.question),
      metadata: {
        provider: "fallback",
        reason: "openai_request_failed",
      },
    };
  }
}

// Returns chat thread summaries for the authenticated student.
export async function listStudentConversations(
  studentId: string,
  type?: ChatConversationType
) {
  const databaseType = type ? toDatabaseConversationType(type) : undefined;

  const conversations = await prisma.conversations.findMany({
    where: {
      student_id: studentId,
      ...(databaseType
        ? {
            conversation_type: databaseType,
          }
        : {}),
    },
    orderBy: [{ last_message_at: "desc" }],
    select: {
      id: true,
      conversation_type: true,
      title: true,
      status: true,
      source: true,
      updated_at: true,
      last_message_at: true,
      student_last_read_at: true,
      students: {
        select: {
          department: true,
        },
      },
      messages: {
        orderBy: [{ created_at: "desc" }],
        take: 1,
        select: messageSelect,
      },
    },
  });

  return Promise.all(
    conversations.map(async (conversation) =>
      mapConversationSummary({
        ...(conversation as ConversationSummaryRecord),
        unreadCount: await getStudentUnreadCount(conversation),
      })
    )
  );
}

// I expose one small aggregate for badges and background sync instead of polling full threads.
export async function getStudentUnreadChatCount(studentId: string) {
  const conversations = await prisma.conversations.findMany({
    where: {
      student_id: studentId,
    },
    select: {
      id: true,
      conversation_type: true,
      student_last_read_at: true,
    },
  });

  const counts = await Promise.all(
    conversations.map((conversation) => getStudentUnreadCount(conversation))
  );

  return counts.reduce((total, count) => total + count, 0);
}

// Returns one conversation plus the full ascending message history.
export async function getStudentConversation(studentId: string, conversationId: string) {
  const conversation = await prisma.conversations.findFirst({
    where: {
      id: conversationId,
      student_id: studentId,
    },
    select: {
      id: true,
      conversation_type: true,
      title: true,
      status: true,
      source: true,
      updated_at: true,
      last_message_at: true,
      student_last_read_at: true,
      students: {
        select: {
          department: true,
        },
      },
      messages: {
        orderBy: [{ created_at: "asc" }],
        select: messageSelect,
      },
    },
  });

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  await prisma.conversations.update({
    where: {
      id: conversation.id,
    },
    data: {
      student_last_read_at: conversation.last_message_at,
    },
  });

  const summary = mapConversationSummary({
    ...(conversation as ConversationDetailRecord),
    student_last_read_at: conversation.last_message_at,
    unreadCount: 0,
  });

  return {
    conversation: {
      ...summary,
      updatedAt: conversation.updated_at.toISOString(),
    },
    messages: conversation.messages.map((message) => mapMessage(message as MessageRecord)),
  };
}

// Creates a complaint-backed School Admin conversation with the student's opening message.
export async function createSupportConversation(
  studentId: string,
  payload: CreateComplaintInput
) {
  const trimmedDescription = payload.description.trim();
  const complaintTitle = payload.title?.trim() || createConversationTitle(trimmedDescription);
  const supportTitle = await getStudentSupportTitle(studentId);

  const result = await prisma.$transaction(async (transaction) => {
    const complaint = await transaction.complaints.create({
      data: {
        id: randomUUID(),
        student_id: studentId,
        title: complaintTitle,
        description: trimmedDescription,
        status: "pending",
      },
      select: {
        id: true,
      },
    });

    const conversation = await transaction.conversations.create({
      data: {
        id: randomUUID(),
        student_id: studentId,
        conversation_type: toDatabaseConversationType("school_admin"),
        complaint_id: complaint.id,
        title: supportTitle,
        status: "open",
        source: "support_desk",
        last_message_at: new Date(),
      },
      select: {
        id: true,
      },
    });

    const openingMessage = await transaction.messages.create({
      data: {
        id: randomUUID(),
        conversation_id: conversation.id,
        sender_type: toDatabaseSenderType("student"),
        sender_student_id: studentId,
        message_type: "text",
        message_text: trimmedDescription,
        metadata: {
          complaint_id: complaint.id,
          origin: "support_desk",
        },
      },
      select: {
        created_at: true,
      },
    });

    await transaction.conversations.update({
      where: {
        id: conversation.id,
      },
      data: {
        last_message_at: openingMessage.created_at,
        student_last_read_at: openingMessage.created_at,
        updated_at: openingMessage.created_at,
      },
    });

    return {
      complaintId: complaint.id,
      conversationId: conversation.id,
    };
  });

  await emitSupportConversationChanged(result.conversationId);

  return {
    ...(await getStudentConversation(studentId, result.conversationId)),
    complaintId: result.complaintId,
  };
}

// Creates or appends a student message, then generates an assistant reply for AI conversations.
export async function sendStudentMessage(studentId: string, payload: SendMessageInput) {
  const trimmedText = payload.message_text.trim();
  let createdConversation = false;
  let conversationType = payload.conversation_type;
  let databaseConversationType = toDatabaseConversationType(conversationType);
  let conversationId = payload.conversation_id;
  let conversationTitle = createConversationTitle(trimmedText);
  let supportTitle: string | null = null;

  if (conversationId) {
    const existingConversation = await getOwnedConversation(studentId, conversationId);
    conversationType = toApiConversationType(existingConversation.conversation_type);
    databaseConversationType = existingConversation.conversation_type;
    conversationTitle = existingConversation.title?.trim() || conversationTitle;
    supportTitle =
      conversationType === "school_admin"
        ? await getStudentSupportTitle(studentId)
        : null;
  } else {
    supportTitle =
      conversationType === "school_admin"
        ? await getStudentSupportTitle(studentId)
        : null;

    const conversation = await prisma.conversations.create({
      data: {
        id: randomUUID(),
        student_id: studentId,
        conversation_type: databaseConversationType,
        title:
          conversationType === "lewa_ai"
            ? conversationTitle
            : supportTitle,
        status: "open",
        source: "mobile",
        last_message_at: new Date(),
      },
      select: {
        id: true,
      },
    });

    conversationId = conversation.id;
    createdConversation = true;
  }

  const studentMessage = await prisma.messages.create({
    data: {
      id: randomUUID(),
      conversation_id: conversationId,
      sender_type: toDatabaseSenderType("student"),
      sender_student_id: studentId,
      message_type: "text",
      message_text: trimmedText,
    },
    select: messageSelect,
  });

  await prisma.conversations.update({
    where: {
      id: conversationId,
    },
    data: {
      title:
        conversationType === "lewa_ai"
          ? conversationTitle
          : supportTitle,
      updated_at: studentMessage.created_at,
      last_message_at: studentMessage.created_at,
      student_last_read_at: studentMessage.created_at,
    },
  });

  if (conversationType === "lewa_ai") {
    const recentMessages = await prisma.messages.findMany({
      where: {
        conversation_id: conversationId,
      },
      orderBy: [{ created_at: "desc" }],
      take: 8,
      select: messageSelect,
    });

    const aiReply = await generateAiReply({
      studentId,
      question: trimmedText,
      recentMessages: [...recentMessages].reverse() as MessageRecord[],
    });

    const assistantMessage = await prisma.messages.create({
      data: {
        id: randomUUID(),
        conversation_id: conversationId,
        sender_type: toDatabaseSenderType("assistant"),
        message_type: "text",
        message_text: aiReply.text,
        metadata: aiReply.metadata,
      },
      select: messageSelect,
    });

    await prisma.conversations.update({
      where: {
        id: conversationId,
      },
      data: {
        updated_at: assistantMessage.created_at,
        last_message_at: assistantMessage.created_at,
        student_last_read_at: assistantMessage.created_at,
      },
    });
  } else {
    await emitSupportConversationChanged(conversationId);
  }

  return {
    ...(await getStudentConversation(studentId, conversationId)),
    createdConversation,
  };
}

// Persists a School Admin reply and notifies the student so the app can deep-link to the thread.
export async function sendAdminReply(
  actingStudentId: string,
  conversationId: string,
  payload: AdminReplyInput
) {
  const conversation = await getConversationById(conversationId);

  if (!isSupportConversationType(conversation.conversation_type)) {
    throw new ApiError(400, "Admin replies are only supported for School Admin conversations");
  }

  const adminMessage = await prisma.messages.create({
    data: {
      id: randomUUID(),
      conversation_id: conversation.id,
      sender_type: toDatabaseSenderType("admin"),
      message_type: "text",
      message_text: payload.message_text.trim(),
      metadata: {
        created_by_student_id: actingStudentId,
        created_via: "president_reply",
      },
    },
    select: messageSelect,
  });

  await prisma.conversations.update({
    where: {
      id: conversation.id,
    },
    data: {
      updated_at: adminMessage.created_at,
      last_message_at: adminMessage.created_at,
      admin_last_read_at: adminMessage.created_at,
    },
  });

  if (conversation.complaint_id) {
    await prisma.complaints.update({
      where: {
        id: conversation.complaint_id,
      },
      data: {
        status: "in_progress",
        updated_at: adminMessage.created_at,
      },
    });
  }

  try {
    await notifyStudentAboutAdminReply({
      studentId: conversation.student_id,
      conversationId: conversation.id,
      messageId: adminMessage.id,
      conversationTitle: await getStudentSupportTitle(conversation.student_id),
      messageText: payload.message_text.trim(),
    });
  } catch (error) {
    console.error("Failed to send admin reply notification", error);
  }

  await emitSupportConversationChanged(conversation.id);

  return getStudentConversation(conversation.student_id, conversation.id);
}

export async function sendDashboardAdminReply(
  adminId: string,
  conversationId: string,
  payload: AdminReplyInput
) {
  const conversation = await getConversationById(conversationId);

  if (!isSupportConversationType(conversation.conversation_type)) {
    throw new ApiError(400, "Admin replies are only supported for School Admin conversations");
  }

  const adminMessage = await prisma.messages.create({
    data: {
      id: randomUUID(),
      conversation_id: conversation.id,
      sender_type: toDatabaseSenderType("admin"),
      sender_admin_id: adminId,
      message_type: "text",
      message_text: payload.message_text.trim(),
      metadata: {
        created_by_admin_id: adminId,
        created_via: "admin_dashboard",
      },
    },
    select: messageSelect,
  });

  await prisma.conversations.update({
    where: {
      id: conversation.id,
    },
    data: {
      assigned_admin_id: adminId,
      updated_at: adminMessage.created_at,
      last_message_at: adminMessage.created_at,
      admin_last_read_at: adminMessage.created_at,
    },
  });

  if (conversation.complaint_id) {
    await prisma.complaints.update({
      where: {
        id: conversation.complaint_id,
      },
      data: {
        status: "in_progress",
        updated_at: adminMessage.created_at,
      },
    });
  }

  try {
    await notifyStudentAboutAdminReply({
      studentId: conversation.student_id,
      conversationId: conversation.id,
      messageId: adminMessage.id,
      conversationTitle: await getStudentSupportTitle(conversation.student_id),
      messageText: payload.message_text.trim(),
    });
  } catch (error) {
    console.error("Failed to send admin reply notification", error);
  }

  await emitSupportConversationChanged(conversation.id);

  return getStudentConversation(conversation.student_id, conversation.id);
}

// Deletes a conversation and all its messages so the mobile app can reset to a clean draft chat.
export async function deleteStudentConversation(studentId: string, conversationId: string) {
  await getOwnedConversation(studentId, conversationId);

  await prisma.conversations.delete({
    where: {
      id: conversationId,
    },
  });

  return {
    success: true,
  };
}

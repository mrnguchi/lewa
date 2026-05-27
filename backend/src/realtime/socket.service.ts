import type { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import { Server, Socket } from "socket.io";

import { env } from "../config/env";
import { prisma } from "../database/prisma";
import { getSupportConversationById } from "../modules/admin/admin.service";

const SUPPORT_CONVERSATION_TYPES = ["complaint", "school_admin"];
const CENTRAL_ADMIN_ROLES = new Set(["central_admin", "super_admin"]);

type SocketAdmin = {
  id: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  faculty: string | null;
  department: string | null;
  admin_role: string;
  is_active: boolean;
  last_login_at: Date | null;
};

type SocketStudent = {
  id: string;
  faculty: string;
  department: string;
  is_active: boolean;
};

type SocketUser =
  | {
      kind: "admin";
      admin: SocketAdmin;
    }
  | {
      kind: "student";
      student: SocketStudent;
    };

let io: Server | null = null;

const normalizeAdminRole = (role: string) =>
  role.trim().toLowerCase().replace(/\s+/g, "_");

const normalizeRoomKey = (value: string) =>
  encodeURIComponent(value.trim().toLowerCase());

const getCorsOrigin = () => {
  if (env.corsOrigin === "*") {
    return true;
  }

  return env.corsOrigin.split(",").map((origin) => origin.trim());
};

const getTokenFromSocket = (socket: Socket) => {
  const authToken = socket.handshake.auth?.token;

  if (typeof authToken === "string" && authToken.trim()) {
    return authToken.trim();
  }

  const authorization = socket.handshake.headers.authorization;

  if (!authorization) {
    return null;
  }

  const [, token] = authorization.split(" ");
  return token?.trim() || null;
};

// I target rooms by school scope so department admins never receive another department's thread.
const getAdminRoomsForStudentScope = (student: {
  faculty: string;
  department: string;
}) => [
  "admin:central",
  `admin:faculty:${normalizeRoomKey(student.faculty)}`,
  `admin:department:${normalizeRoomKey(student.faculty)}:${normalizeRoomKey(
    student.department
  )}`,
];

const getConversationRoom = (conversationId: string) =>
  `support:conversation:${conversationId}`;

const getStudentRoom = (studentId: string) => `student:${studentId}`;

// I join each admin to the widest room their role is allowed to watch.
const joinAdminRooms = (socket: Socket, admin: SocketAdmin) => {
  const role = normalizeAdminRole(admin.admin_role);

  if (CENTRAL_ADMIN_ROLES.has(role)) {
    socket.join("admin:central");
    return;
  }

  if (role === "faculty_admin" && admin.faculty) {
    socket.join(`admin:faculty:${normalizeRoomKey(admin.faculty)}`);
    return;
  }

  if (role === "department_admin" && admin.faculty && admin.department) {
    socket.join(
      `admin:department:${normalizeRoomKey(admin.faculty)}:${normalizeRoomKey(
        admin.department
      )}`
    );
  }
};

// I authenticate sockets with the same JWTs as HTTP routes to keep realtime access consistent.
const authenticateSocket = async (socket: Socket, next: (error?: Error) => void) => {
  try {
    const token = getTokenFromSocket(socket);

    if (!token) {
      throw new Error("Authentication required");
    }

    const decoded = jwt.verify(token, env.jwtSecret) as {
      tokenType?: string;
      adminId?: string;
      studentId?: string;
    };

    if (decoded.tokenType === "admin" && decoded.adminId) {
      const admin = await prisma.admins.findUnique({
        where: {
          id: decoded.adminId,
        },
        select: {
          id: true,
          full_name: true,
          email: true,
          phone_number: true,
          faculty: true,
          department: true,
          admin_role: true,
          is_active: true,
          last_login_at: true,
        },
      });

      if (!admin?.is_active) {
        throw new Error("Admin account is inactive");
      }

      socket.data.user = {
        kind: "admin",
        admin,
      } satisfies SocketUser;
      next();
      return;
    }

    if (decoded.studentId) {
      const student = await prisma.students.findUnique({
        where: {
          id: decoded.studentId,
        },
        select: {
          id: true,
          faculty: true,
          department: true,
          is_active: true,
        },
      });

      if (!student?.is_active) {
        throw new Error("Student account is inactive");
      }

      socket.data.user = {
        kind: "student",
        student,
      } satisfies SocketUser;
      next();
      return;
    }

    throw new Error("Invalid realtime token");
  } catch {
    next(new Error("Invalid or expired realtime token"));
  }
};

// I keep this count aligned with the dashboard's "needs response" logic.
const getConversationAdminUnreadCount = async (
  conversationId: string,
  adminLastReadAt?: Date | null
) => {
  return prisma.messages.count({
    where: {
      conversation_id: conversationId,
      sender_type: "student",
      ...(adminLastReadAt
        ? {
            created_at: {
              gt: adminLastReadAt,
            },
          }
        : {}),
    },
  });
};

// I load the same shape the dashboard already receives from the REST support endpoints.
const getRealtimeSupportConversation = async (conversationId: string) => {
  const conversation = await prisma.conversations.findFirst({
    where: {
      id: conversationId,
      conversation_type: {
        in: SUPPORT_CONVERSATION_TYPES,
      },
    },
    include: {
      admins: {
        select: {
          id: true,
          full_name: true,
          email: true,
          phone_number: true,
          faculty: true,
          department: true,
          admin_role: true,
          is_active: true,
          last_login_at: true,
        },
      },
      complaints: {
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          created_at: true,
          updated_at: true,
        },
      },
      messages: {
        orderBy: {
          created_at: "asc",
        },
      },
      students: {
        select: {
          id: true,
          full_name: true,
          matricule: true,
          phone_number: true,
          faculty: true,
          department: true,
          level: true,
          profile_image_url: true,
          fee_status: true,
          is_active: true,
        },
      },
    },
  });

  if (!conversation) {
    return null;
  }

  return {
    ...conversation,
    lastMessage: conversation.messages.at(-1) ?? null,
    unreadForAdmin: await getConversationAdminUnreadCount(
      conversation.id,
      conversation.admin_last_read_at
    ),
  };
};

// I check room joins on demand so a client cannot subscribe to a thread by guessing its id.
const assertSocketCanJoinConversation = async (
  socket: Socket,
  conversationId: string
) => {
  const user = socket.data.user as SocketUser | undefined;

  if (!user) {
    throw new Error("Authentication required");
  }

  if (user.kind === "admin") {
    await getSupportConversationById(conversationId, user.admin);
    return;
  }

  const conversation = await prisma.conversations.findFirst({
    where: {
      id: conversationId,
      student_id: user.student.id,
      conversation_type: {
        in: SUPPORT_CONVERSATION_TYPES,
      },
    },
    select: {
      id: true,
    },
  });

  if (!conversation) {
    throw new Error("Support conversation not found");
  }
};

// I bind Socket.IO once at boot and keep all event names in this one service.
export const initializeRealtime = (httpServer: HttpServer) => {
  io = new Server(httpServer, {
    cors: {
      credentials: true,
      origin: getCorsOrigin(),
    },
  });

  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    const user = socket.data.user as SocketUser;

    // I join broad rooms once so support updates can be delivered without polling.
    if (user.kind === "admin") {
      joinAdminRooms(socket, user.admin);
    } else {
      socket.join(getStudentRoom(user.student.id));
    }

    socket.on(
      "support:join-conversation",
      async (
        conversationId: string,
        ack?: (response: { ok: boolean; message?: string }) => void
      ) => {
        try {
          await assertSocketCanJoinConversation(socket, conversationId);
          socket.join(getConversationRoom(conversationId));
          ack?.({ ok: true });
        } catch (error) {
          ack?.({
            ok: false,
            message:
              error instanceof Error
                ? error.message
                : "Unable to join support conversation",
          });
        }
      }
    );

    socket.on("support:leave-conversation", (conversationId: string) => {
      socket.leave(getConversationRoom(conversationId));
    });
  });

  return io;
};

// I call this after support writes so connected dashboards and students get fresh thread data.
export const emitSupportConversationChanged = async (conversationId: string) => {
  if (!io) {
    return;
  }

  try {
    const conversation = await getRealtimeSupportConversation(conversationId);

    if (!conversation) {
      return;
    }

    const adminRooms = getAdminRoomsForStudentScope(conversation.students);

    io.to(adminRooms).emit("support:thread-updated", conversation);
    io.to(getConversationRoom(conversation.id)).emit(
      "support:conversation-updated",
      conversation
    );
    io.to(getStudentRoom(conversation.student_id)).emit(
      "support:conversation-updated",
      conversation
    );
  } catch (error) {
    console.error("Failed to emit support realtime update", error);
  }
};

// I ping the student's room whenever the notification center needs to refresh its counts/list.
export const emitStudentNotificationsChanged = (studentId: string) => {
  if (!io) {
    return;
  }

  io.to(getStudentRoom(studentId)).emit("notifications:changed", {
    studentId,
  });
};

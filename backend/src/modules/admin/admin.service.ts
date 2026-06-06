import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Prisma } from "@prisma/client";

import { env } from "../../config/env";
import { prisma } from "../../database/prisma";
import { ApiError } from "../../utils/api-error";
import * as paymentService from "../payment/payment.service";
import { NEWS_CATEGORIES } from "../news/news.schema";
import {
  AdminLoginInput,
  AdminScopeQuery,
  ListSchoolPaymentsQuery,
  ListSchoolReceiptsQuery,
  ListStudentsQuery,
  ListSupportConversationsQuery,
  StudentDistributionQuery,
} from "./admin.schema";

const SUPPORT_CONVERSATION_TYPES = ["complaint", "school_admin"];
const CENTRAL_ADMIN_ROLES = new Set(["central_admin", "super_admin"]);
const FACULTY_ADMIN_ROLES = new Set(["faculty_admin"]);
const DEPARTMENT_ADMIN_ROLES = new Set(["department_admin"]);

type NewsCategory = (typeof NEWS_CATEGORIES)[number];

export type AdminAccessScope = {
  id: string;
  full_name?: string;
  email?: string;
  phone_number?: string | null;
  faculty: string | null;
  department: string | null;
  admin_role: string;
  is_active?: boolean;
  last_login_at?: Date | null;
};

const adminPublicSelect = {
  id: true,
  full_name: true,
  email: true,
  phone_number: true,
  faculty: true,
  department: true,
  admin_role: true,
  is_active: true,
  last_login_at: true,
} as const;

const adminStudentSelect = {
  id: true,
  full_name: true,
  matricule: true,
  phone_number: true,
  faculty: true,
  department: true,
  level: true,
  profile_image_url: true,
  notifications_enabled: true,
  is_active: true,
  fee_status: true,
  role: true,
} as const;

const studentSummarySelect = {
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
} as const;

const adminNewsSelect = {
  id: true,
  title: true,
  intro: true,
  description: true,
  category: true,
  image_url: true,
  lewa_logo_url: true,
  published_at: true,
  created_at: true,
  updated_at: true,
} as const;

const normalizeAdminRole = (role: string) =>
  role.trim().toLowerCase().replace(/\s+/g, "_");

const normalizeOptionalText = (value?: string | null) => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

const textMatches = (left?: string | null, right?: string | null) =>
  normalizeOptionalText(left)?.toLowerCase() ===
  normalizeOptionalText(right)?.toLowerCase();

const isCentralAdmin = (admin: Pick<AdminAccessScope, "admin_role">) =>
  CENTRAL_ADMIN_ROLES.has(normalizeAdminRole(admin.admin_role));

const isFacultyAdmin = (admin: Pick<AdminAccessScope, "admin_role">) =>
  FACULTY_ADMIN_ROLES.has(normalizeAdminRole(admin.admin_role));

const isDepartmentAdmin = (admin: Pick<AdminAccessScope, "admin_role">) =>
  DEPARTMENT_ADMIN_ROLES.has(normalizeAdminRole(admin.admin_role));

const assertLoginWorkspace = (
  admin: AdminAccessScope,
  data: AdminLoginInput
) => {
  const selectedFaculty = normalizeOptionalText(data.faculty);
  const selectedDepartment = normalizeOptionalText(data.department);

  if (data.centralAdministration) {
    if (!isCentralAdmin(admin)) {
      throw new ApiError(
        403,
        "This account is not assigned to central administration"
      );
    }

    return;
  }

  if (isCentralAdmin(admin)) {
    throw new ApiError(
      403,
      "Use the central administration option for this admin account"
    );
  }

  if (!selectedFaculty) {
    throw new ApiError(400, "Select the faculty for this admin account");
  }

  if (!admin.faculty || !textMatches(selectedFaculty, admin.faculty)) {
    throw new ApiError(403, "This account is not assigned to that faculty");
  }

  if (isDepartmentAdmin(admin)) {
    if (!selectedDepartment) {
      throw new ApiError(400, "Select the department for this admin account");
    }

    if (!admin.department || !textMatches(selectedDepartment, admin.department)) {
      throw new ApiError(403, "This account is not assigned to that department");
    }

    return;
  }

  if (isFacultyAdmin(admin)) {
    if (selectedDepartment) {
      throw new ApiError(
        403,
        "Faculty admins should sign in to the faculty workspace"
      );
    }

    return;
  }

  throw new ApiError(403, "This admin account has no supported access scope");
};

export const getAdminStudentScopeWhere = (
  admin: AdminAccessScope,
  requestedScope: AdminScopeQuery = {}
): Prisma.studentsWhereInput => {
  if (isCentralAdmin(admin)) {
    const faculty = normalizeOptionalText(requestedScope.faculty);
    const department = normalizeOptionalText(requestedScope.department);

    if (department && !faculty) {
      throw new ApiError(400, "Select a faculty before selecting a department");
    }

    return {
      ...(faculty ? { faculty } : {}),
      ...(department ? { department } : {}),
    };
  }

  if (isDepartmentAdmin(admin)) {
    if (!admin.faculty || !admin.department) {
      throw new ApiError(403, "Department admin scope is not configured");
    }

    return {
      faculty: admin.faculty,
      department: admin.department,
    };
  }

  if (isFacultyAdmin(admin)) {
    if (!admin.faculty) {
      throw new ApiError(403, "Faculty admin scope is not configured");
    }

    return {
      faculty: admin.faculty,
    };
  }

  throw new ApiError(403, "This admin account has no supported access scope");
};

const combineStudentWhere = (
  ...clauses: Prisma.studentsWhereInput[]
): Prisma.studentsWhereInput => {
  const activeClauses = clauses.filter(
    (clause) => Object.keys(clause).length > 0
  );

  return activeClauses.length > 0 ? { AND: activeClauses } : {};
};

export const getScopedPaymentWhere = (
  admin: AdminAccessScope,
  requestedScope: AdminScopeQuery = {}
): Prisma.paymentsWhereInput => {
  const studentScope = getAdminStudentScopeWhere(admin, requestedScope);

  return Object.keys(studentScope).length > 0
    ? {
        students: studentScope,
      }
    : {};
};

const getScopedReceiptWhere = (
  admin: AdminAccessScope,
  requestedScope: AdminScopeQuery = {}
): Prisma.receiptsWhereInput => {
  const studentScope = getAdminStudentScopeWhere(admin, requestedScope);

  return Object.keys(studentScope).length > 0
    ? {
        students: studentScope,
      }
    : {};
};

const getScopedConversationWhere = (
  admin: AdminAccessScope,
  requestedScope: AdminScopeQuery = {}
): Prisma.conversationsWhereInput => {
  const studentScope = getAdminStudentScopeWhere(admin, requestedScope);

  return Object.keys(studentScope).length > 0
    ? {
        students: studentScope,
      }
    : {};
};

const assertPaymentAccess = async (
  paymentId: string,
  admin: AdminAccessScope,
  requestedScope: AdminScopeQuery = {}
) => {
  const payment = await prisma.payments.findFirst({
    where: {
      id: paymentId,
      ...getScopedPaymentWhere(admin, requestedScope),
    },
    select: {
      id: true,
    },
  });

  if (!payment) {
    throw new ApiError(404, "Payment record not found");
  }
};

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

const getSupportUnreadMessageCount = async (
  admin: AdminAccessScope,
  requestedScope: AdminScopeQuery = {}
) => {
  const conversations = await prisma.conversations.findMany({
    where: {
      conversation_type: {
        in: SUPPORT_CONVERSATION_TYPES,
      },
      status: "open",
      ...getScopedConversationWhere(admin, requestedScope),
    },
    select: {
      id: true,
      admin_last_read_at: true,
    },
  });

  const counts = await Promise.all(
    conversations.map((conversation) =>
      getConversationAdminUnreadCount(
        conversation.id,
        conversation.admin_last_read_at
      )
    )
  );

  return counts.reduce((total, count) => total + count, 0);
};

export const loginAdmin = async (data: AdminLoginInput) => {
  const admin = await prisma.admins.findFirst({
    where: {
      email: data.email,
    },
  });

  if (!admin) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (!admin.is_active) {
    throw new ApiError(403, "This admin account is inactive");
  }

  const passwordMatches = await bcrypt.compare(data.password, admin.password_hash);

  if (!passwordMatches) {
    throw new ApiError(401, "Invalid email or password");
  }

  assertLoginWorkspace(admin, data);

  const token = jwt.sign(
    {
      tokenType: "admin",
      adminId: admin.id,
      email: admin.email,
      role: admin.admin_role,
      faculty: admin.faculty,
      department: admin.department,
    },
    env.jwtSecret,
    { expiresIn: "12h" }
  );

  const updatedAdmin = await prisma.admins.update({
    where: {
      id: admin.id,
    },
    data: {
      last_login_at: new Date(),
    },
    select: adminPublicSelect,
  });

  return {
    token,
    admin: updatedAdmin,
  };
};

export const getOverview = async (
  admin: AdminAccessScope,
  requestedScope: AdminScopeQuery = {}
) => {
  const studentScopeWhere = getAdminStudentScopeWhere(admin, requestedScope);
  const paymentScopeWhere = getScopedPaymentWhere(admin, requestedScope);
  const receiptScopeWhere = getScopedReceiptWhere(admin, requestedScope);
  const conversationScopeWhere = getScopedConversationWhere(
    admin,
    requestedScope
  );

  const [
    totalStudents,
    activeStudents,
    inactiveStudents,
    feeStatusCounts,
    successfulFeePayments,
    pendingFeePayments,
    schoolReceiptsCount,
    newsCount,
    resourcesCount,
    calendarEntriesCount,
    openSupportConversations,
    unreadSupportMessages,
    recentStudents,
    recentPayments,
    recentNews,
  ] = await Promise.all([
    prisma.students.count({
      where: studentScopeWhere,
    }),
    prisma.students.count({
      where: combineStudentWhere(studentScopeWhere, { is_active: true }),
    }),
    prisma.students.count({
      where: combineStudentWhere(studentScopeWhere, { is_active: false }),
    }),
    prisma.students.groupBy({
      by: ["fee_status"],
      where: studentScopeWhere,
      _count: {
        _all: true,
      },
    }),
    prisma.payments.aggregate({
      where: {
        payment_type: "fee",
        status: "successful",
        ...paymentScopeWhere,
      },
      _count: {
        id: true,
      },
      _sum: {
        amount: true,
      },
    }),
    prisma.payments.count({
      where: {
        payment_type: "fee",
        status: "pending",
        ...paymentScopeWhere,
      },
    }),
    prisma.receipts.count({
      where: {
        receipt_type: "school_fee",
        ...receiptScopeWhere,
      },
    }),
    prisma.news.count(),
    prisma.resources.count(),
    prisma.calendar_entries.count(),
    prisma.conversations.count({
      where: {
        conversation_type: {
          in: SUPPORT_CONVERSATION_TYPES,
        },
        status: "open",
        ...conversationScopeWhere,
      },
    }),
    getSupportUnreadMessageCount(admin, requestedScope),
    prisma.students.findMany({
      where: studentScopeWhere,
      select: studentSummarySelect,
      orderBy: {
        created_at: "desc",
      },
      take: 5,
    }),
    prisma.payments.findMany({
      where: {
        payment_type: "fee",
        ...paymentScopeWhere,
      },
      include: {
        students: {
          select: studentSummarySelect,
        },
        receipts: true,
      },
      orderBy: {
        created_at: "desc",
      },
      take: 5,
    }),
    prisma.news.findMany({
      select: {
        id: true,
        title: true,
        category: true,
        published_at: true,
      },
      orderBy: [{ published_at: "desc" }, { created_at: "desc" }],
      take: 5,
    }),
  ]);

  return {
    students: {
      total: totalStudents,
      active: activeStudents,
      inactive: inactiveStudents,
      feeStatus: feeStatusCounts.reduce<Record<string, number>>((acc, item) => {
        acc[item.fee_status] = item._count._all;
        return acc;
      }, {}),
    },
    schoolPayments: {
      successfulCount: successfulFeePayments._count.id,
      successfulAmount: Number(successfulFeePayments._sum.amount ?? 0),
      pendingCount: pendingFeePayments,
    },
    schoolReceipts: {
      total: schoolReceiptsCount,
    },
    content: {
      news: newsCount,
      resources: resourcesCount,
      calendarEntries: calendarEntriesCount,
    },
    support: {
      openConversations: openSupportConversations,
      unreadMessages: unreadSupportMessages,
    },
    recent: {
      students: recentStudents,
      payments: recentPayments,
      news: recentNews,
    },
  };
};

export const listStudents = async (
  query: ListStudentsQuery,
  admin: AdminAccessScope
) => {
  const requestedScope = {
    faculty: query.faculty,
    department: query.department,
  };

  return prisma.students.findMany({
    where: combineStudentWhere(getAdminStudentScopeWhere(admin, requestedScope), {
      ...(query.search
        ? {
            OR: [
              { full_name: { contains: query.search, mode: "insensitive" } },
              { matricule: { contains: query.search, mode: "insensitive" } },
              { phone_number: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(query.level ? { level: query.level } : {}),
      ...(query.fee_status ? { fee_status: query.fee_status } : {}),
      ...(query.is_active !== undefined ? { is_active: query.is_active } : {}),
    }),
    select: adminStudentSelect,
    orderBy: {
      full_name: "asc",
    },
    skip: query.offset ?? 0,
    take: query.limit ?? 100,
  });
};

type CountBucket = {
  total: number;
  active: number;
  inactive: number;
  paid: number;
  partial: number;
  notPaid: number;
};

const createCountBucket = (): CountBucket => ({
  total: 0,
  active: 0,
  inactive: 0,
  paid: 0,
  partial: 0,
  notPaid: 0,
});

const addStudentToBucket = (
  bucket: CountBucket,
  student: {
    is_active: boolean;
    fee_status: string;
  }
) => {
  bucket.total++;

  if (student.is_active) {
    bucket.active++;
  } else {
    bucket.inactive++;
  }

  if (student.fee_status === "PAID") {
    bucket.paid++;
  } else if (student.fee_status === "PARTIAL") {
    bucket.partial++;
  } else {
    bucket.notPaid++;
  }
};

export const getStudentDistribution = async (
  query: StudentDistributionQuery,
  admin: AdminAccessScope
) => {
  const studentScopeWhere = getAdminStudentScopeWhere(admin, query);
  const students = await prisma.students.findMany({
    where: studentScopeWhere,
    select: {
      faculty: true,
      department: true,
      is_active: true,
      fee_status: true,
    },
  });

  const facultyBuckets = new Map<string, CountBucket>();
  const total = createCountBucket();

  students.forEach((student) => {
    const faculty = student.faculty.trim() || "Unassigned";
    const bucket = facultyBuckets.get(faculty) ?? createCountBucket();

    addStudentToBucket(bucket, student);
    addStudentToBucket(total, student);
    facultyBuckets.set(faculty, bucket);
  });

  const faculties = Array.from(facultyBuckets.entries())
    .map(([name, bucket]) => ({
      name,
      ...bucket,
    }))
    .sort((left, right) => right.total - left.total || left.name.localeCompare(right.name));

  const selectedFaculty =
    admin.department || admin.faculty || query.faculty
      ? admin.faculty ?? query.faculty ?? faculties[0]?.name ?? "University of Buea"
      : "University of Buea";
  const departmentBuckets = new Map<string, CountBucket>();

  students
    .filter((student) =>
      selectedFaculty === "University of Buea"
        ? true
        : student.faculty === selectedFaculty
    )
    .forEach((student) => {
      const department = student.department.trim() || "Unassigned";
      const bucket = departmentBuckets.get(department) ?? createCountBucket();

      addStudentToBucket(bucket, student);
      departmentBuckets.set(department, bucket);
    });

  const departments = Array.from(departmentBuckets.entries())
    .map(([name, bucket]) => ({
      name,
      ...bucket,
    }))
    .sort((left, right) => right.total - left.total || left.name.localeCompare(right.name));

  return {
    selectedFaculty,
    total,
    faculties,
    departments,
  };
};

export const listSchoolPayments = async (
  query: ListSchoolPaymentsQuery,
  admin: AdminAccessScope
) => {
  const requestedScope = {
    faculty: query.faculty,
    department: query.department,
  };

  return prisma.payments.findMany({
    where: {
      payment_type: "fee",
      ...getScopedPaymentWhere(admin, requestedScope),
      ...(query.search
        ? {
            reference_id: {
              contains: query.search,
              mode: "insensitive",
            },
          }
        : {}),
      ...(query.academic_year ? { academic_year: query.academic_year } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.payment_method ? { payment_method: query.payment_method } : {}),
    },
    include: {
      students: {
        select: studentSummarySelect,
      },
      receipts: true,
    },
    orderBy: {
      created_at: "desc",
    },
    skip: query.offset ?? 0,
    take: query.limit ?? 100,
  });
};

export const listSchoolPaymentsMissingReceipts = async (
  query: ListSchoolPaymentsQuery,
  admin: AdminAccessScope
) => {
  const requestedScope = {
    faculty: query.faculty,
    department: query.department,
  };

  return prisma.payments.findMany({
    where: {
      payment_type: "fee",
      status: "successful",
      ...getScopedPaymentWhere(admin, requestedScope),
      receipts: {
        none: {},
      },
      ...(query.search
        ? {
            reference_id: {
              contains: query.search,
              mode: "insensitive",
            },
          }
        : {}),
      ...(query.academic_year ? { academic_year: query.academic_year } : {}),
      ...(query.payment_method ? { payment_method: query.payment_method } : {}),
    },
    include: {
      students: {
        select: studentSummarySelect,
      },
      receipts: true,
    },
    orderBy: {
      paid_at: "desc",
    },
    skip: query.offset ?? 0,
    take: query.limit ?? 100,
  });
};

export const syncSchoolPaymentWithProvider = async (
  paymentId: string,
  admin: AdminAccessScope,
  requestedScope: AdminScopeQuery = {}
) => {
  await assertPaymentAccess(paymentId, admin, requestedScope);

  return paymentService.syncSchoolFeePaymentWithProvider(paymentId);
};

export const generateSchoolPaymentReceipt = async (
  paymentId: string,
  admin: AdminAccessScope,
  requestedScope: AdminScopeQuery = {}
) => {
  await assertPaymentAccess(paymentId, admin, requestedScope);

  return paymentService.generateSchoolFeeReceiptForPayment(paymentId);
};

export const deleteSchoolPayment = async (
  paymentId: string,
  admin: AdminAccessScope,
  requestedScope: AdminScopeQuery = {}
) => {
  await assertPaymentAccess(paymentId, admin, requestedScope);

  return paymentService.deleteAdminSchoolFeePayment(paymentId);
};

export const listSchoolReceipts = async (
  query: ListSchoolReceiptsQuery,
  admin: AdminAccessScope
) => {
  const requestedScope = {
    faculty: query.faculty,
    department: query.department,
  };

  return prisma.receipts.findMany({
    where: {
      receipt_type: "school_fee",
      ...getScopedReceiptWhere(admin, requestedScope),
      ...(query.search
        ? {
            receipt_number: {
              contains: query.search,
              mode: "insensitive",
            },
          }
        : {}),
      ...(query.student_id ? { student_id: query.student_id } : {}),
      ...(query.academic_year ? { academic_year: query.academic_year } : {}),
    },
    include: {
      payments: {
        select: {
          reference_id: true,
          payment_type: true,
          payment_method: true,
          phone_number: true,
          fee_installment: true,
          paid_at: true,
        },
      },
      students: {
        select: studentSummarySelect,
      },
    },
    orderBy: {
      issued_at: "desc",
    },
    skip: query.offset ?? 0,
    take: query.limit ?? 100,
  });
};

export const listNewsForAdmin = async (
  limit = 100,
  offset = 0,
  category?: NewsCategory
) => {
  return prisma.news.findMany({
    select: adminNewsSelect,
    where: category ? { category } : undefined,
    orderBy: [{ published_at: "desc" }, { created_at: "desc" }],
    skip: offset,
    take: limit,
  });
};

export const listSupportConversations = async (
  query: ListSupportConversationsQuery,
  admin: AdminAccessScope
) => {
  const requestedScope = {
    faculty: query.faculty,
    department: query.department,
  };

  const conversations = await prisma.conversations.findMany({
    where: {
      conversation_type: {
        in: SUPPORT_CONVERSATION_TYPES,
      },
      ...getScopedConversationWhere(admin, requestedScope),
      ...(query.status ? { status: query.status } : {}),
      ...(query.assigned_admin_id
        ? { assigned_admin_id: query.assigned_admin_id }
        : {}),
      ...(query.search
        ? {
            title: {
              contains: query.search,
              mode: "insensitive",
            },
          }
        : {}),
    },
    include: {
      students: {
        select: studentSummarySelect,
      },
      admins: {
        select: adminPublicSelect,
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
          created_at: "desc",
        },
        take: 1,
      },
    },
    orderBy: {
      last_message_at: "desc",
    },
    take: query.limit ?? 100,
  });

  return Promise.all(
    conversations.map(async (conversation) => ({
      ...conversation,
      unreadForAdmin: await getConversationAdminUnreadCount(
        conversation.id,
        conversation.admin_last_read_at
      ),
      lastMessage: conversation.messages[0] ?? null,
    }))
  );
};

export const getSupportConversationById = async (
  conversationId: string,
  admin: AdminAccessScope
) => {
  const conversation = await prisma.conversations.findFirst({
    where: {
      id: conversationId,
      conversation_type: {
        in: SUPPORT_CONVERSATION_TYPES,
      },
      ...getScopedConversationWhere(admin),
    },
    include: {
      students: {
        select: studentSummarySelect,
      },
      admins: {
        select: adminPublicSelect,
      },
      complaints: true,
      messages: {
        orderBy: {
          created_at: "asc",
        },
      },
    },
  });

  if (!conversation) {
    throw new ApiError(404, "Support conversation not found");
  }

  await prisma.conversations.update({
    where: {
      id: conversation.id,
    },
    data: {
      admin_last_read_at: conversation.last_message_at,
    },
  });

  return {
    ...conversation,
    admin_last_read_at: conversation.last_message_at,
    unreadForAdmin: 0,
  };
};

export const deleteSupportConversation = async (
  conversationId: string,
  admin: AdminAccessScope
) => {
  const conversation = await prisma.conversations.findFirst({
    where: {
      id: conversationId,
      conversation_type: {
        in: SUPPORT_CONVERSATION_TYPES,
      },
      ...getScopedConversationWhere(admin),
    },
    select: {
      id: true,
      complaint_id: true,
    },
  });

  if (!conversation) {
    throw new ApiError(404, "Support conversation not found");
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.conversations.delete({
      where: {
        id: conversation.id,
      },
    });

    if (conversation.complaint_id) {
      await transaction.complaints.delete({
        where: {
          id: conversation.complaint_id,
        },
      });
    }
  });

  return {
    id: conversation.id,
    deleted: true,
  };
};

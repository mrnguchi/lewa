import { apiRequest } from "./api";

type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  data: T;
};

export type AdminUser = {
  id: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  faculty: string | null;
  department: string | null;
  admin_role: string;
  is_active: boolean;
  last_login_at: string | null;
};

export type AdminScopeParams = {
  faculty?: string;
  department?: string;
};

export type StudentSummary = {
  id: string;
  full_name: string;
  matricule: string;
  phone_number: string;
  faculty: string;
  department: string;
  level: number;
  profile_image_url: string | null;
  fee_status: string;
  is_active: boolean;
};

type CountBucket = {
  total: number;
  active: number;
  inactive: number;
  paid: number;
  partial: number;
  notPaid: number;
};

export type StudentDistributionItem = CountBucket & {
  name: string;
};

export type AdminStudentDistribution = {
  selectedFaculty: string;
  total: CountBucket;
  faculties: StudentDistributionItem[];
  departments: StudentDistributionItem[];
};

export type AdminSchoolPayment = {
  id: string;
  student_id?: string;
  reference_id: string;
  provider_reference?: string | null;
  payment_type?: string;
  amount: number | string;
  payment_method: string;
  fee_installment: string | null;
  phone_number?: string;
  status: string;
  academic_year: string;
  paid_at: string | null;
  created_at: string;
  updated_at?: string;
  students: StudentSummary;
  receipts?: {
    id: string;
    receipt_number: string;
  }[];
};

export type AdminSchoolReceipt = {
  id: string;
  payment_id: string;
  student_id: string;
  receipt_number: string;
  receipt_type: string;
  amount: number | string;
  academic_year: string;
  issued_at: string;
  file_url: string | null;
  created_at: string;
  updated_at: string;
  payments: {
    reference_id: string;
    payment_type: string;
    payment_method: string;
    phone_number: string;
    fee_installment: string | null;
    paid_at: string | null;
  };
  students: StudentSummary;
};

type RecentPayment = AdminSchoolPayment;

type RecentNews = {
  id: string;
  title: string;
  category: string;
  published_at: string;
};

export const ADMIN_NEWS_CATEGORIES = [
  "Tech",
  "Business",
  "Sports",
  "Events",
  "Announcement",
  "Lost & Found",
] as const;

export type AdminNewsCategory = (typeof ADMIN_NEWS_CATEGORIES)[number];

export type AdminNewsArticle = {
  id: string;
  title: string;
  intro: string;
  description: string;
  category: AdminNewsCategory | string;
  image_url: string;
  lewa_logo_url: string | null;
  published_at: string;
  created_at: string;
  updated_at: string;
};

export type CreateAdminNewsInput = {
  title: string;
  intro: string;
  description: string;
  category: AdminNewsCategory;
  image_url: string;
  published_at?: string;
};

type AdminUploadSignature = {
  cloudName: string;
  apiKey: string;
  uploadPreset: string;
  timestamp: number;
  signature: string;
  publicId: string;
  resourceType: "image";
  uploadUrl: string;
};

export type AdminOverview = {
  students: {
    total: number;
    active: number;
    inactive: number;
    feeStatus: Record<string, number>;
  };
  schoolPayments: {
    successfulCount: number;
    successfulAmount: number;
    pendingCount: number;
  };
  schoolReceipts: {
    total: number;
  };
  content: {
    news: number;
    resources: number;
    calendarEntries: number;
  };
  support: {
    openConversations: number;
    unreadMessages: number;
  };
  recent: {
    students: StudentSummary[];
    payments: RecentPayment[];
    news: RecentNews[];
  };
};

export type AdminSupportMessage = {
  id: string;
  conversation_id: string;
  sender_type: string;
  message_text: string | null;
  file_url: string | null;
  created_at: string;
  sender_student_id: string | null;
  sender_admin_id: string | null;
  message_type: string;
  metadata?: unknown;
};

export type AdminSupportConversation = {
  id: string;
  student_id: string;
  conversation_type: string;
  complaint_id: string | null;
  created_at: string;
  updated_at: string;
  title: string | null;
  status: string;
  source: string;
  assigned_admin_id: string | null;
  last_message_at: string;
  student_last_read_at?: string | null;
  admin_last_read_at?: string | null;
  students: StudentSummary;
  admins?: AdminUser | null;
  complaints?: {
    id: string;
    title: string | null;
    description: string;
    status: string;
    created_at: string;
    updated_at: string;
  } | null;
  messages: AdminSupportMessage[];
  lastMessage?: AdminSupportMessage | null;
  unreadForAdmin: number;
};

export async function loginAdmin(
  email: string,
  password: string,
  options: {
    centralAdministration?: boolean;
    faculty?: string;
    department?: string;
  } = {},
) {
  const response = await apiRequest<
    ApiEnvelope<{ token: string; admin: AdminUser }>
  >("/api/admin/auth/login", {
    method: "POST",
    body: {
      email,
      password,
      centralAdministration: options.centralAdministration ?? false,
      faculty: options.faculty,
      department: options.department,
    },
  });

  return response.data;
}

export async function getCurrentAdmin(token: string) {
  const response = await apiRequest<ApiEnvelope<AdminUser>>(
    "/api/admin/auth/me",
    {
      token,
    },
  );

  return response.data;
}

export async function getAdminOverview(
  token: string,
  scope: AdminScopeParams = {},
) {
  const response = await apiRequest<ApiEnvelope<AdminOverview>>(
    `/api/admin/overview${toQueryString(scope)}`,
    {
      token,
    },
  );

  return response.data;
}

export async function getAdminNews(
  token: string,
  params: {
    category?: AdminNewsCategory;
    limit?: number;
    offset?: number;
  } = {},
) {
  const response = await apiRequest<ApiEnvelope<AdminNewsArticle[]>>(
    `/api/admin/news${toQueryString(params)}`,
    {
      token,
    },
  );

  return response.data;
}

export async function createAdminNews(
  token: string,
  payload: CreateAdminNewsInput,
) {
  const response = await apiRequest<ApiEnvelope<AdminNewsArticle>>(
    "/api/admin/news",
    {
      body: payload,
      method: "POST",
      token,
    },
  );

  return response.data;
}

export async function uploadAdminNewsPoster(token: string, file: File) {
  const signatureResponse = await apiRequest<ApiEnvelope<AdminUploadSignature>>(
    "/api/admin/uploads/news-poster-signature",
    {
      body: {
        filename: file.name,
      },
      method: "POST",
      token,
    },
  );

  const signature = signatureResponse.data;
  const formData = new FormData();

  formData.append("file", file);
  formData.append("api_key", signature.apiKey);
  formData.append("timestamp", String(signature.timestamp));
  formData.append("signature", signature.signature);
  formData.append("upload_preset", signature.uploadPreset);
  formData.append("public_id", signature.publicId);

  const uploadResponse = await fetch(signature.uploadUrl, {
    body: formData,
    method: "POST",
  });
  const uploadPayload = await uploadResponse.json();

  if (!uploadResponse.ok || !uploadPayload.secure_url) {
    throw new Error("Poster upload failed");
  }

  return uploadPayload.secure_url as string;
}

export async function getAdminStudentDistribution(
  token: string,
  scope: AdminScopeParams = {},
) {
  const response = await apiRequest<ApiEnvelope<AdminStudentDistribution>>(
    `/api/admin/students/distribution${toQueryString(scope)}`,
    {
      token,
    },
  );

  return response.data;
}

function toQueryString(
  params: Record<string, string | number | boolean | undefined>,
) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      query.set(key, String(value));
    }
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

export async function getAdminStudents(
  token: string,
  params: {
    search?: string;
    faculty?: string;
    department?: string;
    level?: number;
    fee_status?: string;
    is_active?: boolean;
    limit?: number;
    offset?: number;
  } = {},
) {
  const response = await apiRequest<ApiEnvelope<StudentSummary[]>>(
    `/api/admin/students${toQueryString(params)}`,
    {
      token,
    },
  );

  return response.data;
}

export async function getAdminSchoolPayments(
  token: string,
  params: {
    search?: string;
    faculty?: string;
    department?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {},
) {
  const response = await apiRequest<ApiEnvelope<AdminSchoolPayment[]>>(
    `/api/admin/payments${toQueryString(params)}`,
    {
      token,
    },
  );

  return response.data;
}

export async function getAdminSchoolReceipts(
  token: string,
  params: {
    search?: string;
    faculty?: string;
    department?: string;
    academic_year?: string;
    student_id?: string;
    limit?: number;
    offset?: number;
  } = {},
) {
  const response = await apiRequest<ApiEnvelope<AdminSchoolReceipt[]>>(
    `/api/admin/receipts${toQueryString(params)}`,
    {
      token,
    },
  );

  return response.data;
}

export async function getAdminPaymentsMissingReceipts(
  token: string,
  scope: AdminScopeParams = {},
) {
  const response = await apiRequest<ApiEnvelope<AdminSchoolPayment[]>>(
    `/api/admin/payments/missing-receipts${toQueryString({
      ...scope,
      limit: 100,
    })}`,
    {
      token,
    },
  );

  return response.data;
}

export async function syncAdminPaymentWithProvider(
  token: string,
  paymentId: string,
) {
  const response = await apiRequest<ApiEnvelope<AdminSchoolPayment>>(
    `/api/admin/payments/${paymentId}/sync-provider`,
    {
      method: "POST",
      token,
    },
  );

  return response.data;
}

export async function generateAdminPaymentReceipt(
  token: string,
  paymentId: string,
) {
  const response = await apiRequest<
    ApiEnvelope<{
      payment: AdminSchoolPayment;
      receipt: {
        id: string;
        receipt_number: string;
      };
    }>
  >(`/api/admin/payments/${paymentId}/receipt`, {
    method: "POST",
    token,
  });

  return response.data;
}

export async function deleteAdminSchoolPayment(
  token: string,
  paymentId: string,
) {
  const response = await apiRequest<
    ApiEnvelope<{
      id: string;
      reference: string;
      deleted: boolean;
    }>
  >(`/api/admin/payments/${paymentId}`, {
    method: "DELETE",
    token,
  });

  return response.data;
}

export async function getAdminSupportConversations(
  token: string,
  scope: AdminScopeParams = {},
) {
  const response = await apiRequest<ApiEnvelope<AdminSupportConversation[]>>(
    `/api/admin/support/conversations${toQueryString({
      ...scope,
      limit: 50,
    })}`,
    {
      token,
    },
  );

  return response.data;
}

export async function getAdminSupportConversation(
  token: string,
  conversationId: string,
) {
  const response = await apiRequest<ApiEnvelope<AdminSupportConversation>>(
    `/api/admin/support/conversations/${conversationId}`,
    {
      token,
    },
  );

  return response.data;
}

export async function replyToAdminSupportConversation(
  token: string,
  conversationId: string,
  messageText: string,
) {
  const response = await apiRequest<ApiEnvelope<AdminSupportConversation>>(
    `/api/admin/support/conversations/${conversationId}/replies`,
    {
      method: "POST",
      token,
      body: {
        message_text: messageText,
      },
    },
  );

  return response.data;
}

export async function deleteAdminSupportConversation(
  token: string,
  conversationId: string,
) {
  const response = await apiRequest<
    ApiEnvelope<{
      id: string;
      deleted: boolean;
    }>
  >(`/api/admin/support/conversations/${conversationId}`, {
    method: "DELETE",
    token,
  });

  return response.data;
}

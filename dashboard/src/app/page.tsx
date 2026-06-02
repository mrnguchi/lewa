"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Image from "next/image";
import {
  ArrowDownToLine,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Eye,
  EyeOff,
  GraduationCap,
  LoaderCircle,
  MessageSquareText,
  MoreHorizontal,
  Plus,
  ReceiptText,
  Search,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";

import {
  AdminOverview,
  AdminSchoolPayment,
  AdminStudentDistribution,
  AdminSupportConversation,
  AdminUser,
  deleteAdminSchoolPayment,
  deleteAdminSupportConversation,
  generateAdminPaymentReceipt,
  getAdminOverview,
  getAdminPaymentsMissingReceipts,
  getAdminSchoolPayments,
  getAdminStudentDistribution,
  getAdminSupportConversation,
  getAdminSupportConversations,
  getCurrentAdmin,
  loginAdmin,
  replyToAdminSupportConversation,
  syncAdminPaymentWithProvider,
} from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import { FeeStatusDonut, PaymentStatusChart } from "@/features/admin/components/dashboard/Charts";
import { Sidebar } from "@/features/admin/components/layout/Sidebar";
import { Topbar } from "@/features/admin/components/layout/Topbar";
import { NewsWorkspace } from "@/features/admin/components/news/NewsWorkspace";
import { RecordsWorkspace } from "@/features/admin/components/records/RecordsWorkspace";
import { useAdminRealtime } from "@/features/admin/hooks/useAdminRealtime";
import {
  DeleteRecordModal,
  PaymentActionModal,
  PaymentDetailsModal,
} from "@/features/admin/components/modals/PaymentModals";
import { SupportChatModal } from "@/features/admin/components/modals/SupportChatModal";
import {
  PanelTitle,
  StatusPill,
  StudentAvatar,
  ToolbarButton,
} from "@/features/admin/components/ui/AdminPrimitives";
import { CustomDropdown } from "@/features/admin/components/ui/CustomDropdown";
import {
  feeStatusMeta,
  GENERAL_UB_SCOPE_VALUE,
  quickActions,
  sidebarSections,
} from "@/features/admin/constants/dashboard";
import {
  UB_FACULTY_DEPARTMENTS,
  UB_FACULTY_OPTIONS,
} from "@/features/admin/constants/ub-academics";
import {
  DEFAULT_DASHBOARD_SCOPE,
  DashboardScope,
  PaymentModalMode,
  RecentActivityFilter,
  RecentDeleteTarget,
} from "@/features/admin/types";
import {
  getDashboardScopeLabel,
  toAdminScopeParams,
} from "@/features/admin/utils/admin-scope";
import {
  formatMoney,
  formatNumber,
  formatShortDate,
  formatStatusLabel,
  getGreeting,
  getPercent,
} from "@/features/admin/utils/formatters";
import { getOfficialDepartmentRows } from "@/features/admin/utils/student-distribution";
import {
  getSupportPreview,
  getSupportTitle,
} from "@/features/admin/utils/support";

const TOKEN_STORAGE_KEY = "lewa_admin_token";
const TOKEN_STORAGE_EVENT = "lewa-admin-token-change";

const SCHOOL_SCOPE_LOGOS = {
  cot: {
    alt: "College of Technology",
    src: "/assets/cot-logo.jpeg",
  },
  fet: {
    alt: "Faculty of Engineering and Technology",
    src: "/assets/fet-logo.jpeg",
  },
  ub: {
    alt: "University of Buea",
    src: "/assets/ub-circular.png",
  },
} as const;

const getSchoolScopeLogo = (faculty?: string | null) => {
  const normalizedFaculty = faculty?.toLowerCase() ?? "";

  if (
    normalizedFaculty.includes("college of technology") ||
    normalizedFaculty.includes("(cot)") ||
    normalizedFaculty === "cot"
  ) {
    return SCHOOL_SCOPE_LOGOS.cot;
  }

  if (
    normalizedFaculty.includes("faculty of engineering and technology") ||
    normalizedFaculty.includes("(fet)") ||
    normalizedFaculty === "fet"
  ) {
    return SCHOOL_SCOPE_LOGOS.fet;
  }

  return SCHOOL_SCOPE_LOGOS.ub;
};

type AdminWorkspaceTab =
  | "dashboard"
  | "students"
  | "payments"
  | "receipts"
  | "news"
  | "support";
type ReportPeriod = "daily" | "weekly" | "monthly" | "yearly";

const sidebarTabByLabel: Record<string, AdminWorkspaceTab> = {
  Dashboard: "dashboard",
  Students: "students",
  "Fee payments": "payments",
  Receipts: "receipts",
  News: "news",
  Support: "support",
};

const reportPeriodOptions: {
  description: string;
  label: string;
  value: ReportPeriod;
}[] = [
  {
    description: "Today",
    label: "Daily",
    value: "daily",
  },
  {
    description: "This week",
    label: "Weekly",
    value: "weekly",
  },
  {
    description: "This month",
    label: "Monthly",
    value: "monthly",
  },
  {
    description: "This year",
    label: "Yearly",
    value: "yearly",
  },
];

// I keep token reads behind useSyncExternalStore so localStorage stays predictable in Next.
const getStoredTokenSnapshot = () =>
  typeof window === "undefined"
    ? null
    : window.localStorage.getItem(TOKEN_STORAGE_KEY);

const getServerTokenSnapshot = () => null;

const subscribeToStoredToken = (onStoreChange: () => void) => {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener("storage", onStoreChange);
  window.addEventListener(TOKEN_STORAGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(TOKEN_STORAGE_EVENT, onStoreChange);
  };
};

const notifyStoredTokenChange = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(TOKEN_STORAGE_EVENT));
  }
};

// The page decides between auth and workspace; feature components handle the heavy UI.
export default function Home() {
  const savedToken = useSyncExternalStore(
    subscribeToStoredToken,
    getStoredTokenSnapshot,
    getServerTokenSnapshot,
  );
  const [token, setToken] = useState<string | null>(null);
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [centralAdministration, setCentralAdministration] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [dashboardScope, setDashboardScope] =
    useState<DashboardScope>(DEFAULT_DASHBOARD_SCOPE);
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({
    email: "",
    password: "",
    faculty: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const selectedFacultyDepartments = useMemo(
    () => (selectedFaculty ? UB_FACULTY_DEPARTMENTS[selectedFaculty] ?? [] : []),
    [selectedFaculty],
  );
  const loginFacultyOptions = useMemo(
    () =>
      UB_FACULTY_OPTIONS.map((faculty) => ({
        value: faculty,
        label: faculty,
      })),
    [],
  );
  const loginDepartmentOptions = useMemo(
    () => [
      {
        value: "",
        label: "Faculty workspace",
        description: "Access the whole faculty if your role allows it",
      },
      ...selectedFacultyDepartments.map((department) => ({
        value: department,
        label: department,
      })),
    ],
    [selectedFacultyDepartments],
  );

  const loadSession = useCallback(
    async (
      activeToken: string,
      scope: DashboardScope = DEFAULT_DASHBOARD_SCOPE,
    ) => {
      try {
        const [adminProfile, overviewData] = await Promise.all([
          getCurrentAdmin(activeToken),
          getAdminOverview(activeToken, toAdminScopeParams(scope)),
        ]);

        setAdmin(adminProfile);
        setOverview(overviewData);
      } catch (error) {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        notifyStoredTokenChange();
        setToken(null);
        setAdmin(null);
        setOverview(null);
        setErrorMessage(error instanceof Error ? error.message : "Session expired");
      } finally {
        setIsLoadingOverview(false);
      }
    },
    [],
  );

  const handleDashboardScopeChange = useCallback(
    async (nextScope: DashboardScope) => {
      if (!token) {
        return;
      }

      setDashboardScope(nextScope);
      setIsLoadingOverview(true);
      setErrorMessage("");
      await loadSession(token, nextScope);
    },
    [loadSession, token],
  );

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = {
      email: "",
      password: "",
      faculty: "",
    };
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      nextErrors.email = "Enter your admin email address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!password) {
      nextErrors.password = "Enter your password.";
    } else if (password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters.";
    }

    if (!centralAdministration && !selectedFaculty) {
      nextErrors.faculty = "Select your admin faculty or use central administration.";
    }

    setFormErrors(nextErrors);

    if (nextErrors.email || nextErrors.password || nextErrors.faculty) {
      return;
    }

    setIsSubmitting(true);
    setIsLoadingOverview(true);
    setErrorMessage("");

    try {
      const result = await loginAdmin(trimmedEmail, password, {
        centralAdministration,
        faculty: centralAdministration ? undefined : selectedFaculty,
        department:
          centralAdministration || !selectedDepartment
            ? undefined
            : selectedDepartment,
      });
      window.localStorage.setItem(TOKEN_STORAGE_KEY, result.token);
      notifyStoredTokenChange();
      setDashboardScope(DEFAULT_DASHBOARD_SCOPE);
      setToken(result.token);
      setAdmin(result.admin);
      await loadSession(result.token);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to log in");
      setIsLoadingOverview(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleContinueSession() {
    if (!savedToken) {
      return;
    }

    setIsSubmitting(true);
    setIsLoadingOverview(true);
    setErrorMessage("");
    setToken(savedToken);

    try {
      await loadSession(savedToken, dashboardScope);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleLogout() {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    notifyStoredTokenChange();
    setToken(null);
    setAdmin(null);
    setOverview(null);
    setPassword("");
    setCentralAdministration(false);
    setSelectedFaculty("");
    setSelectedDepartment("");
    setDashboardScope(DEFAULT_DASHBOARD_SCOPE);
    setErrorMessage("");
  }

  if (!token || !admin) {
    return (
      <main className="min-h-screen bg-[#e9edf3] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl lg:grid-cols-2">
          <section className="relative hidden min-h-full overflow-hidden bg-slate-950 text-white lg:block">
            <Image
              alt=""
              className="object-cover"
              fill
              priority
              sizes="(min-width: 1024px) 720px, 0px"
              src="/assets/login-bg1.jpeg"
            />
            <div className="absolute inset-0 bg-black/62" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/35" />

            <div className="relative flex h-full min-h-[640px] flex-col items-center justify-center p-10 text-center">
              <div className="max-w-lg">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-200">
                  Admin command center
                </p>
                <h2 className="mt-4 text-4xl font-semibold leading-tight">
                  Manage school operations from one secure workspace.
                </h2>
                <p className="mx-auto mt-5 max-w-md text-sm leading-6 text-white/75">
                  Track students, school fees, resources, academic events, news,
                  and support conversations from a dashboard built for daily
                  administration.
                </p>
              </div>

              <div className="mt-12 w-full max-w-md text-left">
                <div className="grid gap-3">
                  {[
                    {
                      label: "Students",
                      value: "Profiles, levels, fee status",
                      icon: UsersRound,
                    },
                    {
                      label: "Fees",
                      value: "School payments and receipts",
                      icon: ReceiptText,
                    },
                    {
                      label: "Support",
                      value: "Student complaints and replies",
                      icon: MessageSquareText,
                    },
                  ].map((item) => (
                    <div
                      className="flex items-center gap-3 rounded-md bg-white px-4 py-3 text-slate-950 shadow-sm"
                      key={item.label}
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-light text-primary">
                        <item.icon aria-hidden="true" size={19} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-950">
                          {item.label}
                        </p>
                        <p className="mt-0.5 text-xs leading-5 text-slate-500">
                          {item.value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="flex items-center bg-white px-6 py-10 sm:px-10 lg:px-12">
            <form
              className="mx-auto w-full max-w-sm text-center"
              onSubmit={handleLogin}
            >
              <div className="flex items-center justify-center gap-6">
                <Image
                  alt="Lewa logo"
                  className="h-20 w-auto object-contain"
                  height={96}
                  priority
                  src="/assets/lewa-logo1.png"
                  width={112}
                />
                <div className="h-16 w-px bg-slate-200" />
                <Image
                  alt="University of Buea logo"
                  className="h-32 w-32 object-contain"
                  height={144}
                  priority
                  src="/assets/UB_Logo.png"
                  width={144}
                />
              </div>

              <div className="mt-10">
                <p className="text-sm font-medium text-primary">
                  School administration
                </p>
                <h1 className="mt-2 text-3xl font-semibold text-slate-950">
                  Welcome back
                </h1>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Sign in with your Lewa admin account to manage school records.
                </p>
              </div>

              <div className="mt-8 space-y-5">
                <div className="rounded-2xl bg-slate-50 p-3 text-left">
                  <button
                    className={cn(
                      "flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-3 text-left transition",
                      centralAdministration
                        ? "bg-primary text-white shadow-sm"
                        : "bg-white text-slate-700 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.9)] hover:text-primary",
                    )}
                    onClick={() => {
                      setCentralAdministration((current) => !current);
                      setFormErrors((current) => ({ ...current, faculty: "" }));
                    }}
                    type="button"
                  >
                    <span>
                      <span className="block text-sm font-semibold">
                        Central administration
                      </span>
                      <span
                        className={cn(
                          "mt-1 block text-xs",
                          centralAdministration ? "text-white/75" : "text-slate-500",
                        )}
                      >
                        Access the full school workspace.
                      </span>
                    </span>
                    <span
                      className={cn(
                        "flex h-6 w-11 items-center rounded-full p-1 transition",
                        centralAdministration ? "bg-white/20" : "bg-slate-200",
                      )}
                    >
                      <span
                        className={cn(
                          "size-4 rounded-full bg-white shadow-sm transition",
                          centralAdministration && "translate-x-5",
                        )}
                      />
                    </span>
                  </button>

                  {!centralAdministration && (
                    <div className="mt-3 grid gap-3">
                      <label className="block">
                        <CustomDropdown
                          error={formErrors.faculty}
                          label="Faculty"
                          onChange={(nextFaculty) => {
                            setSelectedFaculty(nextFaculty);
                            setSelectedDepartment("");
                            setFormErrors((current) => ({ ...current, faculty: "" }));
                          }}
                          options={loginFacultyOptions}
                          placeholder="Select faculty"
                          value={selectedFaculty}
                        />
                      </label>

                      <label className="block">
                        <CustomDropdown
                          disabled={!selectedFaculty}
                          label="Department"
                          onChange={setSelectedDepartment}
                          options={loginDepartmentOptions}
                          placeholder={
                            selectedFaculty ? "Select department" : "Select faculty first"
                          }
                          value={
                            selectedFaculty
                              ? selectedDepartment
                              : "__select_faculty_first__"
                          }
                        />
                      </label>

                      {formErrors.faculty && (
                        <p className="text-xs font-medium text-red-600">
                          {formErrors.faculty}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <label className="block text-left">
                  <span className="text-sm font-medium text-slate-700">Email</span>
                  <input
                    aria-invalid={Boolean(formErrors.email)}
                    autoComplete="email"
                    className={cn(
                      "mt-2 h-11 w-full rounded-2xl border px-4 text-sm outline-none transition focus:ring-2",
                      formErrors.email
                        ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                        : "border-slate-200 focus:border-primary focus:ring-primary/15",
                    )}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setFormErrors((current) => ({ ...current, email: "" }));
                    }}
                    type="text"
                    value={email}
                  />
                  {formErrors.email && (
                    <p className="mt-2 text-xs font-medium text-red-600">
                      {formErrors.email}
                    </p>
                  )}
                </label>

                <label className="block text-left">
                  <span className="text-sm font-medium text-slate-700">
                    Password
                  </span>
                  <div className="relative mt-2">
                    <input
                      aria-invalid={Boolean(formErrors.password)}
                      autoComplete="current-password"
                      className={cn(
                        "h-11 w-full rounded-2xl border px-4 pr-12 text-sm outline-none transition focus:ring-2",
                        formErrors.password
                          ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                          : "border-slate-200 focus:border-primary focus:ring-primary/15",
                      )}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        setFormErrors((current) => ({ ...current, password: "" }));
                      }}
                      type={showPassword ? "text" : "password"}
                      value={password}
                    />
                    <button
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      onClick={() => setShowPassword((current) => !current)}
                      type="button"
                    >
                      {showPassword ? (
                        <EyeOff aria-hidden="true" size={17} />
                      ) : (
                        <Eye aria-hidden="true" size={17} />
                      )}
                    </button>
                  </div>
                  {formErrors.password && (
                    <p className="mt-2 text-xs font-medium text-red-600">
                      {formErrors.password}
                    </p>
                  )}
                </label>
              </div>

              {errorMessage && (
                <p className="mt-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {errorMessage}
                </p>
              )}

              <button
                className="mt-6 inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting && <LoaderCircle className="animate-spin" size={17} />}
                Sign in
              </button>

              {savedToken && (
                <button
                  className="mt-3 inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={isSubmitting}
                  onClick={handleContinueSession}
                  type="button"
                >
                  Continue session
                </button>
              )}

              <p className="mt-8 text-center text-sm text-slate-500">
                Forgot password?{" "}
                <span className="font-semibold text-primary">
                  Contact tech support
                </span>
              </p>
            </form>
          </section>
        </div>
      </main>
    );
  }

  return (
    <DashboardWorkspace
      admin={admin}
      dashboardScope={dashboardScope}
      errorMessage={errorMessage}
      isLoadingOverview={isLoadingOverview}
      onLogout={handleLogout}
      onRefreshOverview={() => loadSession(token, dashboardScope)}
      onScopeChange={handleDashboardScopeChange}
      overview={overview}
      token={token}
    />
  );
}

// Workspace state still lives together because payments, support, and scope refresh each other.
function DashboardWorkspace({
  admin,
  dashboardScope,
  errorMessage,
  isLoadingOverview,
  onLogout,
  onRefreshOverview,
  onScopeChange,
  overview,
  token,
}: {
  admin: AdminUser;
  dashboardScope: DashboardScope;
  errorMessage: string;
  isLoadingOverview: boolean;
  onLogout: () => void;
  onRefreshOverview: () => Promise<void>;
  onScopeChange: (scope: DashboardScope) => Promise<void>;
  overview: AdminOverview | null;
  token: string;
}) {
  const firstName = admin.full_name.split(" ")[0] || "Admin";
  const totalStudents = overview?.students.total ?? 0;
  const activeStudents = overview?.students.active ?? 0;
  const inactiveStudents = overview?.students.inactive ?? 0;
  const paidStudents = overview?.students.feeStatus.PAID ?? 0;
  const partialStudents = overview?.students.feeStatus.PARTIAL ?? 0;
  const unpaidStudents = overview?.students.feeStatus.NOT_PAID ?? 0;
  const feeCompletion = getPercent(paidStudents, Math.max(totalStudents, 1));
  const successfulPayments = overview?.schoolPayments.successfulCount ?? 0;
  const pendingPayments = overview?.schoolPayments.pendingCount ?? 0;
  const receiptCount = overview?.schoolReceipts.total ?? 0;
  const receiptCoverage = getPercent(receiptCount, Math.max(successfulPayments, 1));
  const missingReceiptCount = Math.max(successfulPayments - receiptCount, 0);
  const supportCount = overview?.support.openConversations ?? 0;
  const scopeLogo = getSchoolScopeLogo(dashboardScope.faculty || admin.faculty);
  const activeScopeParams = useMemo(
    () => toAdminScopeParams(dashboardScope),
    [dashboardScope],
  );
  const scopeOptions = useMemo(
    () => [
      {
        value: GENERAL_UB_SCOPE_VALUE,
        label: "General UB Data",
        description: "All faculties and school records",
      },
      ...UB_FACULTY_OPTIONS.map((faculty) => ({
        value: faculty,
        label: faculty,
        description: "Faculty records",
      })),
    ],
    [],
  );
  const [paymentModalMode, setPaymentModalMode] =
    useState<PaymentModalMode | null>(null);
  const [modalPayments, setModalPayments] = useState<AdminSchoolPayment[]>([]);
  const [isPaymentModalLoading, setIsPaymentModalLoading] = useState(false);
  const [paymentModalError, setPaymentModalError] = useState("");
  const [activePaymentActionId, setActivePaymentActionId] = useState<string | null>(
    null,
  );
  const [selectedPaymentRecord, setSelectedPaymentRecord] =
    useState<AdminSchoolPayment | null>(null);
  const [activeRecentMenuId, setActiveRecentMenuId] = useState<string | null>(null);
  const [recentActivityFilter, setRecentActivityFilter] =
    useState<RecentActivityFilter>("all");
  const [deleteTarget, setDeleteTarget] = useState<RecentDeleteTarget | null>(null);
  const [isDeletingRecord, setIsDeletingRecord] = useState(false);
  const [recentRecordsError, setRecentRecordsError] = useState("");
  const [studentDistribution, setStudentDistribution] =
    useState<AdminStudentDistribution | null>(null);
  const [isStudentDistributionLoading, setIsStudentDistributionLoading] =
    useState(false);
  const [supportThreads, setSupportThreads] = useState<AdminSupportConversation[]>(
    [],
  );
  const [selectedSupportThread, setSelectedSupportThread] =
    useState<AdminSupportConversation | null>(null);
  const [isSupportLoading, setIsSupportLoading] = useState(false);
  const [isSupportThreadLoading, setIsSupportThreadLoading] = useState(false);
  const [supportError, setSupportError] = useState("");
  const [chatDraft, setChatDraft] = useState("");
  const [isSendingSupportReply, setIsSendingSupportReply] = useState(false);
  const [showStudentProfile, setShowStudentProfile] = useState(false);
  const [activeWorkspaceTab, setActiveWorkspaceTab] =
    useState<AdminWorkspaceTab>("dashboard");
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>("monthly");
  const [showInsightModal, setShowInsightModal] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isNewsComposerOpen, setIsNewsComposerOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadStudentDistribution = async () => {
      setIsStudentDistributionLoading(true);

      try {
        const distribution = await getAdminStudentDistribution(
          token,
          activeScopeParams,
        );

        if (isMounted) {
          setStudentDistribution(distribution);
        }
      } catch {
        if (isMounted) {
          setStudentDistribution(null);
        }
      } finally {
        if (isMounted) {
          setIsStudentDistributionLoading(false);
        }
      }
    };

    void loadStudentDistribution();

    return () => {
      isMounted = false;
    };
  }, [activeScopeParams, token]);

  const loadSupportThreads = useCallback(async (options: { showLoading?: boolean } = {}) => {
    const showLoading = options.showLoading ?? true;

    if (showLoading) {
      setIsSupportLoading(true);
      setSupportError("");
    }

    try {
      const conversations = await getAdminSupportConversations(
        token,
        activeScopeParams,
      );
      setSupportThreads(conversations);
    } catch (error) {
      if (showLoading) {
        setSupportError(
          error instanceof Error ? error.message : "Unable to load support threads",
        );
      }
    } finally {
      if (showLoading) {
        setIsSupportLoading(false);
      }
    }
  }, [activeScopeParams, token]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSupportThreads({ showLoading: true });
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadSupportThreads]);

  useEffect(() => {
    if (!activeRecentMenuId) {
      return;
    }

    const closeMenu = () => {
      setActiveRecentMenuId(null);
    };

    window.addEventListener("click", closeMenu);

    return () => {
      window.removeEventListener("click", closeMenu);
    };
  }, [activeRecentMenuId]);

  const realtimeSupportAttentionCount = supportThreads.reduce(
    (total, thread) => total + thread.unreadForAdmin,
    0,
  );
  const supportAttentionCount =
    supportThreads.length > 0
      ? realtimeSupportAttentionCount
      : overview?.support.unreadMessages ?? 0;

  const upsertRealtimeSupportThread = useCallback(
    (conversation: AdminSupportConversation) => {
      setSupportThreads((currentThreads) => {
        const nextThreads = [
          conversation,
          ...currentThreads.filter((thread) => thread.id !== conversation.id),
        ];

        return nextThreads
          .sort(
            (left, right) =>
              new Date(right.last_message_at).getTime() -
              new Date(left.last_message_at).getTime(),
          )
          .slice(0, 50);
      });
    },
    [],
  );

  const handleRealtimeSupportConversation = useCallback(
    (conversation: AdminSupportConversation) => {
      setSelectedSupportThread((currentThread) =>
        currentThread?.id === conversation.id
          ? { ...currentThread, ...conversation }
          : currentThread,
      );

      // I refresh an open thread through REST so the backend also clears its unread marker.
      void getAdminSupportConversation(token, conversation.id)
        .then((freshConversation) => {
          setSelectedSupportThread((currentThread) =>
            currentThread?.id === freshConversation.id
              ? freshConversation
              : currentThread,
          );
          upsertRealtimeSupportThread(freshConversation);
        })
        .catch(() => {
          setSupportError("Unable to update live support conversation");
        });
    },
    [token, upsertRealtimeSupportThread],
  );

  useAdminRealtime({
    token,
    scope: activeScopeParams,
    selectedConversationId: selectedSupportThread?.id,
    onConversationUpdated: handleRealtimeSupportConversation,
    onRefreshOverview,
    onRefreshSupportThreads: () => loadSupportThreads({ showLoading: false }),
    onThreadUpdated: upsertRealtimeSupportThread,
  });

  const openPaymentModal = async (mode: PaymentModalMode) => {
    setPaymentModalMode(mode);
    setModalPayments([]);
    setPaymentModalError("");
    setIsPaymentModalLoading(true);

    try {
      const payments =
        mode === "pending"
          ? await getAdminSchoolPayments(token, {
              ...activeScopeParams,
              status: "pending",
              limit: 100,
            })
          : await getAdminPaymentsMissingReceipts(token, activeScopeParams);

      setModalPayments(payments);
    } catch (error) {
      setPaymentModalError(
        error instanceof Error ? error.message : "Unable to load payments",
      );
    } finally {
      setIsPaymentModalLoading(false);
    }
  };

  const closePaymentModal = () => {
    setPaymentModalMode(null);
    setModalPayments([]);
    setPaymentModalError("");
    setActivePaymentActionId(null);
  };

  const handlePaymentModalAction = async (payment: AdminSchoolPayment) => {
    if (!paymentModalMode) {
      return;
    }

    setActivePaymentActionId(payment.id);
    setPaymentModalError("");

    try {
      if (paymentModalMode === "pending") {
        const updatedPayment = await syncAdminPaymentWithProvider(token, payment.id);

        setModalPayments((currentPayments) =>
          updatedPayment.status === "pending"
            ? currentPayments.map((currentPayment) =>
                currentPayment.id === payment.id ? updatedPayment : currentPayment,
              )
            : currentPayments.filter(
                (currentPayment) => currentPayment.id !== payment.id,
              ),
        );
      } else {
        await generateAdminPaymentReceipt(token, payment.id);
        setModalPayments((currentPayments) =>
          currentPayments.filter((currentPayment) => currentPayment.id !== payment.id),
        );
      }

      await onRefreshOverview();
    } catch (error) {
      setPaymentModalError(
        error instanceof Error ? error.message : "Unable to update payment",
      );
    } finally {
      setActivePaymentActionId(null);
    }
  };

  const openPaymentRecord = async (payment: AdminSchoolPayment) => {
    setRecentRecordsError("");

    try {
      const payments = await getAdminSchoolPayments(token, {
        ...activeScopeParams,
        search: payment.reference_id,
        limit: 1,
      });

      setSelectedPaymentRecord(payments[0] ?? payment);
    } catch (error) {
      setSelectedPaymentRecord(payment);
      setRecentRecordsError(
        error instanceof Error ? error.message : "Unable to refresh payment details",
      );
    }
  };

  const openSupportThread = async (conversationId: string) => {
    setSelectedSupportThread(
      supportThreads.find((thread) => thread.id === conversationId) ?? null,
    );
    setShowStudentProfile(false);
    setSupportError("");
    setIsSupportThreadLoading(true);

    try {
      const conversation = await getAdminSupportConversation(token, conversationId);

      setSelectedSupportThread(conversation);
      setSupportThreads((currentThreads) =>
        currentThreads.map((thread) =>
          thread.id === conversation.id ? { ...thread, ...conversation } : thread,
        ),
      );
    } catch (error) {
      setSupportError(
        error instanceof Error ? error.message : "Unable to open conversation",
      );
    } finally {
      setIsSupportThreadLoading(false);
    }
  };

  const closeSupportThread = () => {
    setSelectedSupportThread(null);
    setShowStudentProfile(false);
    setChatDraft("");
  };

  const sendSupportReply = async () => {
    const trimmedMessage = chatDraft.trim();

    if (!selectedSupportThread || !trimmedMessage) {
      return;
    }

    setIsSendingSupportReply(true);
    setSupportError("");

    try {
      const conversation = await replyToAdminSupportConversation(
        token,
        selectedSupportThread.id,
        trimmedMessage,
      );

      setSelectedSupportThread(conversation);
      setChatDraft("");
      setSupportThreads((currentThreads) => {
        const remainingThreads = currentThreads.filter(
          (thread) => thread.id !== conversation.id,
        );

        return [conversation, ...remainingThreads];
      });
      await onRefreshOverview();
    } catch (error) {
      setSupportError(
        error instanceof Error ? error.message : "Unable to send reply",
      );
    } finally {
      setIsSendingSupportReply(false);
    }
  };

  const deleteRecentRecord = async () => {
    if (!deleteTarget) {
      return;
    }

    setIsDeletingRecord(true);
    setRecentRecordsError("");

    try {
      if (deleteTarget.type === "payment") {
        await deleteAdminSchoolPayment(token, deleteTarget.id);
        setSelectedPaymentRecord((currentPayment) =>
          currentPayment?.id === deleteTarget.id ? null : currentPayment,
        );
      } else {
        await deleteAdminSupportConversation(token, deleteTarget.id);
        setSelectedSupportThread((currentThread) =>
          currentThread?.id === deleteTarget.id ? null : currentThread,
        );
        await loadSupportThreads();
      }

      await onRefreshOverview();
      setDeleteTarget(null);
      setActiveRecentMenuId(null);
    } catch (error) {
      setRecentRecordsError(
        error instanceof Error ? error.message : "Unable to delete record",
      );
    } finally {
      setIsDeletingRecord(false);
    }
  };

  const metricCards = [
    {
      label: "Collected fees",
      value: `${formatMoney(overview?.schoolPayments.successfulAmount)} XAF`,
      note: `${formatNumber(successfulPayments)} successful fee payments`,
      icon: CreditCard,
      tone: "bg-[#FFF4E9] text-[#9A5A21]",
      emphasis: true,
    },
    {
      label: "Students",
      value: formatNumber(totalStudents),
      note: `${formatNumber(activeStudents)} active, ${formatNumber(inactiveStudents)} inactive`,
      icon: GraduationCap,
      tone: "bg-primary-light text-primary",
    },
    {
      label: "Receipts",
      value: formatNumber(receiptCount),
      note: `${receiptCoverage}% receipt coverage`,
      icon: ReceiptText,
      tone: "bg-slate-100 text-text-primary",
    },
    {
      label: "Support",
      value: formatNumber(supportCount),
      note:
        supportAttentionCount > 0
          ? `${formatNumber(supportAttentionCount)} need response`
          : "Open student conversations",
      icon: MessageSquareText,
      tone: "bg-red-50 text-red-700",
    },
  ];

  const feeStatusCards = [
    { status: "PAID", value: paidStudents },
    { status: "PARTIAL", value: partialStudents },
    { status: "NOT_PAID", value: unpaidStudents },
  ];

  const feePaymentStatusRows = [
    {
      label: "Successful fee payments",
      value: successfulPayments,
      tone: "bg-primary",
      helper: "Confirmed",
    },
    {
      label: "Pending payments",
      value: pendingPayments,
      tone: "bg-gold",
      helper: "Awaiting confirmation",
    },
  ];

  const recentActivityRows = useMemo(() => {
    const paymentRows =
      overview?.recent.payments.slice(0, 6).map((payment) => ({
        key: payment.id,
        type: "payment" as const,
        record: payment.reference_id,
        owner: payment.students.full_name,
        category: "Fee payment",
        date: formatShortDate(payment.created_at),
        detail: `${formatMoney(payment.amount)} XAF - ${payment.academic_year}`,
        status: formatStatusLabel(payment.status),
        timestamp: new Date(payment.created_at).getTime(),
        payment,
      })) ?? [];

    const complaintRows = supportThreads.slice(0, 6).map((thread) => ({
      key: thread.id,
      type: "complaint" as const,
      record: "Student support",
      owner: thread.students.full_name,
      category: "Complaint",
      date: formatShortDate(thread.last_message_at),
      detail: getSupportPreview(thread),
      status: thread.unreadForAdmin > 0 ? "Needs response" : formatStatusLabel(thread.status),
      timestamp: new Date(thread.last_message_at).getTime(),
      conversation: thread,
    }));

    return [...paymentRows, ...complaintRows]
      .sort((left, right) => right.timestamp - left.timestamp)
      .slice(0, 8);
  }, [overview, supportThreads]);

  const filteredRecentActivityRows = useMemo(() => {
    if (recentActivityFilter === "all") {
      return recentActivityRows;
    }

    return recentActivityRows.filter((row) =>
      recentActivityFilter === "payments"
        ? row.type === "payment"
        : row.type === "complaint",
    );
  }, [recentActivityFilter, recentActivityRows]);

  const recentActivityTabs: {
    label: string;
    value: RecentActivityFilter;
  }[] = [
    { label: "All records", value: "all" },
    { label: "Payments", value: "payments" },
    { label: "Complaints", value: "complaints" },
  ];

  const departmentRows = getOfficialDepartmentRows(
    studentDistribution,
    admin.department,
  );
  const facultyTotal =
    studentDistribution?.faculties.find(
      (faculty) => faculty.name === studentDistribution.selectedFaculty,
    ) ?? studentDistribution?.total;
  const facultyNotPaid =
    (facultyTotal?.partial ?? 0) + (facultyTotal?.notPaid ?? 0);
  const sidebarNavigation = sidebarSections.map((section) => ({
    ...section,
    items: section.items.map((item) => {
      const itemTab = sidebarTabByLabel[item.label];

      return {
        ...item,
        active: itemTab ? activeWorkspaceTab === itemTab : false,
        badge:
          item.label === "Support" && supportAttentionCount > 0
            ? formatNumber(supportAttentionCount)
            : item.badge,
        onClick: itemTab ? () => setActiveWorkspaceTab(itemTab) : undefined,
      };
    }),
  }));
  const workspaceHeader =
    activeWorkspaceTab === "dashboard"
      ? {
          eyebrow: "Dashboard",
          title: `${getGreeting()}, ${firstName}!`,
          description:
            "Review school records, fee operations, academic content, and offer support to students.",
        }
      : activeWorkspaceTab === "students"
        ? {
            eyebrow: "Students",
            title: "Student Records",
            description:
              "Review student profiles, departments, levels, and school-fee status in the selected scope.",
          }
        : activeWorkspaceTab === "payments"
          ? {
              eyebrow: "Fee payments",
              title: "Fee Payment Records",
              description:
                "Track successful, pending, and failed automatic school-fee payment records.",
            }
          : activeWorkspaceTab === "receipts"
            ? {
                eyebrow: "Receipts",
                title: "Receipt Records",
                description:
                  "Review generated fee receipts tied to successful student payments.",
              }
            : activeWorkspaceTab === "news"
              ? {
                  eyebrow: "News",
                  title: "Lewa News",
                  description:
                    "Review, schedule, and publish campus news articles for students.",
                }
              : {
                  eyebrow: "Support",
                  title: "Student Support",
                  description:
                    "Review complaint conversations and reply to students from one support workspace.",
                };

  return (
    <main className="h-[100dvh] overflow-hidden bg-background text-text-primary">
      <div
        className={cn(
          "grid h-full min-h-0 transition-[grid-template-columns] duration-300",
          isSidebarCollapsed
            ? "xl:grid-cols-[4.75rem_minmax(0,1fr)]"
            : "xl:grid-cols-[clamp(14.5rem,18vw,16.5rem)_minmax(0,1fr)]",
        )}
      >
        <Sidebar
          admin={admin}
          isCollapsed={isSidebarCollapsed}
          navigation={sidebarNavigation}
          onLogout={onLogout}
          onToggleCollapse={() =>
            setIsSidebarCollapsed((currentState) => !currentState)
          }
        />

        <section className="h-[100dvh] min-w-0 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
          <Topbar
            admin={admin}
            isScopeLoading={isLoadingOverview}
            onLogout={onLogout}
            onOpenNotificationThread={(conversationId) => {
              setActiveWorkspaceTab("support");
              void openSupportThread(conversationId);
            }}
            onScopeChange={onScopeChange}
            scope={dashboardScope}
            scopeOptions={scopeOptions}
            supportCount={supportAttentionCount}
            supportThreads={supportThreads}
          />

          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold text-text-primary">
                {workspaceHeader.eyebrow}
              </p>
              <h1 className="mt-3 text-2xl font-semibold tracking-normal text-text-primary">
                {workspaceHeader.title}
              </h1>
              <p className="mt-2 max-w-3xl text-[13px] leading-6 text-text-body">
                {workspaceHeader.description}
              </p>
            </div>

            {activeWorkspaceTab === "support" ? null : activeWorkspaceTab === "news" ? (
              <button
                className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md bg-text-primary px-4 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(31,41,51,0.12)] transition hover:-translate-y-0.5 hover:bg-primary-dark hover:shadow-[0_16px_34px_rgba(31,41,51,0.18)]"
                onClick={() => setIsNewsComposerOpen(true)}
                type="button"
              >
                <Plus aria-hidden="true" size={16} />
                Add news
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <PeriodSelector
                  onChange={setReportPeriod}
                  value={reportPeriod}
                />
                <ToolbarButton icon={ArrowDownToLine} label="Download Data" />
                <button
                  className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md bg-text-primary px-4 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(31,41,51,0.12)] transition hover:-translate-y-0.5 hover:bg-primary-dark hover:shadow-[0_16px_34px_rgba(31,41,51,0.18)]"
                  onClick={() => setShowInsightModal(true)}
                  type="button"
                >
                  <Sparkles aria-hidden="true" size={16} />
                  Generate insight
                </button>
              </div>
            )}
          </div>

          {errorMessage && (
            <p className="mt-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          )}

          {activeWorkspaceTab === "dashboard" ? (
            <>
          <section className="admin-hero mt-6 min-h-[clamp(9.5rem,21vh,12rem)] bg-text-primary text-white">
            <div className="relative z-10 grid min-h-[clamp(9.5rem,21vh,12rem)] gap-5 px-5 pb-5 pt-5 lg:grid-cols-1 lg:items-end lg:px-7 lg:pb-6 xl:grid-cols-[minmax(0,34rem)_auto]">
              <div className="max-w-[34rem] lg:self-center">
                <h2 className="max-w-[32rem] text-lg font-semibold">
                  Keep the school moving with live administrative insight.
                </h2>
                <p className="mt-2 max-w-[29rem] text-[13px] leading-6 text-white/70">
                  Track student activity, reconcile fee records, publish
                  academic updates, and respond to support requests from this
                  school-facing command center.
                </p>
              </div>
              <div className="flex flex-nowrap gap-2 lg:justify-self-start xl:justify-self-end">
                {quickActions.map((action) => (
                  <button
                    className="inline-flex h-10 min-w-[9.5rem] cursor-pointer items-center justify-between gap-3 rounded-lg bg-white/92 px-3 text-xs font-semibold text-text-primary shadow-[0_8px_18px_rgba(15,92,54,0.12)] transition duration-200 hover:-translate-y-0.5 hover:bg-primary-light hover:text-primary-dark hover:shadow-[0_10px_24px_rgba(15,92,54,0.16)]"
                    key={action.label}
                    type="button"
                  >
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      <action.icon
                        aria-hidden="true"
                        className="shrink-0 text-primary"
                        size={15}
                      />
                      {action.label}
                    </span>
                    {action.showPlus && (
                      <Plus aria-hidden="true" className="shrink-0 text-primary" size={14} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metricCards.map((card) => (
              <article
                className={cn(
                  "dashboard-card metric-card p-5",
                  card.emphasis && "metric-card-featured",
                )}
                key={card.label}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p
                      className={cn(
                        "text-sm font-medium",
                        card.emphasis ? "text-white/75" : "text-text-body",
                      )}
                    >
                      {card.label}
                    </p>
                    <p
                      className={cn(
                        "mt-3 text-2xl font-semibold",
                        card.emphasis && "text-white",
                      )}
                    >
                      {card.value}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "flex size-11 items-center justify-center rounded-md",
                      card.emphasis
                        ? "bg-white/14 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)]"
                        : card.tone,
                    )}
                  >
                    <card.icon aria-hidden="true" size={21} />
                  </div>
                </div>
                <p
                  className={cn(
                    "mt-4 text-sm",
                    card.emphasis ? "text-white/72" : "text-text-body",
                  )}
                >
                  {card.note}
                </p>
              </article>
            ))}
          </section>

          <section className="mt-5 grid gap-4 xl:grid-cols-[1.35fr_0.85fr]">
            <article className="dashboard-card p-5">
              <PanelTitle
                action="Live records"
                subtitle={
                  isLoadingOverview
                    ? "Refreshing records"
                    : "School-fee activity"
                }
                title="Fee Collection Monitor"
              />
              <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(14rem,17rem)]">
                <div className="min-w-0">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg bg-text-primary p-4 text-white shadow-[0_14px_30px_rgba(31,41,51,0.16)]">
                      <p className="text-xs font-medium text-white/70">
                        Collected fees
                      </p>
                      <p className="mt-2 text-xl font-semibold">
                        {formatMoney(overview?.schoolPayments.successfulAmount)} XAF
                      </p>
                      <p className="mt-2 text-xs leading-5 text-white/62">
                        Successful fee payments
                      </p>
                    </div>
                    <button
                      className="cursor-pointer rounded-lg bg-[#FFF4E9] p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(154,90,33,0.12)] focus:outline-none focus:ring-2 focus:ring-gold/35"
                      onClick={() => openPaymentModal("pending")}
                      type="button"
                    >
                      <p className="text-xs font-medium text-[#9A5A21]">
                        Pending payments
                      </p>
                      <p className="mt-2 text-xl font-semibold text-text-primary">
                        {formatNumber(pendingPayments)}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-[#9A5A21]">
                        Awaiting confirmation
                      </p>
                    </button>
                  </div>

                  <PaymentStatusChart rows={feePaymentStatusRows} />
                </div>

                <div className="rounded-lg bg-background p-4">
                  <p className="text-sm font-semibold">Receipt coverage</p>
                  <p className="mt-3 text-2xl font-semibold">{receiptCoverage}%</p>
                  <p className="mt-1 text-sm leading-6 text-text-body">
                    {formatNumber(receiptCount)} of {formatNumber(successfulPayments)} successful payments
                  </p>
                  <div className="mt-5 h-2 rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(receiptCoverage, 100)}%` }}
                    />
                  </div>
                  <div className="mt-4 grid gap-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-body">Receipts issued</span>
                      <span className="font-semibold">{formatNumber(receiptCount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-body">Successful payments</span>
                      <span className="font-semibold">
                        {formatNumber(successfulPayments)}
                      </span>
                    </div>
                    <button
                      className="-mx-2 mt-1 flex cursor-pointer items-center justify-between rounded-md bg-white px-2.5 py-2 text-left text-sm shadow-[0_8px_20px_rgba(31,41,51,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(31,41,51,0.09)] focus:outline-none focus:ring-2 focus:ring-primary/20"
                      onClick={() => openPaymentModal("receipt-gap")}
                      type="button"
                    >
                      <span>
                        <span className="block font-medium text-text-primary">
                          Receipt gap
                        </span>
                        <span className="mt-0.5 block text-xs text-text-body">
                          View missing receipts
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            "font-semibold",
                            missingReceiptCount > 0 ? "text-error" : "text-primary",
                          )}
                        >
                          {formatNumber(missingReceiptCount)}
                        </span>
                        <ChevronRight aria-hidden="true" className="text-text-body" size={16} />
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </article>

            <article className="dashboard-card p-5">
              <PanelTitle
                action="View report"
                subtitle="Paid, partial, and unpaid student records"
                title="Student Fee Status"
              />
              <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-center xl:flex-col xl:items-stretch 2xl:flex-row 2xl:items-center">
                <FeeStatusDonut
                  completion={feeCompletion}
                  items={feeStatusCards}
                  total={totalStudents}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-2xl font-semibold">{feeCompletion}%</p>
                  <p className="mt-1 text-sm leading-6 text-text-body">
                    {formatNumber(paidStudents)} of {formatNumber(totalStudents)} students fully cleared
                  </p>
                  <div className="mt-5 grid gap-2">
                    {feeStatusCards.map((item) => {
                      const meta = feeStatusMeta[item.status];

                      return (
                        <div
                          className="flex items-center justify-between rounded-lg bg-background px-3 py-2 text-sm"
                          key={item.status}
                        >
                          <span className="flex items-center gap-2 text-text-body">
                            <span className={cn("size-2 rounded-full", meta.dot)} />
                            {meta.label}
                          </span>
                          <span className="font-semibold">
                            {formatNumber(item.value)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </article>
          </section>

          <section className="mt-5 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <article className="dashboard-card p-5">
              <PanelTitle
                action={isStudentDistributionLoading ? "Loading" : "Live"}
                subtitle="Faculty and department records"
                title="Student Information"
              />

              <div className="mt-5 rounded-lg bg-text-primary p-4 text-white">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white/60">
                      {admin.department
                        ? "Assigned department"
                        : dashboardScope.department
                          ? "Department overview"
                          : admin.faculty
                            ? "Assigned faculty"
                            : dashboardScope.faculty
                              ? "Faculty overview"
                              : "School overview"}
                    </p>
                    <h3 className="mt-2 text-base font-semibold leading-6">
                      {getDashboardScopeLabel(dashboardScope, admin)}
                    </h3>
                  </div>
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-white p-1.5 shadow-[0_10px_24px_rgba(0,0,0,0.12)]">
                    <Image
                      alt={scopeLogo.alt}
                      className="h-full w-full object-contain"
                      height={40}
                      src={scopeLogo.src}
                      width={40}
                    />
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md bg-white/10 px-2 py-2">
                    <p className="text-lg font-semibold">
                      {formatNumber(facultyTotal?.total)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-white/62">Students</p>
                  </div>
                  <div className="rounded-md bg-white/10 px-2 py-2">
                    <p className="text-lg font-semibold">
                      {formatNumber(facultyTotal?.paid)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-white/62">Paid</p>
                  </div>
                  <div className="rounded-md bg-white/10 px-2 py-2">
                    <p className="text-lg font-semibold">
                      {formatNumber(facultyNotPaid)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-white/62">Not paid</p>
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Departments</p>
                  <p className="text-xs text-text-body">
                    {formatNumber(departmentRows.length)} listed
                  </p>
                </div>

                <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                  {departmentRows.length > 0 ? (
                    departmentRows.map((department) => {
                      const width = getPercent(
                        department.total,
                        Math.max(facultyTotal?.total ?? 0, 1),
                      );

                      return (
                        <div className="rounded-lg bg-background p-3" key={department.name}>
                          <div className="flex items-start justify-between gap-3">
                            <p className="min-w-0 text-sm font-semibold leading-5">
                              {department.name}
                            </p>
                            <span className="shrink-0 text-sm font-semibold">
                              {formatNumber(department.total)}
                            </span>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-white">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${department.total > 0 ? Math.max(width, 8) : 0}%` }}
                            />
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-body">
                            <span>{formatNumber(department.total)} students</span>
                            <span>{formatNumber(department.paid)} paid</span>
                            <span>{formatNumber(department.partial)} partial</span>
                            <span>
                              {formatNumber(department.notPaid)} not paid
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="rounded-lg bg-background px-3 py-6 text-center text-sm text-text-body">
                      Student distribution will appear after registration.
                    </p>
                  )}
                </div>
              </div>
            </article>

            <article className="dashboard-card p-5">
              <PanelTitle
                action="Live chat"
                subtitle="Student support conversations"
                title="Support Desk"
              />

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-background p-4">
                  <p className="text-2xl font-semibold">{formatNumber(supportCount)}</p>
                  <p className="mt-1 text-sm text-text-body">Open conversations</p>
                </div>
                <div className="rounded-lg bg-primary-light p-4">
                  <p className="text-2xl font-semibold text-primary-dark">
                    {formatNumber(supportAttentionCount)}
                  </p>
                  <p className="mt-1 text-sm text-primary-dark">Need response</p>
                </div>
              </div>

              {supportError && (
                <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  {supportError}
                </p>
              )}

              <div className="mt-5 max-h-[22rem] space-y-3 overflow-y-auto pr-1">
                {isSupportLoading ? (
                  <div className="flex min-h-32 items-center justify-center text-sm text-text-body">
                    <LoaderCircle className="mr-2 animate-spin" size={17} />
                    Loading support threads
                  </div>
                ) : supportThreads.length > 0 ? (
                  supportThreads.slice(0, 8).map((thread) => (
                    <button
                      className="flex w-full cursor-pointer items-start gap-3 rounded-lg bg-background p-3 text-left transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_12px_28px_rgba(31,41,51,0.08)] focus:outline-none focus:ring-2 focus:ring-primary/20"
                      key={thread.id}
                      onClick={() => openSupportThread(thread.id)}
                      type="button"
                    >
                      <span className="relative shrink-0">
                        <StudentAvatar
                          className="size-10 text-xs"
                          imageUrl={thread.students.profile_image_url}
                          name={thread.students.full_name}
                        />
                        {thread.unreadForAdmin > 0 && (
                          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-error px-1.5 py-0.5 text-center text-[10px] font-semibold text-white">
                            {formatNumber(thread.unreadForAdmin)}
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-3">
                          <span className="truncate text-sm font-semibold">
                            {getSupportTitle()}
                          </span>
                          <span className="shrink-0 text-[11px] text-text-body">
                            {formatShortDate(thread.last_message_at)}
                          </span>
                        </span>
                        <span className="mt-1 block truncate text-xs text-text-body">
                          {thread.students.full_name} - {getSupportPreview(thread)}
                        </span>
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="rounded-lg bg-background px-3 py-6 text-center text-sm text-text-body">
                    No support conversations yet.
                  </p>
                )}
              </div>
            </article>
          </section>

          <section className="mt-5 dashboard-card overflow-hidden">
            <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-base font-semibold">Recent Records</h2>
                <p className="mt-1 text-sm text-text-body">
                  Latest fee payments and student complaints.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {recentActivityTabs.map((tab) => (
                  <button
                    className={cn(
                      "h-9 cursor-pointer rounded-md px-3 text-sm font-semibold transition",
                      recentActivityFilter === tab.value
                        ? "soft-button text-primary"
                        : "bg-background text-text-body hover:bg-primary-light hover:text-primary-dark",
                    )}
                    key={tab.value}
                    onClick={() => {
                      setRecentActivityFilter(tab.value);
                      setActiveRecentMenuId(null);
                    }}
                    type="button"
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {recentRecordsError && (
              <p className="mx-5 mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {recentRecordsError}
              </p>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-[860px] w-full text-left text-sm">
                <thead className="bg-background text-xs uppercase text-text-body">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Record</th>
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 font-semibold">Category</th>
                    <th className="px-5 py-3 font-semibold">Owner</th>
                    <th className="px-5 py-3 font-semibold">Detail</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredRecentActivityRows.length > 0 ? (
                    filteredRecentActivityRows.map((row) => (
                      <tr
                        className="cursor-pointer bg-white transition hover:bg-background"
                        key={row.key}
                        onClick={() => {
                          if (row.type === "payment") {
                            void openPaymentRecord(row.payment);
                          } else {
                            void openSupportThread(row.conversation.id);
                          }
                        }}
                      >
                        <td className="max-w-[240px] truncate px-5 py-4 font-semibold">
                          {row.record}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-text-body">
                          {row.date}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          {row.category}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-text-body">
                          {row.owner}
                        </td>
                        <td className="max-w-[220px] truncate px-5 py-4 text-text-body">
                          {row.detail}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <StatusPill label={row.status} />
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="relative inline-flex">
                            <button
                              aria-label={`Open actions for ${row.record}`}
                              className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-text-body transition hover:bg-slate-100 hover:text-text-primary"
                              onClick={(event) => {
                                event.stopPropagation();
                                setActiveRecentMenuId((currentId) =>
                                  currentId === row.key ? null : row.key,
                                );
                              }}
                              type="button"
                            >
                              <MoreHorizontal aria-hidden="true" size={16} />
                            </button>

                            {activeRecentMenuId === row.key && (
                              <div className="absolute right-0 top-9 z-20 w-36 overflow-hidden rounded-lg bg-white py-1 text-left shadow-[0_18px_42px_rgba(31,41,51,0.16)] ring-1 ring-border-soft">
                                <button
                                  className="block w-full cursor-pointer px-3 py-2 text-left text-sm font-medium text-text-primary transition hover:bg-background"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setActiveRecentMenuId(null);

                                    if (row.type === "payment") {
                                      void openPaymentRecord(row.payment);
                                    } else {
                                      void openSupportThread(row.conversation.id);
                                    }
                                  }}
                                  type="button"
                                >
                                  Open
                                </button>
                                <button
                                  className="block w-full cursor-pointer px-3 py-2 text-left text-sm font-medium text-error transition hover:bg-red-50"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setActiveRecentMenuId(null);
                                    setDeleteTarget({
                                      id:
                                        row.type === "payment"
                                          ? row.payment.id
                                          : row.conversation.id,
                                      label: row.record,
                                      type: row.type,
                                    });
                                  }}
                                  type="button"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        className="px-5 py-8 text-center text-text-body"
                        colSpan={7}
                      >
                        No recent records match this view.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
            </>
          ) : activeWorkspaceTab === "support" ? (
            <SupportWorkspace
              attentionCount={supportAttentionCount}
              errorMessage={supportError}
              isLoading={isSupportLoading}
              onOpenThread={(conversationId) => void openSupportThread(conversationId)}
              openCount={supportCount}
              threads={supportThreads}
            />
          ) : activeWorkspaceTab === "news" ? (
            <NewsWorkspace
              isComposerOpen={isNewsComposerOpen}
              onCloseComposer={() => setIsNewsComposerOpen(false)}
              token={token}
            />
          ) : (
            <RecordsWorkspace
              activeTab={activeWorkspaceTab}
              admin={admin}
              onOpenPayment={(payment) => void openPaymentRecord(payment)}
              scope={activeScopeParams}
              token={token}
            />
          )}
        </section>
      </div>
      {paymentModalMode && (
        <PaymentActionModal
          actionPaymentId={activePaymentActionId}
          errorMessage={paymentModalError}
          isLoading={isPaymentModalLoading}
          mode={paymentModalMode}
          onAction={handlePaymentModalAction}
          onClose={closePaymentModal}
          payments={modalPayments}
        />
      )}
      {selectedPaymentRecord && (
        <PaymentDetailsModal
          onClose={() => setSelectedPaymentRecord(null)}
          payment={selectedPaymentRecord}
        />
      )}
      {deleteTarget && (
        <DeleteRecordModal
          isDeleting={isDeletingRecord}
          onCancel={() => {
            if (!isDeletingRecord) {
              setDeleteTarget(null);
              setRecentRecordsError("");
            }
          }}
          onConfirm={deleteRecentRecord}
          target={deleteTarget}
        />
      )}
      {selectedSupportThread && (
        <SupportChatModal
          conversation={selectedSupportThread}
          draft={chatDraft}
          errorMessage={supportError}
          isLoading={isSupportThreadLoading}
          isSending={isSendingSupportReply}
          onClose={closeSupportThread}
          onDraftChange={setChatDraft}
          onSend={sendSupportReply}
          onToggleProfile={() => setShowStudentProfile((current) => !current)}
          showStudentProfile={showStudentProfile}
        />
      )}
      {showInsightModal && (
        <InsightPreviewModal
          onClose={() => setShowInsightModal(false)}
          period={reportPeriod}
        />
      )}
    </main>
  );
}

function SupportWorkspace({
  attentionCount,
  errorMessage,
  isLoading,
  onOpenThread,
  openCount,
  threads,
}: {
  attentionCount: number;
  errorMessage: string;
  isLoading: boolean;
  onOpenThread: (conversationId: string) => void;
  openCount: number;
  threads: AdminSupportConversation[];
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredThreads = useMemo(() => {
    if (!normalizedQuery) {
      return threads;
    }

    return threads.filter((thread) => {
      const searchableText = [
        thread.students.full_name,
        thread.students.matricule,
        thread.students.department,
        thread.complaints?.title,
        thread.complaints?.description,
        getSupportPreview(thread),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [normalizedQuery, threads]);

  return (
    <section className="mt-5 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="dashboard-card p-4">
          <p className="text-xs font-medium text-text-body">Open conversations</p>
          <p className="mt-2 text-2xl font-semibold">{formatNumber(openCount)}</p>
          <p className="mt-3 text-xs text-text-body">Active support threads</p>
        </article>
        <article className="dashboard-card p-4">
          <p className="text-xs font-medium text-text-body">Need response</p>
          <p className="mt-2 text-2xl font-semibold text-primary-dark">
            {formatNumber(attentionCount)}
          </p>
          <p className="mt-3 text-xs text-text-body">Unread student messages</p>
        </article>
        <article className="dashboard-card p-4 sm:col-span-2">
          <p className="text-xs font-medium text-text-body">Support focus</p>
          <p className="mt-2 text-base font-semibold">Complaint conversations</p>
          <p className="mt-2 text-xs leading-5 text-text-body">
            Open a thread to reply, review student details, and clear unread
            support notifications.
          </p>
        </article>
      </div>

      <article className="dashboard-card overflow-hidden">
        <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold">Support conversations</h2>
            <p className="mt-1 text-sm text-text-body">
              Complaint threads submitted by students.
            </p>
          </div>

          <label className="relative w-full lg:max-w-sm">
            <span className="sr-only">Search support conversations</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-body"
              size={16}
            />
            <input
              className="h-10 w-full rounded-md bg-background pl-9 pr-3 text-sm text-text-primary outline-none shadow-[inset_0_0_0_1px_rgba(237,241,239,0.95)] transition focus:bg-white focus:shadow-[inset_0_0_0_2px_rgba(22,120,70,0.22)]"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search student, matricule, complaint..."
              type="text"
              value={query}
            />
          </label>
        </div>

        {errorMessage && (
          <p className="mx-5 mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        {isLoading ? (
          <div className="flex min-h-[22rem] items-center justify-center text-sm text-text-body">
            <LoaderCircle className="mr-2 animate-spin" size={18} />
            Loading support conversations
          </div>
        ) : filteredThreads.length > 0 ? (
          <div className="divide-y divide-[var(--border)]">
            {filteredThreads.map((thread) => (
              <button
                className="flex w-full cursor-pointer items-start gap-4 bg-white px-5 py-4 text-left transition hover:bg-background"
                key={thread.id}
                onClick={() => onOpenThread(thread.id)}
                type="button"
              >
                <span className="relative shrink-0">
                  <StudentAvatar
                    className="size-11 text-xs"
                    imageUrl={thread.students.profile_image_url}
                    name={thread.students.full_name}
                  />
                  {thread.unreadForAdmin > 0 && (
                    <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-error px-1.5 py-0.5 text-center text-[10px] font-semibold text-white">
                      {formatNumber(thread.unreadForAdmin)}
                    </span>
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {getSupportTitle()}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-text-body">
                        {thread.students.full_name} - {thread.students.matricule}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-text-body">
                      {formatShortDate(thread.last_message_at)}
                    </span>
                  </span>

                  <span className="mt-2 block truncate text-sm text-text-body">
                    {getSupportPreview(thread)}
                  </span>

                  <span className="mt-3 flex flex-wrap items-center gap-2">
                    <StatusPill
                      label={
                        thread.unreadForAdmin > 0
                          ? "Needs response"
                          : formatStatusLabel(thread.status)
                      }
                    />
                    <span className="rounded-full bg-background px-2.5 py-1 text-xs text-text-body">
                      {thread.students.department}
                    </span>
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex min-h-[22rem] items-center justify-center px-5 py-12 text-center">
            <div className="max-w-sm">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary-light text-primary">
                <MessageSquareText aria-hidden="true" size={22} />
              </div>
              <h3 className="mt-4 text-base font-semibold">
                {query ? "No conversations found" : "No support conversations"}
              </h3>
              <p className="mt-2 text-sm leading-6 text-text-body">
                {query
                  ? "Try another student name, matricule, department, or complaint keyword."
                  : "Student complaint conversations will appear here when they are submitted."}
              </p>
            </div>
          </div>
        )}
      </article>
    </section>
  );
}

function PeriodSelector({
  onChange,
  value,
}: {
  onChange: (value: ReportPeriod) => void;
  value: ReportPeriod;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectorRef = useRef<HTMLDivElement | null>(null);
  const activeOption =
    reportPeriodOptions.find((option) => option.value === value) ??
    reportPeriodOptions[2];

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const closeMenu = (event: MouseEvent) => {
      if (!selectorRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={selectorRef}>
      <button
        aria-expanded={isOpen}
        className={cn(
          "soft-button inline-flex h-10 cursor-pointer items-center gap-2 px-3 text-sm font-semibold text-text-body transition hover:text-primary hover:shadow-[0_12px_28px_rgba(22,120,70,0.14)]",
          isOpen && "text-primary shadow-[0_12px_28px_rgba(22,120,70,0.14)]",
        )}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <CalendarDays aria-hidden="true" size={16} />
        {activeOption.label}
        <ChevronDown
          aria-hidden="true"
          className={cn("transition", isOpen && "rotate-180")}
          size={14}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-40 w-44 overflow-hidden rounded-xl bg-white p-1 shadow-[0_18px_46px_rgba(31,41,51,0.16)] ring-1 ring-border-soft">
          {reportPeriodOptions.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                className={cn(
                  "flex w-full cursor-pointer items-start justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-primary-light hover:text-primary-dark",
                  isSelected && "bg-primary-light text-primary-dark",
                )}
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                type="button"
              >
                <span>
                  <span className="block font-semibold">{option.label}</span>
                  <span className="mt-0.5 block text-xs text-text-body">
                    {option.description}
                  </span>
                </span>
                {isSelected && (
                  <span className="mt-1 size-2 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InsightPreviewModal({
  onClose,
  period,
}: {
  onClose: () => void;
  period: ReportPeriod;
}) {
  const periodLabel =
    reportPeriodOptions.find((option) => option.value === period)?.label ??
    "Monthly";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/35 px-4 py-6 backdrop-blur-sm">
      <article className="dashboard-card w-full max-w-md p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex size-11 items-center justify-center rounded-lg bg-text-primary text-white">
              <Sparkles aria-hidden="true" size={20} />
            </div>
            <h2 className="mt-4 text-lg font-semibold">Generate insight</h2>
            <p className="mt-2 text-sm leading-6 text-text-body">
              The insight engine will later analyze {periodLabel.toLowerCase()} fee,
              receipt, student, and support activity to surface trends admins can
              act on.
            </p>
          </div>
          <button
            aria-label="Close insight preview"
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md bg-background text-text-body transition hover:bg-primary-light hover:text-primary"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <div className="mt-5 rounded-lg bg-background p-4">
          <p className="text-sm font-semibold">Planned insight areas</p>
          <div className="mt-3 grid gap-2 text-sm text-text-body">
            <p>Fee collection trends and department comparisons</p>
            <p>Receipt coverage and missing receipt patterns</p>
            <p>Support complaint volume and recurring student issues</p>
          </div>
        </div>

        <button
          className="mt-5 h-10 w-full cursor-pointer rounded-md bg-text-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark"
          onClick={onClose}
          type="button"
        >
          Got it
        </button>
      </article>
    </div>
  );
}

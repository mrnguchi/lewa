"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CreditCard,
  Filter,
  LoaderCircle,
  ReceiptText,
  RefreshCw,
  Search,
  X,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import {
  AdminUser,
  AdminScopeParams,
  AdminSchoolPayment,
  AdminSchoolReceipt,
  StudentSummary,
  getAdminSchoolPayments,
  getAdminSchoolReceipts,
  getAdminStudents,
} from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import {
  StatusPill,
  StudentAvatar,
} from "@/features/admin/components/ui/AdminPrimitives";
import { CustomDropdown } from "@/features/admin/components/ui/CustomDropdown";
import { UB_FACULTY_DEPARTMENTS, UB_FACULTY_OPTIONS } from "@/features/admin/constants/ub-academics";
import {
  formatMoney,
  formatNumber,
  formatShortDate,
  formatStatusLabel,
} from "@/features/admin/utils/formatters";
import type { DropdownOption } from "@/features/admin/types";
import { ReceiptRecordModal } from "./ReceiptRecordModal";
import { StudentRecordModal } from "./StudentRecordModal";

export type RecordsWorkspaceTab = "students" | "payments" | "receipts";

type StudentFilters = {
  department: string;
  faculty: string;
  feeStatus: string;
  level: string;
};

const RECORDS_PAGE_SIZE = 20;
const RECORDS_FETCH_SIZE = RECORDS_PAGE_SIZE + 1;
const EMPTY_STUDENT_FILTERS: StudentFilters = {
  department: "",
  faculty: "",
  feeStatus: "",
  level: "",
};
const ALL_FILTER_VALUE = "__all__";
const LEVEL_OPTIONS: DropdownOption[] = [
  { value: "", label: "All levels" },
  ...[200, 300, 400, 500, 600, 700].map((level) => ({
    value: String(level),
    label: `Level ${level}`,
  })),
];
const FEE_STATUS_OPTIONS: DropdownOption[] = [
  { value: "", label: "All fee statuses" },
  { value: "PAID", label: "Paid" },
  { value: "PARTIAL", label: "Partial" },
  { value: "NOT_PAID", label: "Not paid" },
];

type RecordsWorkspaceProps = {
  activeTab: RecordsWorkspaceTab;
  admin: AdminUser;
  scope: AdminScopeParams;
  token: string;
  onOpenPayment: (payment: AdminSchoolPayment) => void;
};

type SummaryCard = {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  tone: string;
};

const tabCopy: Record<
  RecordsWorkspaceTab,
  {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    emptyTitle: string;
    emptyDescription: string;
  }
> = {
  students: {
    title: "Student records",
    subtitle: "Students available within the selected admin scope.",
    searchPlaceholder: "Search name, matricule, or phone",
    emptyTitle: "No students found",
    emptyDescription:
      "Student profiles will show here once they exist in this scope.",
  },
  payments: {
    title: "Fee payment records",
    subtitle: "School-fee payment activity from the selected scope.",
    searchPlaceholder: "Search payment reference",
    emptyTitle: "No payments found",
    emptyDescription:
      "Fee payment records will show here after students start payments.",
  },
  receipts: {
    title: "Receipt records",
    subtitle: "Receipts generated from successful school-fee payments.",
    searchPlaceholder: "Search receipt number",
    emptyTitle: "No receipts found",
    emptyDescription:
      "Generated fee receipts will show here once they are available.",
  },
};

// Keep all records tabs in one place so the dashboard shell only controls navigation.
export function RecordsWorkspace({
  activeTab,
  admin,
  scope,
  token,
  onOpenPayment,
}: RecordsWorkspaceProps) {
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [payments, setPayments] = useState<AdminSchoolPayment[]>([]);
  const [receipts, setReceipts] = useState<AdminSchoolReceipt[]>([]);
  const recordsKey = `${activeTab}:${scope.faculty ?? ""}:${scope.department ?? ""}`;
  const [searchState, setSearchState] = useState({
    active: "",
    draft: "",
    key: recordsKey,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreRecords, setHasMoreRecords] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterState, setFilterState] = useState({
    applied: EMPTY_STUDENT_FILTERS,
    draft: EMPTY_STUDENT_FILTERS,
    key: recordsKey,
  });
  const [selectedStudent, setSelectedStudent] = useState<StudentSummary | null>(
    null,
  );
  const [isReceiptViewOpen, setIsReceiptViewOpen] = useState(false);
  const [selectedStudentReceipts, setSelectedStudentReceipts] = useState<
    AdminSchoolReceipt[]
  >([]);
  const [isStudentReceiptLoading, setIsStudentReceiptLoading] = useState(false);
  const [studentReceiptError, setStudentReceiptError] = useState("");
  const [selectedReceipt, setSelectedReceipt] =
    useState<AdminSchoolReceipt | null>(null);
  const filterWrapperRef = useRef<HTMLDivElement | null>(null);

  const copy = tabCopy[activeTab];
  const searchDraft = searchState.key === recordsKey ? searchState.draft : "";
  const activeSearch = searchState.key === recordsKey ? searchState.active : "";
  const draftStudentFilters =
    filterState.key === recordsKey ? filterState.draft : EMPTY_STUDENT_FILTERS;
  const activeStudentFilters =
    filterState.key === recordsKey ? filterState.applied : EMPTY_STUDENT_FILTERS;
  const role = normalizeAdminRole(admin.admin_role);
  const isCentralAdmin = ["central_admin", "super_admin"].includes(role);
  const isFacultyAdmin = role === "faculty_admin";
  const isDepartmentAdmin = role === "department_admin";
  const canFilterFaculty = activeTab === "students" && isCentralAdmin && !scope.faculty;
  const facultyForDepartmentFilter =
    scope.faculty || admin.faculty || draftStudentFilters.faculty;
  const canFilterDepartment =
    activeTab === "students" &&
    !isDepartmentAdmin &&
    Boolean(facultyForDepartmentFilter);
  const studentFilterParams = useMemo(
    () => resolveStudentFilterParams(admin, scope, activeStudentFilters),
    [activeStudentFilters, admin, scope],
  );
  const activeStudentFilterCount = getActiveStudentFilterCount(
    activeStudentFilters,
    {
      canFilterDepartment,
      canFilterFaculty,
      isFacultyAdmin,
    },
  );
  const facultyFilterOptions = useMemo(
    () => [
      { value: "", label: "All faculties" },
      ...UB_FACULTY_OPTIONS.map((faculty) => ({
        value: faculty,
        label: faculty,
      })),
    ],
    [],
  );
  const departmentFilterOptions = useMemo(() => {
    const departments =
      UB_FACULTY_DEPARTMENTS[facultyForDepartmentFilter ?? ""] ?? [];

    return [
      { value: "", label: "All departments" },
      ...departments.map((department) => ({
        value: department,
        label: department,
      })),
    ];
  }, [facultyForDepartmentFilter]);

  const activeRecordsCount =
    activeTab === "students"
      ? students.length
      : activeTab === "payments"
        ? payments.length
        : receipts.length;

  const loadRecords = useCallback(async (
    mode: "replace" | "append",
    offset: number,
  ) => {
    const isAppending = mode === "append";

    if (isAppending) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setHasMoreRecords(false);
    }

    setErrorMessage("");

    const params = {
      ...scope,
      ...(activeTab === "students" ? studentFilterParams : {}),
      search: activeSearch || undefined,
      limit: RECORDS_FETCH_SIZE,
      offset,
    };

    try {
      if (activeTab === "students") {
        const nextStudents = await getAdminStudents(token, params);
        const visibleStudents = nextStudents.slice(0, RECORDS_PAGE_SIZE);

        setStudents((currentStudents) =>
          isAppending
            ? [...currentStudents, ...visibleStudents]
            : visibleStudents,
        );
        setHasMoreRecords(nextStudents.length > RECORDS_PAGE_SIZE);
      } else if (activeTab === "payments") {
        const nextPayments = await getAdminSchoolPayments(token, params);
        const visiblePayments = nextPayments.slice(0, RECORDS_PAGE_SIZE);

        setPayments((currentPayments) =>
          isAppending
            ? [...currentPayments, ...visiblePayments]
            : visiblePayments,
        );
        setHasMoreRecords(nextPayments.length > RECORDS_PAGE_SIZE);
      } else {
        const nextReceipts = await getAdminSchoolReceipts(token, params);
        const visibleReceipts = nextReceipts.slice(0, RECORDS_PAGE_SIZE);

        setReceipts((currentReceipts) =>
          isAppending
            ? [...currentReceipts, ...visibleReceipts]
            : visibleReceipts,
        );
        setHasMoreRecords(nextReceipts.length > RECORDS_PAGE_SIZE);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load records",
      );
    } finally {
      if (isAppending) {
        setIsLoadingMore(false);
      } else {
        setIsLoading(false);
      }
    }
  }, [activeSearch, activeTab, scope, studentFilterParams, token]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRecords("replace", 0);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadRecords]);

  useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    const closeFilterMenu = (event: MouseEvent) => {
      if (!filterWrapperRef.current?.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };

    document.addEventListener("mousedown", closeFilterMenu);

    return () => {
      document.removeEventListener("mousedown", closeFilterMenu);
    };
  }, [isFilterOpen]);

  const summaryCards = useMemo(
    () => buildSummaryCards(activeTab, students, payments, receipts),
    [activeTab, students, payments, receipts],
  );

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchState({
      active: searchDraft.trim(),
      draft: searchDraft,
      key: recordsKey,
    });
  };

  const updateDraftStudentFilter = (
    key: keyof StudentFilters,
    value: string,
  ) => {
    setFilterState((currentState) => {
      const currentDraft =
        currentState.key === recordsKey
          ? currentState.draft
          : EMPTY_STUDENT_FILTERS;
      const nextDraft = {
        ...currentDraft,
        [key]: value === ALL_FILTER_VALUE ? "" : value,
      };

      if (key === "faculty") {
        nextDraft.department = "";
      }

      return {
        applied:
          currentState.key === recordsKey
            ? currentState.applied
            : EMPTY_STUDENT_FILTERS,
        draft: nextDraft,
        key: recordsKey,
      };
    });
  };

  const applyStudentFilters = () => {
    setFilterState({
      applied: draftStudentFilters,
      draft: draftStudentFilters,
      key: recordsKey,
    });
    setIsFilterOpen(false);
  };

  const clearStudentFilters = () => {
    setFilterState({
      applied: EMPTY_STUDENT_FILTERS,
      draft: EMPTY_STUDENT_FILTERS,
      key: recordsKey,
    });
    setIsFilterOpen(false);
  };

  const openStudentRecord = (student: StudentSummary) => {
    setSelectedStudent(student);
    setIsReceiptViewOpen(false);
    setSelectedStudentReceipts([]);
    setStudentReceiptError("");
  };

  const openSelectedStudentReceipts = async () => {
    if (!selectedStudent) {
      return;
    }

    setIsReceiptViewOpen(true);
    setIsStudentReceiptLoading(true);
    setStudentReceiptError("");

    try {
      const studentReceipts = await getAdminSchoolReceipts(token, {
        ...scope,
        student_id: selectedStudent.id,
        limit: 20,
      });

      setSelectedStudentReceipts(studentReceipts);
    } catch (error) {
      setStudentReceiptError(
        error instanceof Error
          ? error.message
          : "Unable to load student receipts",
      );
    } finally {
      setIsStudentReceiptLoading(false);
    }
  };

  const closeStudentRecord = () => {
    setSelectedStudent(null);
    setIsReceiptViewOpen(false);
    setSelectedStudentReceipts([]);
    setStudentReceiptError("");
  };

  return (
    <section className="mt-5 space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {summaryCards.map((card) => (
          <article className="dashboard-card p-4" key={card.label}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-text-body">{card.label}</p>
                <p className="mt-2 text-2xl font-semibold">{card.value}</p>
              </div>
              <div
                className={cn(
                  "flex size-10 items-center justify-center rounded-md",
                  card.tone,
                )}
              >
                <card.icon aria-hidden="true" size={19} />
              </div>
            </div>
            <p className="mt-3 text-xs text-text-body">{card.helper}</p>
          </article>
        ))}
      </div>

      <article className="dashboard-card overflow-visible">
        <div className="flex flex-col gap-4 px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-base font-semibold">{copy.title}</h2>
            <p className="mt-1 text-sm text-text-body">{copy.subtitle}</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <form className="relative" onSubmit={handleSearchSubmit}>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-body"
                size={16}
              />
              <input
                className="h-10 w-full rounded-md bg-background pl-9 pr-9 text-sm text-text-primary outline-none shadow-[inset_0_0_0_1px_rgba(237,241,239,0.95)] transition focus:bg-white focus:shadow-[inset_0_0_0_2px_rgba(22,120,70,0.22)] sm:w-72"
                onChange={(event) => {
                  const nextDraft = event.target.value;

                  setSearchState((currentState) => ({
                    active:
                      nextDraft.trim() === ""
                        ? ""
                        : currentState.key === recordsKey
                          ? currentState.active
                          : "",
                    draft: nextDraft,
                    key: recordsKey,
                  }));
                }}
                placeholder={copy.searchPlaceholder}
                type="text"
                value={searchDraft}
              />
              {searchDraft && (
                <button
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-text-primary transition hover:bg-slate-100"
                  onClick={() => {
                    setSearchState({
                      active: "",
                      draft: "",
                      key: recordsKey,
                    });
                  }}
                  type="button"
                >
                  <X aria-hidden="true" size={14} />
                </button>
              )}
            </form>
            {activeTab === "students" && (
              <div className="relative" ref={filterWrapperRef}>
                <button
                  className={cn(
                    "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition",
                    activeStudentFilterCount > 0 || isFilterOpen
                      ? "bg-text-primary text-white shadow-[0_10px_24px_rgba(31,41,51,0.14)]"
                      : "bg-primary-light text-primary-dark hover:bg-[#d8ecdf]",
                  )}
                  onClick={() => setIsFilterOpen((current) => !current)}
                  type="button"
                >
                  <Filter aria-hidden="true" size={15} />
                  Filter
                  {activeStudentFilterCount > 0 && (
                    <span className="rounded-full bg-white/16 px-1.5 py-0.5 text-[11px] text-white">
                      {activeStudentFilterCount}
                    </span>
                  )}
                </button>

                {isFilterOpen && (
                  <StudentFilterMenu
                    canFilterDepartment={canFilterDepartment}
                    canFilterFaculty={canFilterFaculty}
                    departmentOptions={departmentFilterOptions}
                    draftFilters={draftStudentFilters}
                    facultyOptions={facultyFilterOptions}
                    onApply={applyStudentFilters}
                    onClear={clearStudentFilters}
                    onClose={() => setIsFilterOpen(false)}
                    onUpdate={updateDraftStudentFilter}
                  />
                )}
              </div>
            )}
            <button
              className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary-light px-3 text-sm font-semibold text-primary-dark transition hover:bg-[#d8ecdf]"
              onClick={() => void loadRecords("replace", 0)}
              type="button"
            >
              <RefreshCw aria-hidden="true" size={15} />
              Refresh
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border-soft px-5 py-3 text-xs text-text-body">
          <span>
            Showing {formatNumber(activeRecordsCount)} loaded records
          </span>
          {activeSearch ? <span>Search: {activeSearch}</span> : null}
        </div>

        {errorMessage && (
          <p className="mx-5 mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        {isLoading ? (
          <CenteredState
            description="Fetching the latest records for this scope."
            icon={LoaderCircle}
            isLoading
            title="Loading records"
          />
        ) : activeRecordsCount === 0 ? (
          <CenteredState
            description={copy.emptyDescription}
            icon={
              activeTab === "students"
                ? UsersRound
                : activeTab === "payments"
                  ? CreditCard
                  : ReceiptText
            }
            title={copy.emptyTitle}
          />
        ) : (
          <div className="overflow-x-auto">
            {activeTab === "students" ? (
              <StudentsTable
                onOpenStudent={openStudentRecord}
                students={students}
              />
            ) : activeTab === "payments" ? (
              <PaymentsTable onOpenPayment={onOpenPayment} payments={payments} />
            ) : (
              <ReceiptsTable
                onOpenReceipt={setSelectedReceipt}
                receipts={receipts}
              />
            )}
            {hasMoreRecords && (
              <div className="border-t border-border-soft bg-white px-5 py-4 text-center">
                <button
                  className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary-light px-4 text-sm font-semibold text-primary-dark transition hover:-translate-y-0.5 hover:bg-[#d8ecdf] hover:shadow-[0_12px_26px_rgba(22,120,70,0.12)] disabled:cursor-not-allowed disabled:opacity-65"
                  disabled={isLoadingMore}
                  onClick={() => void loadRecords("append", activeRecordsCount)}
                  type="button"
                >
                  {isLoadingMore && (
                    <LoaderCircle
                      aria-hidden="true"
                      className="animate-spin"
                      size={16}
                    />
                  )}
                  {isLoadingMore
                    ? "Loading records"
                    : `Load ${RECORDS_PAGE_SIZE} more`}
                </button>
              </div>
            )}
          </div>
        )}
      </article>
      {selectedStudent && (
        <StudentRecordModal
          errorMessage={studentReceiptError}
          isLoadingReceipts={isStudentReceiptLoading}
          isReceiptView={isReceiptViewOpen}
          onBack={() => setIsReceiptViewOpen(false)}
          onClose={closeStudentRecord}
          onOpenReceipts={() => void openSelectedStudentReceipts()}
          receipts={selectedStudentReceipts}
          student={selectedStudent}
        />
      )}
      {selectedReceipt && (
        <ReceiptRecordModal
          onClose={() => setSelectedReceipt(null)}
          receipt={selectedReceipt}
        />
      )}
    </section>
  );
}

// These quick cards let each table say what matters without repeating dashboard charts.
function buildSummaryCards(
  activeTab: RecordsWorkspaceTab,
  students: StudentSummary[],
  payments: AdminSchoolPayment[],
  receipts: AdminSchoolReceipt[],
): SummaryCard[] {
  if (activeTab === "students") {
    const paidCount = students.filter((student) => student.fee_status === "PAID").length;
    const partialCount = students.filter(
      (student) => student.fee_status === "PARTIAL",
    ).length;
    const unpaidCount = students.filter(
      (student) => student.fee_status === "NOT_PAID",
    ).length;

    return [
      {
        label: "Students",
        value: formatNumber(students.length),
        helper: "Profiles loaded in this scope",
        icon: UsersRound,
        tone: "bg-primary-light text-primary-dark",
      },
      {
        label: "Paid",
        value: formatNumber(paidCount),
        helper: `${formatNumber(partialCount)} partial payments`,
        icon: CreditCard,
        tone: "bg-[#FFF4E9] text-[#9A5A21]",
      },
      {
        label: "Not paid",
        value: formatNumber(unpaidCount),
        helper: "Students without a cleared fee record",
        icon: ReceiptText,
        tone: "bg-red-50 text-red-700",
      },
    ];
  }

  if (activeTab === "payments") {
    const successfulCount = payments.filter(
      (payment) => payment.status.toLowerCase() === "successful",
    ).length;
    const pendingCount = payments.filter(
      (payment) => payment.status.toLowerCase() === "pending",
    ).length;
    const totalAmount = payments.reduce(
      (total, payment) => total + Number(payment.amount ?? 0),
      0,
    );

    return [
      {
        label: "Payments",
        value: formatNumber(payments.length),
        helper: "Fee payment records loaded",
        icon: CreditCard,
        tone: "bg-[#FFF4E9] text-[#9A5A21]",
      },
      {
        label: "Successful",
        value: formatNumber(successfulCount),
        helper: `${formatNumber(pendingCount)} awaiting confirmation`,
        icon: ReceiptText,
        tone: "bg-primary-light text-primary-dark",
      },
      {
        label: "Recorded amount",
        value: `${formatMoney(totalAmount)} XAF`,
        helper: "Total shown in the current list",
        icon: CreditCard,
        tone: "bg-slate-100 text-text-primary",
      },
    ];
  }

  const receiptAmount = receipts.reduce(
    (total, receipt) => total + Number(receipt.amount ?? 0),
    0,
  );

  return [
    {
      label: "Receipts",
      value: formatNumber(receipts.length),
      helper: "Generated school-fee receipts",
      icon: ReceiptText,
      tone: "bg-primary-light text-primary-dark",
    },
    {
      label: "Receipt value",
      value: `${formatMoney(receiptAmount)} XAF`,
      helper: "Total shown in the current list",
      icon: CreditCard,
      tone: "bg-[#FFF4E9] text-[#9A5A21]",
    },
    {
      label: "Issued",
      value: formatNumber(receipts.length),
      helper: "Available for students to view",
      icon: UsersRound,
      tone: "bg-slate-100 text-text-primary",
    },
  ];
}

function StudentFilterMenu({
  canFilterDepartment,
  canFilterFaculty,
  departmentOptions,
  draftFilters,
  facultyOptions,
  onApply,
  onClear,
  onClose,
  onUpdate,
}: {
  canFilterDepartment: boolean;
  canFilterFaculty: boolean;
  departmentOptions: DropdownOption[];
  draftFilters: StudentFilters;
  facultyOptions: DropdownOption[];
  onApply: () => void;
  onClear: () => void;
  onClose: () => void;
  onUpdate: (key: keyof StudentFilters, value: string) => void;
}) {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return (
    <div
            className="absolute right-0 top-12 z-[80] w-[min(23rem,calc(100vw-2rem))] rounded-xl bg-white p-4 text-left shadow-[0_18px_46px_rgba(31,41,51,0.16)] ring-1 ring-border-soft"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Filter students</p>
          <p className="mt-1 text-xs leading-5 text-text-body">
            Filters are applied inside your allowed admin scope.
          </p>
        </div>
        <button
          aria-label="Close student filters"
          className="flex size-8 cursor-pointer items-center justify-center rounded-md bg-background text-text-body transition hover:bg-primary-light hover:text-primary"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" size={15} />
        </button>
      </div>

      <div className="mt-4 grid gap-3">
        <CustomDropdown
          buttonClassName="h-10 rounded-md"
          onChange={(value) => onUpdate("feeStatus", value)}
          options={FEE_STATUS_OPTIONS}
          placeholder="Fee status"
          value={draftFilters.feeStatus}
        />

        <CustomDropdown
          buttonClassName="h-10 rounded-md"
          onChange={(value) => onUpdate("level", value)}
          options={LEVEL_OPTIONS}
          placeholder="Level"
          value={draftFilters.level}
        />

        {canFilterFaculty && (
          <CustomDropdown
            buttonClassName="h-10 rounded-md"
            onChange={(value) => onUpdate("faculty", value)}
            options={facultyOptions}
            placeholder="Faculty"
            value={draftFilters.faculty}
          />
        )}

        {canFilterDepartment && (
          <CustomDropdown
            buttonClassName="h-10 rounded-md"
            onChange={(value) => onUpdate("department", value)}
            options={departmentOptions}
            placeholder="Department"
            value={draftFilters.department}
          />
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md bg-background px-3 text-sm font-semibold text-text-body transition hover:bg-primary-light hover:text-primary-dark"
          onClick={onClear}
          type="button"
        >
          Clear
        </button>
        <button
          className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md bg-text-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark"
          onClick={onApply}
          type="button"
        >
          Apply filters
        </button>
      </div>
    </div>
  );
}

function normalizeAdminRole(role: string) {
  return role.trim().toLowerCase().replace(/\s+/g, "_");
}

function resolveStudentFilterParams(
  admin: AdminUser,
  scope: AdminScopeParams,
  filters: StudentFilters,
) {
  const role = normalizeAdminRole(admin.admin_role);
  const isCentralAdmin = ["central_admin", "super_admin"].includes(role);
  const isDepartmentAdmin = role === "department_admin";
  const faculty =
    scope.faculty ||
    admin.faculty ||
    (isCentralAdmin ? filters.faculty : "") ||
    undefined;
  const department =
    admin.department ||
    scope.department ||
    (!isDepartmentAdmin && faculty ? filters.department : "") ||
    undefined;

  return {
    faculty,
    department,
    fee_status: filters.feeStatus || undefined,
    level: filters.level ? Number(filters.level) : undefined,
  };
}

function getActiveStudentFilterCount(
  filters: StudentFilters,
  scope: {
    canFilterDepartment: boolean;
    canFilterFaculty: boolean;
    isFacultyAdmin: boolean;
  },
) {
  let count = 0;

  if (filters.feeStatus) {
    count++;
  }

  if (filters.level) {
    count++;
  }

  if (scope.canFilterFaculty && filters.faculty) {
    count++;
  }

  if ((scope.canFilterDepartment || scope.isFacultyAdmin) && filters.department) {
    count++;
  }

  return count;
}

function StudentsTable({
  onOpenStudent,
  students,
}: {
  onOpenStudent: (student: StudentSummary) => void;
  students: StudentSummary[];
}) {
  return (
    <table className="w-full min-w-[940px] text-left text-sm">
      <thead className="bg-background text-xs uppercase text-text-body">
        <tr>
          <th className="px-5 py-3 font-semibold">Student</th>
          <th className="px-5 py-3 font-semibold">Level</th>
          <th className="px-5 py-3 font-semibold">Faculty</th>
          <th className="px-5 py-3 font-semibold">Department</th>
          <th className="px-5 py-3 font-semibold">Fee status</th>
          <th className="px-5 py-3 font-semibold">Account</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--border)]">
        {students.map((student) => (
          <tr
            className="cursor-pointer bg-white transition hover:bg-background"
            key={student.id}
            onClick={() => onOpenStudent(student)}
          >
            <td className="px-5 py-4">
              <div className="flex items-center gap-3">
                <StudentAvatar
                  className="size-10 text-xs"
                  imageUrl={student.profile_image_url}
                  name={student.full_name}
                />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{student.full_name}</p>
                  <p className="mt-0.5 text-xs text-text-body">
                    {student.matricule} - {student.phone_number}
                  </p>
                </div>
              </div>
            </td>
            <td className="whitespace-nowrap px-5 py-4">
              Level {student.level}
            </td>
            <td className="max-w-[240px] truncate px-5 py-4 text-text-body">
              {student.faculty}
            </td>
            <td className="max-w-[280px] truncate px-5 py-4 text-text-body">
              {student.department}
            </td>
            <td className="whitespace-nowrap px-5 py-4">
              <StatusPill label={formatStatusLabel(student.fee_status)} />
            </td>
            <td className="whitespace-nowrap px-5 py-4">
              <StatusPill label={student.is_active ? "Active" : "Inactive"} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PaymentsTable({
  payments,
  onOpenPayment,
}: {
  payments: AdminSchoolPayment[];
  onOpenPayment: (payment: AdminSchoolPayment) => void;
}) {
  return (
    <table className="w-full min-w-[980px] text-left text-sm">
      <thead className="bg-background text-xs uppercase text-text-body">
        <tr>
          <th className="px-5 py-3 font-semibold">Payment</th>
          <th className="px-5 py-3 font-semibold">Student</th>
          <th className="px-5 py-3 font-semibold">Amount</th>
          <th className="px-5 py-3 font-semibold">Method</th>
          <th className="px-5 py-3 font-semibold">Installment</th>
          <th className="px-5 py-3 font-semibold">Academic year</th>
          <th className="px-5 py-3 font-semibold">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--border)]">
        {payments.map((payment) => (
          <tr
            className="cursor-pointer bg-white transition hover:bg-background"
            key={payment.id}
            onClick={() => onOpenPayment(payment)}
          >
            <td className="px-5 py-4">
              <p className="font-semibold">{payment.reference_id}</p>
              <p className="mt-0.5 text-xs text-text-body">
                {formatShortDate(payment.created_at)}
              </p>
            </td>
            <td className="px-5 py-4">
              <div className="flex items-center gap-3">
                <StudentAvatar
                  className="size-9 text-[11px]"
                  imageUrl={payment.students.profile_image_url}
                  name={payment.students.full_name}
                />
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {payment.students.full_name}
                  </p>
                  <p className="mt-0.5 text-xs text-text-body">
                    {payment.students.matricule}
                  </p>
                </div>
              </div>
            </td>
            <td className="whitespace-nowrap px-5 py-4 font-semibold">
              {formatMoney(payment.amount)} XAF
            </td>
            <td className="whitespace-nowrap px-5 py-4 text-text-body">
              {formatStatusLabel(payment.payment_method)}
            </td>
            <td className="whitespace-nowrap px-5 py-4 text-text-body">
              {payment.fee_installment
                ? formatStatusLabel(payment.fee_installment)
                : "Not set"}
            </td>
            <td className="whitespace-nowrap px-5 py-4 text-text-body">
              {payment.academic_year}
            </td>
            <td className="whitespace-nowrap px-5 py-4">
              <StatusPill label={formatStatusLabel(payment.status)} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ReceiptsTable({
  onOpenReceipt,
  receipts,
}: {
  onOpenReceipt: (receipt: AdminSchoolReceipt) => void;
  receipts: AdminSchoolReceipt[];
}) {
  return (
    <table className="w-full min-w-[980px] text-left text-sm">
      <thead className="bg-background text-xs uppercase text-text-body">
        <tr>
          <th className="px-5 py-3 font-semibold">Receipt</th>
          <th className="px-5 py-3 font-semibold">Student</th>
          <th className="px-5 py-3 font-semibold">Amount</th>
          <th className="px-5 py-3 font-semibold">Payment ref.</th>
          <th className="px-5 py-3 font-semibold">Method</th>
          <th className="px-5 py-3 font-semibold">Academic year</th>
          <th className="px-5 py-3 font-semibold">Type</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--border)]">
        {receipts.map((receipt) => (
          <tr
            className="cursor-pointer bg-white transition hover:bg-background"
            key={receipt.id}
            onClick={() => onOpenReceipt(receipt)}
          >
            <td className="px-5 py-4">
              <p className="font-semibold">{receipt.receipt_number}</p>
              <p className="mt-0.5 text-xs text-text-body">
                {formatShortDate(receipt.issued_at)}
              </p>
            </td>
            <td className="px-5 py-4">
              <div className="flex items-center gap-3">
                <StudentAvatar
                  className="size-9 text-[11px]"
                  imageUrl={receipt.students.profile_image_url}
                  name={receipt.students.full_name}
                />
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {receipt.students.full_name}
                  </p>
                  <p className="mt-0.5 text-xs text-text-body">
                    {receipt.students.matricule}
                  </p>
                </div>
              </div>
            </td>
            <td className="whitespace-nowrap px-5 py-4 font-semibold">
              {formatMoney(receipt.amount)} XAF
            </td>
            <td className="whitespace-nowrap px-5 py-4 text-text-body">
              {receipt.payments.reference_id}
            </td>
            <td className="whitespace-nowrap px-5 py-4 text-text-body">
              {formatStatusLabel(receipt.payments.payment_method)}
            </td>
            <td className="whitespace-nowrap px-5 py-4 text-text-body">
              {receipt.academic_year}
            </td>
            <td className="whitespace-nowrap px-5 py-4">
              <StatusPill label={formatStatusLabel(receipt.receipt_type)} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CenteredState({
  description,
  icon: Icon,
  isLoading = false,
  title,
}: {
  description: string;
  icon: LucideIcon;
  isLoading?: boolean;
  title: string;
}) {
  return (
    <div className="flex min-h-[22rem] items-center justify-center px-5 py-12 text-center">
      <div className="max-w-sm">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary-light text-primary">
          <Icon
            aria-hidden="true"
            className={cn(isLoading && "animate-spin")}
            size={22}
          />
        </div>
        <h3 className="mt-4 text-base font-semibold">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-text-body">{description}</p>
      </div>
    </div>
  );
}

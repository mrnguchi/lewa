export type PaymentModalMode = "pending" | "receipt-gap";

export type AdminWorkspaceTab =
  | "dashboard"
  | "students"
  | "payments"
  | "receipts"
  | "news"
  | "support";

export type RecentActivityFilter = "all" | "payments" | "complaints";

export type RecentDeleteTarget = {
  id: string;
  label: string;
  type: "payment" | "complaint";
};

export type DashboardScope = {
  faculty: string;
  department: string;
};

export type DropdownOption = {
  value: string;
  label: string;
  description?: string;
};

export const DEFAULT_DASHBOARD_SCOPE: DashboardScope = {
  faculty: "",
  department: "",
};

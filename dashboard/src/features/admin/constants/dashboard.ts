import {
  BookOpen,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  MessageSquareText,
  Newspaper,
  ReceiptText,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export const GENERAL_UB_SCOPE_VALUE = "__general_ub__";

export const sidebarSections: {
  title: string;
  items: {
    label: string;
    icon: LucideIcon;
    active?: boolean;
    badge?: string;
  }[];
}[] = [
  {
    title: "General",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, active: true },
      { label: "Students", icon: UsersRound },
      { label: "Fee payments", icon: CreditCard },
      { label: "Receipts", icon: ReceiptText },
    ],
  },
  {
    title: "Tools",
    items: [
      { label: "News", icon: Newspaper },
      { label: "Resources", icon: BookOpen },
      { label: "Calendar", icon: CalendarDays },
      { label: "Support", icon: MessageSquareText },
    ],
  },
];

export const quickActions = [
  { label: "Publish news", icon: Newspaper, showPlus: true },
  { label: "Upload resource", icon: BookOpen, showPlus: true },
  { label: "Reply support", icon: MessageSquareText },
];

export const feeStatusMeta: Record<
  string,
  {
    label: string;
    bar: string;
    dot: string;
    soft: string;
  }
> = {
  PAID: {
    label: "Paid",
    bar: "bg-primary",
    dot: "bg-primary",
    soft: "bg-primary-light text-primary-dark",
  },
  PARTIAL: {
    label: "Partial",
    bar: "bg-gold",
    dot: "bg-gold",
    soft: "bg-[#FFF4E9] text-[#9A5A21]",
  },
  NOT_PAID: {
    label: "Not paid",
    bar: "bg-error",
    dot: "bg-error",
    soft: "bg-red-50 text-red-700",
  },
};

export const feeStatusChartColors: Record<string, string> = {
  PAID: "var(--primary)",
  PARTIAL: "var(--gold)",
  NOT_PAID: "var(--error)",
};

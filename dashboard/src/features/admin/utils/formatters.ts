import { feeStatusMeta } from "../constants/dashboard";

export const formatNumber = (value?: number) =>
  new Intl.NumberFormat().format(value ?? 0);

export const formatMoney = (value?: number | string | null) =>
  new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));

export const formatStatusLabel = (status: string) =>
  feeStatusMeta[status]?.label ??
  status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export const formatShortDate = (value?: string) => {
  if (!value) {
    return "Recent";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(value));
};

export const getPercent = (value: number, total: number) =>
  total > 0 ? Math.round((value / total) * 100) : 0;

export const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "LA";

export const getGreeting = () => {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good Morning";
  }

  if (hour < 17) {
    return "Good Afternoon";
  }

  return "Good Evening";
};

export const getStatusTone = (status: string) => {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus.includes("not paid") || normalizedStatus.includes("unpaid")) {
    return "bg-red-50 text-red-700";
  }

  if (normalizedStatus.includes("success") || normalizedStatus.includes("paid")) {
    return "bg-primary-light text-primary-dark";
  }

  if (normalizedStatus.includes("pending") || normalizedStatus.includes("partial")) {
    return "bg-[#FFF4E9] text-[#9A5A21]";
  }

  if (normalizedStatus.includes("fail") || normalizedStatus.includes("cancel")) {
    return "bg-red-50 text-red-700";
  }

  return "bg-slate-100 text-text-body";
};

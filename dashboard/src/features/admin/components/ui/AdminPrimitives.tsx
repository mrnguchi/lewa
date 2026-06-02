"use client";

import { MoreHorizontal, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  getInitials,
  getStatusTone,
} from "../../utils/formatters";

export function StudentAvatar({
  className,
  imageUrl,
  name,
}: {
  className?: string;
  imageUrl?: string | null;
  name: string;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-light font-semibold text-primary-dark",
        className,
      )}
      style={
        imageUrl
          ? {
              backgroundImage: `url(${imageUrl})`,
              backgroundPosition: "center",
              backgroundSize: "cover",
            }
          : undefined
      }
    >
      {!imageUrl && getInitials(name)}
    </span>
  );
}

export function ToolbarButton({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <button
      className="soft-button inline-flex h-10 cursor-pointer items-center gap-2 px-3 text-sm font-semibold text-text-body transition hover:text-primary hover:shadow-[0_12px_28px_rgba(22,120,70,0.14)]"
      type="button"
    >
      <Icon aria-hidden="true" size={16} />
      {label}
    </button>
  );
}

export function IconButton({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <button
      aria-label={label}
      className="icon-surface hidden size-10 cursor-pointer items-center justify-center text-text-body transition hover:text-primary sm:flex"
      type="button"
    >
      <Icon aria-hidden="true" size={17} />
    </button>
  );
}

export function PanelTitle({
  action,
  subtitle,
  title,
}: {
  action: string;
  subtitle: string;
  title: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-text-body">{subtitle}</p>}
      </div>
      {action ? (
        <button
          className="cursor-pointer rounded-md bg-primary-light px-3 py-1.5 text-xs font-semibold text-primary-dark transition hover:bg-[#d8ecdf]"
          type="button"
        >
          {action}
        </button>
      ) : (
        <button
          aria-label={`${title} options`}
          className="flex size-8 cursor-pointer items-center justify-center rounded-md text-text-body transition hover:bg-slate-100 hover:text-text-primary"
          type="button"
        >
          <MoreHorizontal aria-hidden="true" size={16} />
        </button>
      )}
    </div>
  );
}

export function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-text-body">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}

export function StatusPill({ label }: { label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        getStatusTone(label),
      )}
    >
      {label}
    </span>
  );
}

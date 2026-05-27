"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Activity,
  Bell,
  BookOpen,
  Building2,
  ChevronDown,
  CircleHelp,
  Headset,
  KeyRound,
  LogOut,
  Menu,
  MonitorCog,
  MessageSquareText,
  Search,
  Settings,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import type { AdminSupportConversation, AdminUser } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

import { GENERAL_UB_SCOPE_VALUE } from "../../constants/dashboard";
import type {
  DashboardScope,
  DropdownOption,
} from "../../types";
import {
  canSelectDashboardScope,
  getDashboardScopeLabel,
} from "../../utils/admin-scope";
import { getSupportPreview } from "../../utils/support";
import { CustomDropdown } from "../ui/CustomDropdown";

type TopbarMenu = "help" | "notifications" | "profile" | "settings";

export function Topbar({
  admin,
  isScopeLoading,
  onLogout,
  onOpenNotificationThread,
  onScopeChange,
  scope,
  scopeOptions,
  supportCount,
  supportThreads,
  title = "Dashboard",
}: {
  admin: AdminUser;
  isScopeLoading: boolean;
  onLogout: () => void;
  onOpenNotificationThread?: (conversationId: string) => void;
  onScopeChange: (scope: DashboardScope) => Promise<void>;
  scope: DashboardScope;
  scopeOptions: DropdownOption[];
  supportCount: number;
  supportThreads: AdminSupportConversation[];
  title?: string;
}) {
  const [activeMenu, setActiveMenu] = useState<TopbarMenu | null>(null);
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const canSelectScope = canSelectDashboardScope(admin);
  const roleLabel = admin.admin_role.replace(/_/g, " ");
  const currentScopeLabel = getDashboardScopeLabel(scope, admin);

  useEffect(() => {
    if (!activeMenu) {
      return;
    }

    const closeMenu = (event: MouseEvent) => {
      if (!actionsRef.current?.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveMenu(null);
      }
    };

    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [activeMenu]);

  return (
    <header className="dashboard-card flex min-h-16 items-center justify-between gap-4 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <button
          aria-label="Open menu"
          className="icon-surface flex size-9 cursor-pointer items-center justify-center text-text-body xl:hidden"
          type="button"
        >
          <Menu aria-hidden="true" size={18} />
        </button>
        <div className="hidden text-sm font-semibold text-text-primary sm:block">
          {title}
        </div>
      </div>

      <div className="hidden min-w-0 flex-1 items-center justify-center gap-3 lg:flex">
        <label className="relative w-full max-w-md">
          <span className="sr-only">Search dashboard</span>
          <Search
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-body"
            size={17}
          />
          <input
            className="h-10 w-full rounded-md bg-background pl-10 pr-3 text-sm shadow-[inset_0_0_0_1px_rgba(237,241,239,0.95)] outline-none transition placeholder:text-slate-400 focus:shadow-[inset_0_0_0_2px_rgba(22,120,70,0.28)]"
            placeholder="Search students, receipts, support..."
            type="search"
          />
        </label>

        {canSelectScope && (
          <CustomDropdown
            buttonClassName="h-10 rounded-md border-0 bg-background px-3 shadow-[inset_0_0_0_1px_rgba(237,241,239,0.95)]"
            className="w-[min(18rem,24vw)]"
            disabled={isScopeLoading}
            menuClassName="left-auto right-0 w-[20rem]"
            onChange={(value) => {
              void onScopeChange({
                faculty: value === GENERAL_UB_SCOPE_VALUE ? "" : value,
                department: "",
              });
            }}
            options={scopeOptions}
            placeholder="Select view"
            value={scope.faculty || GENERAL_UB_SCOPE_VALUE}
          />
        )}
      </div>

      <div className="relative flex items-center gap-2" ref={actionsRef}>
        <div className="relative">
          <TopbarIconButton
            icon={CircleHelp}
            isActive={activeMenu === "help"}
            label="Help"
            onClick={() =>
              setActiveMenu((current) => (current === "help" ? null : "help"))
            }
          />
          {activeMenu === "help" && <HelpMenu />}
        </div>

        <div className="relative">
          <TopbarIconButton
            badgeCount={supportCount}
            icon={Bell}
            isActive={activeMenu === "notifications"}
            label="Notifications"
            onClick={() =>
              setActiveMenu((current) =>
                current === "notifications" ? null : "notifications",
              )
            }
          />
          {activeMenu === "notifications" && (
            <NotificationsMenu
              onOpenThread={(conversationId) => {
                setActiveMenu(null);
                onOpenNotificationThread?.(conversationId);
              }}
              supportThreads={supportThreads}
            />
          )}
        </div>

        <div className="relative">
          <TopbarIconButton
            icon={Settings}
            isActive={activeMenu === "settings"}
            label="Settings"
            onClick={() =>
              setActiveMenu((current) =>
                current === "settings" ? null : "settings",
              )
            }
          />
          {activeMenu === "settings" && <SettingsMenu />}
        </div>

        <div className="relative">
          <button
            aria-expanded={activeMenu === "profile"}
            className={cn(
              "flex h-10 cursor-pointer items-center gap-2 rounded-md bg-background px-2 pr-3 text-left shadow-[inset_0_0_0_1px_rgba(237,241,239,0.95)] transition hover:text-primary",
              activeMenu === "profile" && "text-primary",
            )}
            onClick={() =>
              setActiveMenu((current) =>
                current === "profile" ? null : "profile",
              )
            }
            type="button"
          >
            <Image
              alt="University of Buea"
              className="size-8 rounded-full object-cover"
              height={32}
              src="/assets/ub-circular.png"
              width={32}
            />
            <span className="hidden sm:block">
              <span className="block text-sm font-semibold leading-none">
                {admin.full_name}
              </span>
              <span className="mt-1 block text-xs leading-none text-text-body">
                {roleLabel}
              </span>
            </span>
            <ChevronDown
              aria-hidden="true"
              className={cn(
                "hidden text-text-body transition sm:block",
                activeMenu === "profile" && "rotate-180 text-primary",
              )}
              size={15}
            />
          </button>

          {activeMenu === "profile" && (
            <ProfileMenu
              admin={admin}
              canSelectScope={canSelectScope}
              currentScopeLabel={currentScopeLabel}
              isScopeLoading={isScopeLoading}
              onLogout={onLogout}
              onScopeChange={onScopeChange}
              roleLabel={roleLabel}
              scope={scope}
              scopeOptions={scopeOptions}
            />
          )}
        </div>
      </div>
    </header>
  );
}

function TopbarIconButton({
  badgeCount = 0,
  icon: Icon,
  isActive,
  label,
  onClick,
}: {
  badgeCount?: number;
  icon: LucideIcon;
  isActive: boolean;
  label: string;
  onClick: () => void;
}) {
  const visibleBadgeCount = badgeCount > 99 ? "99+" : String(badgeCount);

  return (
    <button
      aria-expanded={isActive}
      aria-label={label}
      className={cn(
        "icon-surface relative flex size-10 cursor-pointer items-center justify-center text-text-body transition hover:text-primary",
        isActive && "text-primary",
      )}
      onClick={onClick}
      type="button"
    >
      <Icon aria-hidden="true" size={17} />
      {badgeCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-white shadow-sm">
          {visibleBadgeCount}
        </span>
      )}
    </button>
  );
}

function HelpMenu() {
  return (
    <TopbarDropdown align="right" title="Help">
      <MenuRow
        description="In-app guide modal coming later"
        icon={BookOpen}
        label="Dashboard guide"
      />
      <MenuRow
        description="Reach the Lewa technical support team"
        icon={Headset}
        label="Contact tech support"
      />
      <MenuRow
        description="All admin services operational"
        icon={Activity}
        label="System status"
        meta="Live"
      />
    </TopbarDropdown>
  );
}

function NotificationsMenu({
  onOpenThread,
  supportThreads,
}: {
  onOpenThread?: (conversationId: string) => void;
  supportThreads: AdminSupportConversation[];
}) {
  const unreadSupportThreads = supportThreads
    .filter((thread) => thread.unreadForAdmin > 0)
    .slice(0, 6);

  return (
    <TopbarDropdown align="right" title="Notifications">
      {unreadSupportThreads.length > 0 ? (
        unreadSupportThreads.map((thread) => (
          <NotificationRow
            description={getSupportPreview(thread)}
            key={thread.id}
            meta={
              thread.unreadForAdmin > 1
                ? `${thread.unreadForAdmin} new`
                : "New"
            }
            onClick={() => onOpenThread?.(thread.id)}
            title={thread.students.matricule}
          />
        ))
      ) : (
        <NotificationEmptyState />
      )}
    </TopbarDropdown>
  );
}

function SettingsMenu() {
  return (
    <TopbarDropdown align="right" title="Settings">
      <MenuRow
        description="Update admin login password"
        icon={KeyRound}
        label="Change password"
      />
      <MenuRow
        description="Theme, density, and table view preferences"
        icon={MonitorCog}
        label="Dashboard display preferences"
      />
      <MenuRow
        description="Review session and security controls"
        icon={ShieldCheck}
        label="Security/session settings"
      />
    </TopbarDropdown>
  );
}

function ProfileMenu({
  admin,
  canSelectScope,
  currentScopeLabel,
  isScopeLoading,
  onLogout,
  onScopeChange,
  roleLabel,
  scope,
  scopeOptions,
}: {
  admin: AdminUser;
  canSelectScope: boolean;
  currentScopeLabel: string;
  isScopeLoading: boolean;
  onLogout: () => void;
  onScopeChange: (scope: DashboardScope) => Promise<void>;
  roleLabel: string;
  scope: DashboardScope;
  scopeOptions: DropdownOption[];
}) {
  return (
    <TopbarDropdown
      align="right"
      className="w-[22rem] max-w-[calc(100vw-2rem)] overflow-visible"
      title="Admin profile"
    >
      <div className="flex items-center gap-3 rounded-lg bg-background p-3">
        <Image
          alt="University of Buea"
          className="size-10 rounded-full object-cover"
          height={40}
          src="/assets/ub-circular.png"
          width={40}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{admin.full_name}</p>
          <p className="mt-0.5 truncate text-xs text-text-body">{admin.email}</p>
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        <InfoRow
          icon={Building2}
          label="Current scope"
          value={currentScopeLabel}
        />
        <InfoRow icon={UserRound} label="Account role" value={roleLabel} />
      </div>

      {canSelectScope && (
        <div className="mt-3 rounded-lg bg-background p-3">
          <p className="mb-2 text-xs font-semibold text-text-body">
            Switch scope
          </p>
          <CustomDropdown
            buttonClassName="h-auto min-h-10 rounded-md py-2"
            className="min-w-0 max-w-full"
            disabled={isScopeLoading}
            menuClassName="left-auto right-0 w-full"
            onChange={(value) => {
              void onScopeChange({
                faculty: value === GENERAL_UB_SCOPE_VALUE ? "" : value,
                department: "",
              });
            }}
            options={scopeOptions}
            placeholder="Select scope"
            value={scope.faculty || GENERAL_UB_SCOPE_VALUE}
            wrapSelectedText
          />
        </div>
      )}

      <button
        className="mt-3 flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-error transition hover:bg-red-50"
        onClick={onLogout}
        type="button"
      >
        <LogOut aria-hidden="true" size={17} />
        Logout
      </button>
    </TopbarDropdown>
  );
}

function TopbarDropdown({
  align,
  children,
  className,
  title,
}: {
  align: "right";
  children: ReactNode;
  className?: string;
  title: string;
}) {
  return (
    <div
      className={cn(
        "absolute top-12 z-50 w-80 rounded-xl bg-white p-3 text-left shadow-[0_18px_46px_rgba(31,41,51,0.16)] ring-1 ring-border-soft",
        align === "right" && "right-0",
        className,
      )}
    >
      <p className="px-1 pb-2 text-sm font-semibold">{title}</p>
      <div className="grid gap-1">{children}</div>
    </div>
  );
}

function MenuRow({
  description,
  icon: Icon,
  label,
  meta,
}: {
  description: string;
  icon: LucideIcon;
  label: string;
  meta?: string;
}) {
  return (
    <button
      className="flex w-full cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-primary-light"
      type="button"
    >
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-background text-primary">
        <Icon aria-hidden="true" size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-3">
          <span className="truncate text-sm font-semibold">{label}</span>
          {meta && (
            <span className="rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-semibold text-primary-dark">
              {meta}
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-xs leading-5 text-text-body">
          {description}
        </span>
      </span>
    </button>
  );
}

function NotificationEmptyState() {
  return (
    <div className="flex min-h-36 items-center justify-center rounded-lg bg-background px-4 py-6 text-center">
      <div className="max-w-52">
        <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary-light text-primary">
          <Bell aria-hidden="true" size={18} />
        </div>
        <p className="mt-3 text-sm font-semibold">No notifications</p>
        <p className="mt-1 text-xs leading-5 text-text-body">
          New student complaints, support replies, and system notices will show
          here.
        </p>
      </div>
    </div>
  );
}

function NotificationRow({
  description,
  meta,
  onClick,
  title,
}: {
  description: string;
  meta?: string;
  onClick?: () => void;
  title: string;
}) {
  return (
    <button
      className="flex w-full cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-primary-light"
      onClick={onClick}
      type="button"
    >
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-light text-primary">
        <MessageSquareText aria-hidden="true" size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-3">
          <span className="truncate text-sm font-semibold">{title}</span>
          {meta && (
            <span className="shrink-0 rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-semibold text-primary-dark">
              {meta}
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-xs leading-5 text-text-body">
          {description}
        </span>
      </span>
    </button>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg px-3 py-2">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-background text-primary">
        <Icon aria-hidden="true" size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-text-body">{label}</span>
        <span className="mt-0.5 block break-words text-sm font-semibold leading-5">
          {value}
        </span>
      </span>
    </div>
  );
}

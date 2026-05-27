"use client";

import Image from "next/image";
import {
  LogOut,
  PanelLeftClose,
  Settings,
  type LucideIcon,
} from "lucide-react";

import type { AdminUser } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

type SidebarSection = {
  title: string;
  items: {
    label: string;
    icon: LucideIcon;
    active?: boolean;
    badge?: string;
    onClick?: () => void;
  }[];
};

export function Sidebar({
  admin,
  isCollapsed,
  navigation,
  onToggleCollapse,
  onLogout,
}: {
  admin: AdminUser;
  isCollapsed: boolean;
  navigation: SidebarSection[];
  onToggleCollapse: () => void;
  onLogout: () => void;
}) {
  return (
    <aside
      className={cn(
        "hidden h-[100dvh] min-h-0 overflow-hidden bg-text-primary text-white shadow-[12px_0_38px_rgba(31,41,51,0.14)] transition-all duration-300 xl:flex xl:flex-col",
        isCollapsed
          ? "px-3 py-[clamp(0.8rem,1.7vh,1.15rem)]"
          : "px-[clamp(0.9rem,1.3vw,1.25rem)] py-[clamp(0.75rem,1.7vh,1.25rem)]",
      )}
    >
      <div
        className={cn(
          "flex items-center",
          isCollapsed ? "flex-col gap-3" : "justify-between",
        )}
      >
        <div
          className={cn(
            "flex min-w-0 items-center",
            isCollapsed ? "justify-center" : "gap-3",
          )}
        >
          <Image
            alt="Lewa logo"
            className={cn(
              "bg-white object-contain transition-all",
              isCollapsed
                ? "size-11 rounded-xl p-2"
                : "h-8 w-auto rounded-md p-1",
            )}
            height={42}
            priority
            src="/assets/lewa-logo1.png"
            width={72}
          />
          <div className={cn("min-w-0", isCollapsed && "hidden")}>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-light">
              Lewa
            </p>
            <p className="text-[13px] font-semibold text-white">
              Admin Center
            </p>
          </div>
        </div>
        <button
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white"
          onClick={onToggleCollapse}
          type="button"
        >
          <PanelLeftClose
            aria-hidden="true"
            className={cn("transition", isCollapsed && "rotate-180")}
            size={17}
          />
        </button>
      </div>

      <nav
        aria-label="Dashboard sidebar"
        className={cn(
          "mt-[clamp(1.25rem,3.2vh,2rem)] min-h-0 flex-1",
          isCollapsed
            ? "space-y-[clamp(1rem,2.7vh,1.75rem)]"
            : "space-y-[clamp(0.9rem,2.4vh,1.65rem)]",
        )}
      >
        {navigation.map((section) => (
          <div key={section.title}>
            <p
              className={cn(
                "px-2 text-[11px] font-medium text-white/45",
                isCollapsed && "sr-only",
              )}
            >
              {section.title}
            </p>
            <div className={cn("mt-2", isCollapsed ? "space-y-2.5" : "space-y-1.5")}>
              {section.items.map((item) => (
                <button
                  aria-label={item.label}
                  className={cn(
                    "group relative flex h-11 cursor-pointer items-center rounded-xl text-[13px] font-semibold text-white/70 transition hover:bg-white/10 hover:text-white",
                    isCollapsed
                      ? "mx-auto w-11 justify-center px-0"
                      : "w-full justify-between px-3",
                    item.active &&
                      "bg-primary text-white shadow-[0_10px_24px_rgba(22,120,70,0.28)]",
                  )}
                  key={item.label}
                  onClick={item.onClick}
                  title={isCollapsed ? item.label : undefined}
                  type="button"
                >
                  <span
                    className={cn(
                      "flex min-w-0 items-center",
                      isCollapsed ? "justify-center" : "gap-3",
                    )}
                  >
                    <item.icon aria-hidden="true" size={18} />
                    <span className={cn("truncate", isCollapsed && "hidden")}>
                      {item.label}
                    </span>
                  </span>
                  {item.badge && (
                    <span
                      className={cn(
                        "rounded-full font-semibold",
                        isCollapsed
                          ? "absolute -right-1 -top-1 min-w-5 bg-primary-light px-1.5 py-0.5 text-center text-[10px] text-primary-dark"
                          : "bg-white/12 px-2 py-0.5 text-xs text-white/70",
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div
        className={cn(
          "shrink-0 pt-[clamp(0.35rem,1.2vh,1rem)]",
          isCollapsed && "space-y-2.5",
        )}
      >
        <button
          aria-label="Settings"
          className={cn(
            "flex h-11 cursor-pointer items-center rounded-xl text-[13px] font-semibold text-white/65 transition hover:bg-white/10 hover:text-white",
            isCollapsed
              ? "mx-auto w-11 justify-center px-0"
              : "w-full gap-3 px-3",
          )}
          title={isCollapsed ? "Settings" : undefined}
          type="button"
        >
          <Settings aria-hidden="true" size={18} />
          <span className={cn(isCollapsed && "hidden")}>Settings</span>
        </button>
        <button
          aria-label="Log out"
          className={cn(
            "flex h-11 cursor-pointer items-center rounded-xl text-[13px] font-semibold text-white/65 transition hover:bg-white/10 hover:text-white",
            isCollapsed
              ? "mx-auto w-11 justify-center px-0"
              : "mt-1 w-full gap-3 px-3",
          )}
          onClick={onLogout}
          title={isCollapsed ? "Log out" : undefined}
          type="button"
        >
          <LogOut aria-hidden="true" size={18} />
          <span className={cn(isCollapsed && "hidden")}>Log out</span>
        </button>
        <div
          className={cn(
            "mt-[clamp(0.4rem,1.4vh,1rem)] flex items-center bg-white shadow-[0_12px_30px_rgba(0,0,0,0.14)] transition-all",
            isCollapsed
              ? "mx-auto size-11 justify-center rounded-xl p-1.5"
              : "gap-3 rounded-lg p-2.5",
          )}
        >
          <Image
            alt="University of Buea"
            className={cn(
              "rounded-full object-cover",
              isCollapsed ? "size-8" : "size-8",
            )}
            height={32}
            src="/assets/ub-circular.png"
            width={32}
          />
          <div className={cn("min-w-0", isCollapsed && "hidden")}>
            <p className="truncate text-[13px] font-semibold text-text-primary">
              {admin.full_name}
            </p>
            <p className="truncate text-xs text-text-body">{admin.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

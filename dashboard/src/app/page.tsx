import {
  Bell,
  BookOpen,
  CalendarDays,
  ChevronRight,
  FileText,
  GraduationCap,
  LayoutDashboard,
  MessageSquareText,
  Newspaper,
  ReceiptText,
  Search,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import { cn } from "@/lib/utils";

const navigationItems = [
  { label: "Overview", icon: LayoutDashboard, active: true },
  { label: "Students", icon: UsersRound },
  { label: "News", icon: Newspaper },
  { label: "Resources", icon: BookOpen },
  { label: "Payments", icon: ReceiptText },
  { label: "Calendar", icon: CalendarDays },
  { label: "Support", icon: MessageSquareText },
];

const metricCards = [
  {
    label: "Registered Students",
    value: "1,248",
    note: "+84 this month",
    icon: GraduationCap,
  },
  {
    label: "Published Updates",
    value: "36",
    note: "8 awaiting review",
    icon: Newspaper,
  },
  {
    label: "Resource Files",
    value: "142",
    note: "12 uploaded recently",
    icon: FileText,
  },
  {
    label: "Confirmed Payments",
    value: "891",
    note: "72 pending receipts",
    icon: ReceiptText,
  },
];

const activity = [
  {
    title: "New resource uploaded",
    detail: "Computer Engineering timetable added to Level 400.",
    time: "12 min ago",
  },
  {
    title: "Payment receipt created",
    detail: "Annual subscription receipt is ready for approval.",
    time: "35 min ago",
  },
  {
    title: "News draft pending",
    detail: "Faculty orientation update is waiting for publishing.",
    time: "1 hr ago",
  },
];

const quickActions = [
  "Publish news",
  "Upload resource",
  "Review payments",
  "Open support queue",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f5f7f6]">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-r border-slate-200 bg-white px-5 py-6">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg bg-[#167846] text-white">
              <ShieldCheck aria-hidden="true" size={22} />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#167846]">
                Lewa
              </p>
              <h1 className="text-xl font-semibold text-slate-950">
                Admin Dashboard
              </h1>
            </div>
          </div>

          <nav aria-label="Primary" className="mt-8 space-y-1">
            {navigationItems.map((item) => (
              <a
                key={item.label}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950",
                  item.active && "bg-[#e8f3ee] text-[#167846]",
                )}
                href="#"
              >
                <item.icon aria-hidden="true" size={18} />
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        <section className="px-5 py-5 md:px-8">
          <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-[#167846]">
                School administration
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-950 md:text-3xl">
                Overview
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <label className="relative block w-full min-w-0 md:w-80">
                <span className="sr-only">Search dashboard</span>
                <Search
                  aria-hidden="true"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  className="h-11 w-full rounded-md border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#167846] focus:ring-2 focus:ring-[#167846]/15"
                  placeholder="Search students, news, receipts"
                  type="search"
                />
              </label>
              <button
                aria-label="Notifications"
                className="flex size-11 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:border-[#167846] hover:text-[#167846]"
                type="button"
              >
                <Bell aria-hidden="true" size={19} />
              </button>
            </div>
          </header>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metricCards.map((card) => (
              <article
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
                key={card.label}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      {card.label}
                    </p>
                    <p className="mt-3 text-3xl font-semibold text-slate-950">
                      {card.value}
                    </p>
                  </div>
                  <div className="flex size-10 items-center justify-center rounded-md bg-[#e8f3ee] text-[#167846]">
                    <card.icon aria-hidden="true" size={20} />
                  </div>
                </div>
                <p className="mt-4 text-sm text-slate-500">{card.note}</p>
              </article>
            ))}
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">
                    Recent Activity
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Live operational events from the backend will appear here.
                  </p>
                </div>
                <button
                  className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-[#167846] hover:text-[#167846]"
                  type="button"
                >
                  View all
                  <ChevronRight aria-hidden="true" size={16} />
                </button>
              </div>

              <div className="mt-5 divide-y divide-slate-100">
                {activity.map((item) => (
                  <article
                    className="grid gap-2 py-4 md:grid-cols-[1fr_auto] md:items-center"
                    key={item.title}
                  >
                    <div>
                      <h4 className="font-medium text-slate-950">
                        {item.title}
                      </h4>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.detail}
                      </p>
                    </div>
                    <p className="text-sm text-slate-400">{item.time}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-950">
                Quick Actions
              </h3>
              <div className="mt-5 grid gap-3">
                {quickActions.map((action) => (
                  <button
                    className="flex items-center justify-between rounded-md border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-[#167846] hover:bg-[#f7fbf9] hover:text-[#167846]"
                    key={action}
                    type="button"
                  >
                    {action}
                    <ChevronRight aria-hidden="true" size={16} />
                  </button>
                ))}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

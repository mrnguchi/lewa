"use client";

import {
  ChevronLeft,
  LoaderCircle,
  SendHorizontal,
  X,
} from "lucide-react";

import type { AdminSupportConversation } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

import {
  formatShortDate,
  formatStatusLabel,
} from "../../utils/formatters";
import { isAdminSender } from "../../utils/support";
import {
  DetailItem,
  StatusPill,
  StudentAvatar,
} from "../ui/AdminPrimitives";

export function SupportChatModal({
  conversation,
  draft,
  errorMessage,
  isLoading,
  isSending,
  onClose,
  onDraftChange,
  onSend,
  onToggleProfile,
  showStudentProfile,
}: {
  conversation: AdminSupportConversation;
  draft: string;
  errorMessage: string;
  isLoading: boolean;
  isSending: boolean;
  onClose: () => void;
  onDraftChange: (value: string) => void;
  onSend: () => Promise<void>;
  onToggleProfile: () => void;
  showStudentProfile: boolean;
}) {
  const student = conversation.students;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/45 px-4 py-6 backdrop-blur-sm">
      <article className="dashboard-card flex h-[min(46rem,calc(100vh-3rem))] w-full max-w-5xl overflow-hidden">
        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-4 border-b border-border-soft px-5 py-4">
            <button
              className="flex min-w-0 cursor-pointer items-center gap-3 rounded-lg pr-2 text-left transition hover:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              onClick={onToggleProfile}
              type="button"
            >
              <StudentAvatar
                className="size-11 text-sm"
                imageUrl={student.profile_image_url}
                name={student.full_name}
              />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">
                  {student.full_name}
                </span>
                <span className="mt-0.5 block truncate text-xs text-text-body">
                  {student.matricule} - Level {student.level}
                </span>
              </span>
            </button>

            <div className="flex items-center gap-2">
              <StatusPill label={conversation.status} />
              <button
                aria-label="Close chat"
                className="flex size-9 cursor-pointer items-center justify-center rounded-md bg-background text-text-body transition hover:bg-primary-light hover:text-primary"
                onClick={onClose}
                type="button"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>
          </header>

          {errorMessage && (
            <p className="mx-5 mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto bg-background px-5 py-5">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-text-body">
                <LoaderCircle className="mr-2 animate-spin" size={18} />
                Loading conversation
              </div>
            ) : conversation.messages.length > 0 ? (
              <div className="space-y-3">
                {conversation.messages.map((message) => {
                  const adminMessage = isAdminSender(message.sender_type);

                  return (
                    <div
                      className={cn(
                        "flex",
                        adminMessage ? "justify-end" : "justify-start",
                      )}
                      key={message.id}
                    >
                      <div
                        className={cn(
                          "max-w-[78%] rounded-2xl px-4 py-3 shadow-sm",
                          adminMessage
                            ? "rounded-br-md bg-primary text-white"
                            : "rounded-bl-md bg-white text-text-primary",
                        )}
                      >
                        <p className="text-sm leading-6">
                          {message.message_text || "Attachment"}
                        </p>
                        <p
                          className={cn(
                            "mt-2 text-[11px]",
                            adminMessage ? "text-white/65" : "text-text-body",
                          )}
                        >
                          {formatShortDate(message.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-text-body">
                No messages yet.
              </div>
            )}
          </div>

          <form
            className="border-t border-border-soft bg-white px-5 py-4"
            onSubmit={(event) => {
              event.preventDefault();
              void onSend();
            }}
          >
            <div className="flex items-end gap-3">
              <label className="min-w-0 flex-1">
                <span className="sr-only">Reply message</span>
                <textarea
                  className="max-h-32 min-h-11 w-full resize-none rounded-lg bg-background px-4 py-3 text-sm leading-5 outline-none shadow-[inset_0_0_0_1px_rgba(237,241,239,0.95)] transition focus:shadow-[inset_0_0_0_2px_rgba(22,120,70,0.25)]"
                  onChange={(event) => onDraftChange(event.target.value)}
                  placeholder="Write a reply..."
                  rows={1}
                  style={{
                    height: `${Math.min(
                      128,
                      Math.max(44, 44 + Math.max(draft.split("\n").length - 1, 0) * 20),
                    )}px`,
                    overflowY:
                      draft.split("\n").length > 5 || draft.length > 220
                        ? "auto"
                        : "hidden",
                  }}
                  value={draft}
                />
              </label>
              <button
                className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-primary text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!draft.trim() || isSending}
                type="submit"
              >
                {isSending ? (
                  <LoaderCircle className="animate-spin" size={18} />
                ) : (
                  <SendHorizontal aria-hidden="true" size={18} />
                )}
              </button>
            </div>
          </form>
        </section>

        {showStudentProfile && (
          <aside className="hidden w-80 shrink-0 border-l border-border-soft bg-white p-5 lg:block">
            <div className="flex items-center gap-3">
              <button
                aria-label="Close student information"
                className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md bg-background text-text-body transition hover:bg-primary-light hover:text-primary"
                onClick={onToggleProfile}
                type="button"
              >
                <ChevronLeft aria-hidden="true" size={18} />
              </button>
              <StudentAvatar
                className="size-12 text-sm"
                imageUrl={student.profile_image_url}
                name={student.full_name}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{student.full_name}</p>
                <p className="mt-1 truncate text-xs text-text-body">
                  {student.matricule}
                </p>
              </div>
            </div>

            <dl className="mt-6 grid gap-4 text-sm">
              <DetailItem label="Phone" value={student.phone_number} />
              <DetailItem label="Faculty" value={student.faculty} />
              <DetailItem label="Department" value={student.department} />
              <DetailItem label="Level" value={String(student.level)} />
              <DetailItem label="Fee status" value={formatStatusLabel(student.fee_status)} />
              <DetailItem label="Account" value={student.is_active ? "Active" : "Inactive"} />
            </dl>

            {conversation.complaints && (
              <div className="mt-6 rounded-lg bg-background p-4">
                <p className="text-sm font-semibold">Complaint</p>
                <p className="mt-2 text-xs leading-5 text-text-body">
                  {conversation.complaints.description}
                </p>
              </div>
            )}
          </aside>
        )}
      </article>
    </div>
  );
}

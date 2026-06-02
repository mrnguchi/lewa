"use client";

import {
  LoaderCircle,
  ReceiptText,
  RefreshCw,
  X,
} from "lucide-react";

import type { AdminSchoolPayment } from "@/lib/admin-api";

import type {
  PaymentModalMode,
  RecentDeleteTarget,
} from "../../types";
import {
  formatMoney,
  formatNumber,
  formatShortDate,
  formatStatusLabel,
} from "../../utils/formatters";
import {
  DetailItem,
  StatusPill,
  StudentAvatar,
} from "../ui/AdminPrimitives";

export function PaymentActionModal({
  actionPaymentId,
  errorMessage,
  isLoading,
  mode,
  onAction,
  onClose,
  payments,
}: {
  actionPaymentId: string | null;
  errorMessage: string;
  isLoading: boolean;
  mode: PaymentModalMode;
  onAction: (payment: AdminSchoolPayment) => Promise<void>;
  onClose: () => void;
  payments: AdminSchoolPayment[];
}) {
  const isPendingMode = mode === "pending";
  const title = isPendingMode ? "Pending Payments" : "Receipt Gap";
  const subtitle = isPendingMode
    ? "Payments awaiting Campay confirmation."
    : "Successful fee payments without receipts.";
  const emptyText = isPendingMode
    ? "No pending payments awaiting confirmation."
    : "No successful payments are missing receipts.";
  const actionLabel = isPendingMode ? "Check Campay" : "Generate receipt";
  const ActionIcon = isPendingMode ? RefreshCw : ReceiptText;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/45 px-4 py-6 backdrop-blur-sm">
      <article className="dashboard-card flex max-h-[min(44rem,calc(100vh-3rem))] w-full max-w-3xl flex-col overflow-hidden">
        <header className="flex items-start justify-between gap-4 border-b border-border-soft px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-text-body">{subtitle}</p>
          </div>
          <button
            aria-label="Close modal"
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md bg-background text-text-body transition hover:bg-primary-light hover:text-primary"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </header>

        {errorMessage && (
          <p className="mx-5 mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <div className="flex min-h-48 items-center justify-center text-sm text-text-body">
              <LoaderCircle className="mr-2 animate-spin" size={18} />
              Loading payments
            </div>
          ) : payments.length > 0 ? (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div
                  className="rounded-lg bg-background p-4 transition hover:shadow-[0_12px_28px_rgba(31,41,51,0.08)]"
                  key={payment.id}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{payment.reference_id}</p>
                        <StatusPill label={formatStatusLabel(payment.status)} />
                      </div>
                      <p className="mt-2 text-sm text-text-body">
                        {payment.students.full_name} - {payment.students.matricule}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-body">
                        <span>{formatMoney(payment.amount)} XAF</span>
                        <span>{payment.academic_year}</span>
                        <span>
                          {isPendingMode
                            ? formatShortDate(payment.created_at)
                            : formatShortDate(payment.paid_at ?? payment.created_at)}
                        </span>
                      </div>
                    </div>

                    <button
                      className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-65"
                      disabled={Boolean(actionPaymentId)}
                      onClick={() => onAction(payment)}
                      type="button"
                    >
                      {actionPaymentId === payment.id ? (
                        <LoaderCircle className="animate-spin" size={16} />
                      ) : (
                        <ActionIcon aria-hidden="true" size={16} />
                      )}
                      {actionLabel}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-48 items-center justify-center rounded-lg bg-background px-4 text-center text-sm text-text-body">
              {emptyText}
            </div>
          )}
        </div>
      </article>
    </div>
  );
}

export function PaymentDetailsModal({
  onClose,
  payment,
}: {
  onClose: () => void;
  payment: AdminSchoolPayment;
}) {
  const receiptCount = payment.receipts?.length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/45 px-4 py-6 backdrop-blur-sm">
      <article className="dashboard-card w-full max-w-lg overflow-hidden">
        <header className="flex items-start justify-between gap-4 border-b border-border-soft px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Payment details</h2>
            <p className="mt-1 text-sm text-text-body">{payment.reference_id}</p>
          </div>
          <button
            aria-label="Close payment details"
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md bg-background text-text-body transition hover:bg-primary-light hover:text-primary"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </header>

        <div className="p-5">
          <div className="rounded-lg bg-text-primary p-4 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-white/60">Amount</p>
                <p className="mt-2 text-2xl font-semibold">
                  {formatMoney(payment.amount)} XAF
                </p>
              </div>
              <StatusPill label={formatStatusLabel(payment.status)} />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-lg bg-background p-4">
            <StudentAvatar
              className="size-11 text-sm"
              imageUrl={payment.students.profile_image_url}
              name={payment.students.full_name}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {payment.students.full_name}
              </p>
              <p className="mt-1 truncate text-xs text-text-body">
                {payment.students.matricule} - Level {payment.students.level}
              </p>
            </div>
          </div>

          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
            <DetailItem label="Academic year" value={payment.academic_year} />
            <DetailItem
              label="Installment"
              value={formatStatusLabel(payment.fee_installment ?? "Not set")}
            />
            <DetailItem
              label="Payment method"
              value={formatStatusLabel(payment.payment_method)}
            />
            <DetailItem label="Phone" value={payment.phone_number ?? "Not available"} />
            <DetailItem label="Created" value={formatShortDate(payment.created_at)} />
            <DetailItem
              label="Paid at"
              value={payment.paid_at ? formatShortDate(payment.paid_at) : "Not confirmed"}
            />
            <DetailItem
              label="Provider ref."
              value={payment.provider_reference ?? "Not available"}
            />
            <DetailItem label="Receipts" value={formatNumber(receiptCount)} />
            <DetailItem label="Faculty" value={payment.students.faculty} />
            <DetailItem label="Department" value={payment.students.department} />
          </dl>

          {receiptCount === 0 && (
            <p className="mt-5 rounded-lg bg-background px-3 py-3 text-sm leading-6 text-text-body">
              {payment.status === "successful"
                ? "No receipt has been generated for this successful payment yet."
                : "Receipts are only generated after a fee payment is successful."}
            </p>
          )}
        </div>
      </article>
    </div>
  );
}

export function DeleteRecordModal({
  isDeleting,
  onCancel,
  onConfirm,
  target,
}: {
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  target: RecentDeleteTarget;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/45 px-4 py-6 backdrop-blur-sm">
      <article className="dashboard-card w-full max-w-md p-5">
        <h2 className="text-lg font-semibold">Delete record?</h2>
        <p className="mt-2 text-sm leading-6 text-text-body">
          This will remove{" "}
          <span className="font-semibold text-text-primary">{target.label}</span>
          {target.type === "payment"
            ? ". Only failed or untriggered pending payments without receipts can be deleted."
            : " and its support conversation."}
        </p>

        <div className="mt-6 flex justify-end gap-2">
          <button
            className="h-10 cursor-pointer rounded-md bg-background px-4 text-sm font-semibold text-text-body transition hover:bg-primary-light hover:text-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDeleting}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md bg-error px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDeleting}
            onClick={() => void onConfirm()}
            type="button"
          >
            {isDeleting && <LoaderCircle className="animate-spin" size={16} />}
            Delete
          </button>
        </div>
      </article>
    </div>
  );
}

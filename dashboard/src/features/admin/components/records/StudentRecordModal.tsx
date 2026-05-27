"use client";

import {
  ArrowLeft,
  ChevronRight,
  LoaderCircle,
  ReceiptText,
  X,
} from "lucide-react";

import type {
  AdminSchoolReceipt,
  StudentSummary,
} from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import {
  DetailItem,
  StatusPill,
  StudentAvatar,
} from "@/features/admin/components/ui/AdminPrimitives";
import {
  formatMoney,
  formatShortDate,
  formatStatusLabel,
} from "@/features/admin/utils/formatters";

type StudentRecordModalProps = {
  errorMessage: string;
  isLoadingReceipts: boolean;
  isReceiptView: boolean;
  onBack: () => void;
  onClose: () => void;
  onOpenReceipts: () => void;
  receipts: AdminSchoolReceipt[];
  student: StudentSummary;
};

export function StudentRecordModal({
  errorMessage,
  isLoadingReceipts,
  isReceiptView,
  onBack,
  onClose,
  onOpenReceipts,
  receipts,
  student,
}: StudentRecordModalProps) {
  const canViewReceipts = ["PAID", "PARTIAL"].includes(student.fee_status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/35 px-4 py-6 backdrop-blur-sm">
      <article className="dashboard-card flex max-h-[min(42rem,calc(100vh-3rem))] w-full max-w-xl flex-col overflow-hidden">
        <header className="flex items-start justify-between gap-4 border-b border-border-soft px-5 py-4">
          <div className="min-w-0">
            {isReceiptView && (
              <button
                className="mb-3 inline-flex cursor-pointer items-center gap-2 rounded-md bg-background px-2.5 py-1.5 text-xs font-semibold text-text-body transition hover:bg-primary-light hover:text-primary-dark"
                onClick={onBack}
                type="button"
              >
                <ArrowLeft aria-hidden="true" size={14} />
                Back
              </button>
            )}
            <h2 className="text-lg font-semibold">
              {isReceiptView ? "Student receipt" : "Student details"}
            </h2>
            <p className="mt-1 text-sm text-text-body">{student.matricule}</p>
          </div>
          <button
            aria-label="Close student details"
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md bg-background text-text-body transition hover:bg-primary-light hover:text-primary"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {isReceiptView ? (
            <ReceiptPage
              errorMessage={errorMessage}
              isLoading={isLoadingReceipts}
              receipts={receipts}
              student={student}
            />
          ) : (
            <StudentDetailsPage
              canViewReceipts={canViewReceipts}
              onOpenReceipts={onOpenReceipts}
              student={student}
            />
          )}
        </div>
      </article>
    </div>
  );
}

function StudentDetailsPage({
  canViewReceipts,
  onOpenReceipts,
  student,
}: {
  canViewReceipts: boolean;
  onOpenReceipts: () => void;
  student: StudentSummary;
}) {
  return (
    <div>
      <div className="rounded-lg bg-background p-4">
        <div className="flex items-center gap-3">
          <StudentAvatar
            className="size-12 text-sm"
            imageUrl={student.profile_image_url}
            name={student.full_name}
          />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">
              {student.full_name}
            </p>
            <p className="mt-1 text-sm text-text-body">
              Level {student.level} - {student.phone_number}
            </p>
          </div>
        </div>
      </div>

      <button
        className={cn(
          "mt-4 flex w-full items-center justify-between gap-4 rounded-lg px-4 py-3 text-left transition",
          canViewReceipts
            ? "cursor-pointer bg-text-primary text-white shadow-[0_14px_30px_rgba(31,41,51,0.16)] hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(31,41,51,0.2)]"
            : "cursor-not-allowed bg-background text-text-body",
        )}
        disabled={!canViewReceipts}
        onClick={onOpenReceipts}
        type="button"
      >
        <span>
          <span className="block text-sm font-semibold">
            {formatStatusLabel(student.fee_status)}
          </span>
          <span
            className={cn(
              "mt-1 block text-xs",
              canViewReceipts ? "text-white/62" : "text-text-body",
            )}
          >
            {canViewReceipts ? "View receipt" : "No receipt available yet"}
          </span>
        </span>
        <ChevronRight aria-hidden="true" size={18} />
      </button>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <DetailItem label="Faculty" value={student.faculty} />
        <DetailItem label="Department" value={student.department} />
        <DetailItem label="Matricule" value={student.matricule} />
        <DetailItem label="Phone number" value={student.phone_number} />
        <DetailItem label="Level" value={`Level ${student.level}`} />
        <div>
          <dt className="text-xs font-medium text-text-body">Account</dt>
          <dd className="mt-1">
            <StatusPill label={student.is_active ? "Active" : "Inactive"} />
          </dd>
        </div>
      </dl>
    </div>
  );
}

function ReceiptPage({
  errorMessage,
  isLoading,
  receipts,
  student,
}: {
  errorMessage: string;
  isLoading: boolean;
  receipts: AdminSchoolReceipt[];
  student: StudentSummary;
}) {
  if (isLoading) {
    return (
      <div className="flex min-h-72 items-center justify-center text-sm text-text-body">
        <LoaderCircle aria-hidden="true" className="mr-2 animate-spin" size={18} />
        Loading student receipts
      </div>
    );
  }

  if (errorMessage) {
    return (
      <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
        {errorMessage}
      </p>
    );
  }

  if (receipts.length === 0) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-lg bg-background px-5 text-center">
        <div className="max-w-xs">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary-light text-primary">
            <ReceiptText aria-hidden="true" size={22} />
          </div>
          <h3 className="mt-4 font-semibold">No receipt found</h3>
          <p className="mt-2 text-sm leading-6 text-text-body">
            {student.full_name} has a fee status, but no receipt is available in
            this scope yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {receipts.map((receipt) => (
        <article className="rounded-lg bg-background p-4" key={receipt.id}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {receipt.receipt_number}
              </p>
              <p className="mt-1 text-xs text-text-body">
                Issued {formatShortDate(receipt.issued_at)}
              </p>
            </div>
            <StatusPill label={formatStatusLabel(receipt.receipt_type)} />
          </div>

          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <DetailItem
              label="Amount"
              value={`${formatMoney(receipt.amount)} XAF`}
            />
            <DetailItem label="Academic year" value={receipt.academic_year} />
            <DetailItem
              label="Payment reference"
              value={receipt.payments.reference_id}
            />
            <DetailItem
              label="Payment method"
              value={formatStatusLabel(receipt.payments.payment_method)}
            />
            <DetailItem
              label="Installment"
              value={
                receipt.payments.fee_installment
                  ? formatStatusLabel(receipt.payments.fee_installment)
                  : "Not set"
              }
            />
            <DetailItem
              label="Paid at"
              value={formatShortDate(receipt.payments.paid_at ?? receipt.issued_at)}
            />
          </dl>
        </article>
      ))}
    </div>
  );
}

"use client";

import { ExternalLink, X } from "lucide-react";

import type { AdminSchoolReceipt } from "@/lib/admin-api";
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

export function ReceiptRecordModal({
  onClose,
  receipt,
}: {
  onClose: () => void;
  receipt: AdminSchoolReceipt;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/35 px-4 py-6 backdrop-blur-sm">
      <article className="dashboard-card w-full max-w-lg overflow-hidden">
        <header className="flex items-start justify-between gap-4 border-b border-border-soft px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">Receipt details</h2>
            <p className="mt-1 truncate text-sm text-text-body">
              {receipt.receipt_number}
            </p>
          </div>
          <button
            aria-label="Close receipt details"
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md bg-background text-text-body transition hover:bg-primary-light hover:text-primary"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </header>

        <div className="px-5 py-5">
          <div className="rounded-lg bg-text-primary p-4 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-white/62">Amount</p>
                <p className="mt-2 text-2xl font-semibold">
                  {formatMoney(receipt.amount)} XAF
                </p>
              </div>
              <StatusPill label={formatStatusLabel(receipt.receipt_type)} />
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-background p-4">
            <div className="flex items-center gap-3">
              <StudentAvatar
                className="size-11 text-xs"
                imageUrl={receipt.students.profile_image_url}
                name={receipt.students.full_name}
              />
              <div className="min-w-0">
                <p className="truncate font-semibold">
                  {receipt.students.full_name}
                </p>
                <p className="mt-1 text-xs text-text-body">
                  {receipt.students.matricule} - Level {receipt.students.level}
                </p>
              </div>
            </div>
          </div>

          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <DetailItem label="Issued" value={formatShortDate(receipt.issued_at)} />
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
            <DetailItem label="Faculty" value={receipt.students.faculty} />
            <DetailItem label="Department" value={receipt.students.department} />
          </dl>

          {receipt.file_url && (
            <a
              className="mt-5 inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark"
              href={receipt.file_url}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink aria-hidden="true" size={15} />
              Open receipt file
            </a>
          )}
        </div>
      </article>
    </div>
  );
}

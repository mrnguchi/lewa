"use client";

import { cn } from "@/lib/utils";

import { feeStatusChartColors } from "../../constants/dashboard";
import {
  formatNumber,
  getPercent,
} from "../../utils/formatters";

export function PaymentStatusChart({
  rows,
}: {
  rows: {
    label: string;
    value: number;
    tone: string;
    helper: string;
  }[];
}) {
  const maxValue = Math.max(...rows.map((row) => row.value), 1);

  return (
    <div className="chart-panel mt-5 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">Payment status</p>
          <p className="mt-1 text-xs text-text-body">Successful vs pending</p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {rows.map((row) => {
          const percent = getPercent(row.value, maxValue);

          return (
            <div key={row.label}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{row.label}</p>
                  <p className="mt-0.5 text-xs text-text-body">{row.helper}</p>
                </div>
                <p className="text-sm font-semibold">{formatNumber(row.value)}</p>
              </div>
              <div className="mt-2 h-2.5 rounded-full bg-white">
                <div
                  className={cn("h-full rounded-full", row.tone)}
                  style={{ width: `${row.value > 0 ? Math.max(percent, 12) : 0}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function FeeStatusDonut({
  completion,
  items,
  total,
}: {
  completion: number;
  items: {
    status: string;
    value: number;
  }[];
  total: number;
}) {
  let cursor = 0;
  const segments = items.map((item) => {
    const start = cursor;
    const end = start + (total > 0 ? (item.value / total) * 100 : 0);
    cursor = end;

    return `${feeStatusChartColors[item.status]} ${start}% ${end}%`;
  });

  const background =
    total > 0
      ? `conic-gradient(${segments.join(", ")})`
      : "conic-gradient(#edf1ef 0% 100%)";

  return (
    <div className="flex justify-center">
      <div
        aria-hidden="true"
        className="relative size-36 shrink-0 rounded-full"
        style={{ background }}
      >
        <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-white text-center shadow-[inset_0_0_0_1px_rgba(237,241,239,0.85)]">
          <span className="text-2xl font-semibold">{completion}%</span>
          <span className="mt-1 text-[11px] font-medium text-text-body">
            Cleared
          </span>
        </div>
      </div>
    </div>
  );
}

import axios from "axios";
import { z } from "zod";

import { env } from "../../config/env";
import { prisma } from "../../database/prisma";
import type { AdminFeeInsightInput } from "./admin.schema";
import {
  AdminAccessScope,
  getAdminStudentScopeWhere,
  getScopedPaymentWhere,
} from "./admin.service";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DOUALA_OFFSET_MS = 60 * 60 * 1000;
const INSIGHT_CACHE_MS = 5 * 60 * 1000;

type InsightTone = "positive" | "neutral" | "warning";
type InsightSeverity = "low" | "medium" | "high";
type InsightPriority = "now" | "next" | "monitor";

const generatedInsightSchema = z.object({
  headline: z.string().trim().min(1).max(140),
  summary: z.string().trim().min(1).max(700),
  highlights: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(80),
        detail: z.string().trim().min(1).max(260),
        tone: z.enum(["positive", "neutral", "warning"]),
      })
    )
    .max(4),
  risks: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(80),
        detail: z.string().trim().min(1).max(260),
        severity: z.enum(["low", "medium", "high"]),
      })
    )
    .max(4),
  actions: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(80),
        detail: z.string().trim().min(1).max(260),
        priority: z.enum(["now", "next", "monitor"]),
      })
    )
    .max(4),
});

type GeneratedInsight = z.infer<typeof generatedInsightSchema>;

type PeriodWindow = {
  currentEnd: Date;
  currentStart: Date;
  label: string;
  previousEnd: Date;
  previousStart: Date;
};

type CachedInsight = {
  expiresAt: number;
  value: FeeInsightResult;
};

const insightCache = new Map<string, CachedInsight>();

const roundPercent = (value: number) => Math.round(value * 10) / 10;

const getPercent = (value: number, total: number) =>
  total > 0 ? roundPercent((value / total) * 100) : 0;

const startOfDoualaDay = (date: Date) => {
  const shifted = new Date(date.getTime() + DOUALA_OFFSET_MS);

  return new Date(
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate()
    ) - DOUALA_OFFSET_MS
  );
};

// I keep reporting periods aligned with the school day in Cameroon.
function getPeriodWindow(
  period: AdminFeeInsightInput["period"],
  now = new Date()
): PeriodWindow {
  const shifted = new Date(now.getTime() + DOUALA_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth();
  const day = shifted.getUTCDate();
  let currentStart: Date;
  let previousStart: Date;
  let label: string;

  if (period === "daily") {
    currentStart = startOfDoualaDay(now);
    previousStart = new Date(currentStart.getTime() - 24 * 60 * 60 * 1000);
    label = "Today";
  } else if (period === "weekly") {
    const daysSinceMonday = (shifted.getUTCDay() + 6) % 7;
    currentStart = new Date(
      Date.UTC(year, month, day - daysSinceMonday) - DOUALA_OFFSET_MS
    );
    previousStart = new Date(currentStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    label = "This week";
  } else if (period === "monthly") {
    currentStart = new Date(Date.UTC(year, month, 1) - DOUALA_OFFSET_MS);
    previousStart = new Date(Date.UTC(year, month - 1, 1) - DOUALA_OFFSET_MS);
    label = "This month";
  } else {
    currentStart = new Date(Date.UTC(year, 0, 1) - DOUALA_OFFSET_MS);
    previousStart = new Date(Date.UTC(year - 1, 0, 1) - DOUALA_OFFSET_MS);
    label = "This year";
  }

  return {
    currentEnd: now,
    currentStart,
    label,
    previousEnd: currentStart,
    previousStart,
  };
}

function getScopeLabel(
  admin: AdminAccessScope,
  input: AdminFeeInsightInput
) {
  const faculty = input.faculty || admin.faculty || undefined;
  const department = input.department || admin.department || undefined;

  if (department) {
    return {
      department,
      faculty,
      label: `${department}, ${faculty || "University of Buea"}`,
    };
  }

  if (faculty) {
    return {
      faculty,
      label: faculty,
    };
  }

  return {
    label: "General UB Data",
  };
}

function extractOpenAiResponseText(responseData: any) {
  if (typeof responseData?.output_text === "string") {
    return responseData.output_text.trim();
  }

  const output = Array.isArray(responseData?.output) ? responseData.output : [];

  return output
    .flatMap((item: any) =>
      Array.isArray(item?.content)
        ? item.content.map((content: any) =>
            typeof content?.text === "string" ? content.text.trim() : ""
          )
        : []
    )
    .filter(Boolean)
    .join("\n")
    .trim();
}

function createFallbackInsight(snapshot: FeeInsightSnapshot): GeneratedInsight {
  const {
    collectionChangePercent,
    failedCount,
    feeClearancePercent,
    pendingCount,
    receiptCoveragePercent,
    successfulAmount,
  } = snapshot.metrics;
  const collectionDirection =
    collectionChangePercent === null
      ? "There is no earlier collection baseline for this period."
      : collectionChangePercent >= 0
        ? `Collections are ${collectionChangePercent}% above the previous comparable period.`
        : `Collections are ${Math.abs(collectionChangePercent)}% below the previous comparable period.`;

  const highlights: GeneratedInsight["highlights"] = [
    {
      detail: `${successfulAmount.toLocaleString()} XAF has been confirmed during the selected period.`,
      title: "Confirmed collections",
      tone: successfulAmount > 0 ? "positive" : "neutral",
    },
    {
      detail: `${receiptCoveragePercent}% of successful payments have matching receipts.`,
      title: "Receipt coverage",
      tone: receiptCoveragePercent >= 95 ? "positive" : "warning",
    },
    {
      detail: `${feeClearancePercent}% of students in this scope are currently fully cleared.`,
      title: "Student clearance",
      tone: feeClearancePercent >= 70 ? "positive" : "neutral",
    },
  ];

  const risks: GeneratedInsight["risks"] = [];

  if (pendingCount > 0) {
    risks.push({
      detail: `${pendingCount} payment${pendingCount === 1 ? " is" : "s are"} still awaiting a final provider status.`,
      severity: pendingCount >= 10 ? "high" : "medium",
      title: "Pending payment backlog",
    });
  }

  if (failedCount > 0) {
    risks.push({
      detail: `${failedCount} payment attempt${failedCount === 1 ? "" : "s"} failed during this period.`,
      severity: failedCount >= 10 ? "high" : "medium",
      title: "Failed payment attempts",
    });
  }

  if (receiptCoveragePercent < 100) {
    risks.push({
      detail: "Some successful payments do not yet have a matching receipt.",
      severity: receiptCoveragePercent < 80 ? "high" : "medium",
      title: "Receipt reconciliation gap",
    });
  }

  return {
    actions: [
      {
        detail:
          pendingCount > 0
            ? "Reconcile pending Campay references and contact affected students where confirmation is still required."
            : "Continue monitoring provider confirmations to keep the pending queue clear.",
        priority: pendingCount > 0 ? "now" : "monitor",
        title: "Review pending payments",
      },
      {
        detail:
          receiptCoveragePercent < 100
            ? "Generate or reconcile missing receipts for every confirmed fee payment."
            : "Maintain the current one-to-one receipt coverage.",
        priority: receiptCoveragePercent < 100 ? "now" : "monitor",
        title: "Protect receipt coverage",
      },
      {
        detail: "Use the unpaid and partial student lists for targeted fee reminders.",
        priority: "next",
        title: "Follow up on fee clearance",
      },
    ],
    headline:
      successfulAmount > 0
        ? "Fee collections are active, with reconciliation still worth watching."
        : "No confirmed fee collection has been recorded in this period yet.",
    highlights,
    risks,
    summary: `${collectionDirection} The clearest operational priorities are pending-payment follow-up, receipt completeness, and targeted support for students who are not fully cleared.`,
  };
}

const insightJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "summary", "highlights", "risks", "actions"],
  properties: {
    headline: { type: "string" },
    summary: { type: "string" },
    highlights: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "detail", "tone"],
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
          tone: {
            type: "string",
            enum: ["positive", "neutral", "warning"] satisfies InsightTone[],
          },
        },
      },
    },
    risks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "detail", "severity"],
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
          severity: {
            type: "string",
            enum: ["low", "medium", "high"] satisfies InsightSeverity[],
          },
        },
      },
    },
    actions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "detail", "priority"],
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
          priority: {
            type: "string",
            enum: ["now", "next", "monitor"] satisfies InsightPriority[],
          },
        },
      },
    },
  },
} as const;

type FeeInsightSnapshot = {
  breakdowns: {
    collectionByUnit: {
      amount: number;
      count: number;
      name: string;
    }[];
    failureReasons: {
      count: number;
      reason: string;
    }[];
    paymentMethods: {
      amount: number;
      count: number;
      method: string;
      sharePercent: number;
    }[];
  };
  metrics: {
    collectionChangePercent: number | null;
    failedCount: number;
    feeClearancePercent: number;
    missingReceiptCount: number;
    paidStudents: number;
    partialStudents: number;
    pendingCount: number;
    receiptCoveragePercent: number;
    successfulAmount: number;
    successfulCount: number;
    totalStudents: number;
    unpaidStudents: number;
  };
  period: {
    comparisonEnd: string;
    comparisonStart: string;
    end: string;
    label: string;
    start: string;
    value: AdminFeeInsightInput["period"];
  };
  scope: {
    department?: string;
    faculty?: string;
    label: string;
  };
};

export type FeeInsightResult = FeeInsightSnapshot & {
  generatedAt: string;
  insight: GeneratedInsight;
  provider: {
    model?: string;
    source: "openai" | "fallback";
  };
};

async function buildFeeInsightSnapshot(
  admin: AdminAccessScope,
  input: AdminFeeInsightInput
): Promise<FeeInsightSnapshot> {
  const window = getPeriodWindow(input.period);
  const scopeQuery = {
    faculty: input.faculty,
    department: input.department,
  };
  const studentWhere = getAdminStudentScopeWhere(admin, scopeQuery);
  const paymentScope = getScopedPaymentWhere(admin, scopeQuery);
  const successfulCurrentWhere = {
    payment_type: "fee",
    status: "successful",
    paid_at: {
      gte: window.currentStart,
      lte: window.currentEnd,
    },
    ...paymentScope,
  };
  const successfulPreviousWhere = {
    payment_type: "fee",
    status: "successful",
    paid_at: {
      gte: window.previousStart,
      lt: window.previousEnd,
    },
    ...paymentScope,
  };
  const attemptPeriodWhere = {
    payment_type: "fee",
    created_at: {
      gte: window.currentStart,
      lte: window.currentEnd,
    },
    ...paymentScope,
  };

  const [
    totalStudents,
    feeStatusCounts,
    successfulCurrent,
    successfulPrevious,
    pendingCount,
    failedCount,
    currentReceiptCount,
    paymentMethods,
    failureReasons,
    studentCollections,
  ] = await Promise.all([
    prisma.students.count({ where: studentWhere }),
    prisma.students.groupBy({
      by: ["fee_status"],
      where: studentWhere,
      _count: { _all: true },
    }),
    prisma.payments.aggregate({
      where: successfulCurrentWhere,
      _count: { id: true },
      _sum: { amount: true },
    }),
    prisma.payments.aggregate({
      where: successfulPreviousWhere,
      _sum: { amount: true },
    }),
    prisma.payments.count({
      where: {
        ...attemptPeriodWhere,
        status: "pending",
      },
    }),
    prisma.payments.count({
      where: {
        ...attemptPeriodWhere,
        status: "failed",
      },
    }),
    prisma.receipts.count({
      where: {
        receipt_type: "school_fee",
        students: studentWhere,
        payments: successfulCurrentWhere,
      },
    }),
    prisma.payments.groupBy({
      by: ["payment_method"],
      where: successfulCurrentWhere,
      _count: { _all: true },
      _sum: { amount: true },
    }),
    prisma.payments.groupBy({
      by: ["failure_reason"],
      where: {
        ...attemptPeriodWhere,
        status: "failed",
      },
      _count: { _all: true },
      orderBy: {
        _count: {
          failure_reason: "desc",
        },
      },
      take: 5,
    }),
    prisma.payments.groupBy({
      by: ["student_id"],
      where: successfulCurrentWhere,
      _count: { _all: true },
      _sum: { amount: true },
    }),
  ]);

  const collectedStudentIds = studentCollections.map((item) => item.student_id);
  const collectedStudents =
    collectedStudentIds.length > 0
      ? await prisma.students.findMany({
          where: {
            id: {
              in: collectedStudentIds,
            },
          },
          select: {
            department: true,
            faculty: true,
            id: true,
            level: true,
          },
        })
      : [];
  const studentById = new Map(
    collectedStudents.map((student) => [student.id, student])
  );
  const scope = getScopeLabel(admin, input);
  const collectionByUnit = new Map<
    string,
    {
      amount: number;
      count: number;
      name: string;
    }
  >();

  studentCollections.forEach((collection) => {
    const student = studentById.get(collection.student_id);

    if (!student) {
      return;
    }

    const name = scope.department
      ? `Level ${student.level}`
      : scope.faculty
        ? student.department
        : student.faculty;
    const current = collectionByUnit.get(name) ?? {
      amount: 0,
      count: 0,
      name,
    };

    current.amount += Number(collection._sum.amount ?? 0);
    current.count += collection._count._all;
    collectionByUnit.set(name, current);
  });

  const feeStatus = feeStatusCounts.reduce<Record<string, number>>(
    (result, item) => {
      result[item.fee_status] = item._count._all;
      return result;
    },
    {}
  );
  const successfulAmount = Number(successfulCurrent._sum.amount ?? 0);
  const previousSuccessfulAmount = Number(
    successfulPrevious._sum.amount ?? 0
  );
  const successfulCount = successfulCurrent._count.id;
  const collectionChangePercent =
    previousSuccessfulAmount > 0
      ? roundPercent(
          ((successfulAmount - previousSuccessfulAmount) /
            previousSuccessfulAmount) *
            100
        )
      : null;

  return {
    breakdowns: {
      collectionByUnit: Array.from(collectionByUnit.values())
        .sort((left, right) => right.amount - left.amount)
        .slice(0, 5),
      failureReasons: failureReasons.map((item) => ({
        count: item._count._all,
        reason: item.failure_reason || "Provider did not return a reason",
      })),
      paymentMethods: paymentMethods
        .map((item) => ({
          amount: Number(item._sum.amount ?? 0),
          count: item._count._all,
          method: item.payment_method,
          sharePercent: getPercent(item._count._all, successfulCount),
        }))
        .sort((left, right) => right.amount - left.amount),
    },
    metrics: {
      collectionChangePercent,
      failedCount,
      feeClearancePercent: getPercent(feeStatus.PAID ?? 0, totalStudents),
      missingReceiptCount: Math.max(successfulCount - currentReceiptCount, 0),
      paidStudents: feeStatus.PAID ?? 0,
      partialStudents: feeStatus.PARTIAL ?? 0,
      pendingCount,
      receiptCoveragePercent: getPercent(
        currentReceiptCount,
        successfulCount
      ),
      successfulAmount,
      successfulCount,
      totalStudents,
      unpaidStudents: feeStatus.NOT_PAID ?? 0,
    },
    period: {
      comparisonEnd: window.previousEnd.toISOString(),
      comparisonStart: window.previousStart.toISOString(),
      end: window.currentEnd.toISOString(),
      label: window.label,
      start: window.currentStart.toISOString(),
      value: input.period,
    },
    scope,
  };
}

async function generateOpenAiInsight(snapshot: FeeInsightSnapshot) {
  if (!env.openAiApiKey) {
    return {
      insight: createFallbackInsight(snapshot),
      provider: {
        source: "fallback" as const,
      },
    };
  }

  const model = env.openAiModel || "gpt-5.4-mini";

  try {
    const response = await axios.post(
      OPENAI_RESPONSES_URL,
      {
        input: [
          "Analyze this University of Buea fee-payment snapshot.",
          "Treat every supplied number as authoritative and do not recalculate or invent figures.",
          "Focus on actionable administrative findings, not generic financial advice.",
          "Mention the selected period and scope naturally.",
          "Keep the summary concise and return no more than four highlights, risks, or actions per section.",
          JSON.stringify(snapshot, null, 2),
        ].join("\n\n"),
        instructions: [
          "You are the Lewa administrative insight analyst.",
          "Explain verified fee-payment patterns clearly for university administrators.",
          "Never expose or infer student identities.",
          "Do not invent causes for payment failures or changes in collection.",
          "When evidence is limited, state that limitation.",
          "Prioritize reconciliation, collection follow-up, receipt integrity, and student support.",
        ].join(" "),
        max_output_tokens: 1400,
        model,
        store: false,
        text: {
          format: {
            description:
              "A concise administrative analysis of verified Lewa fee-payment aggregates.",
            name: "lewa_fee_insight",
            schema: insightJsonSchema,
            strict: true,
            type: "json_schema",
          },
          verbosity: "low",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${env.openAiApiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );
    const outputText = extractOpenAiResponseText(response.data);
    const insight = generatedInsightSchema.parse(JSON.parse(outputText));

    return {
      insight,
      provider: {
        model,
        source: "openai" as const,
      },
    };
  } catch (error) {
    console.error("Failed to generate admin fee insight", error);

    return {
      insight: createFallbackInsight(snapshot),
      provider: {
        model,
        source: "fallback" as const,
      },
    };
  }
}

// I cache identical requests briefly so repeated clicks do not spend another model call.
export async function generateFeeInsight(
  admin: AdminAccessScope,
  input: AdminFeeInsightInput
): Promise<FeeInsightResult> {
  const cacheKey = [
    admin.id,
    input.period,
    input.faculty || admin.faculty || "all",
    input.department || admin.department || "all",
  ].join(":");
  const cached = insightCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const snapshot = await buildFeeInsightSnapshot(admin, input);
  const generated = await generateOpenAiInsight(snapshot);
  const result = {
    ...snapshot,
    generatedAt: new Date().toISOString(),
    ...generated,
  };

  insightCache.set(cacheKey, {
    expiresAt: Date.now() + INSIGHT_CACHE_MS,
    value: result,
  });

  return result;
}

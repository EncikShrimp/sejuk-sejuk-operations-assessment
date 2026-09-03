import { formatRinggit } from "./money";
import type { OrderStatus } from "./types";

export const SUPERVISOR_MIN_VARIANCE_CENTS = 10_000;
export const SUPERVISOR_MIN_VARIANCE_RATIO = 0.5;

export type WorkflowSupervisorFlag = {
  code: "high_price_variance" | "missing_evidence";
  label: string;
  detail: string;
};

export type WorkflowSupervisorInput = {
  status: OrderStatus;
  quotedAmountCents: number;
  finalAmountCents: number;
  evidenceFileCount: number;
};

function isReviewable(status: OrderStatus): boolean {
  return status === "job_done" || status === "reviewed";
}

export function getWorkflowSupervisorFlags(input: WorkflowSupervisorInput): WorkflowSupervisorFlag[] {
  if (!isReviewable(input.status)) return [];

  const flags: WorkflowSupervisorFlag[] = [];
  const varianceCents = input.finalAmountCents - input.quotedAmountCents;
  const varianceRatio = input.quotedAmountCents === 0 ? (input.finalAmountCents > 0 ? Infinity : 0) : varianceCents / input.quotedAmountCents;

  if (varianceCents >= SUPERVISOR_MIN_VARIANCE_CENTS && varianceRatio >= SUPERVISOR_MIN_VARIANCE_RATIO) {
    const percentage = Number.isFinite(varianceRatio) ? `${Math.round(varianceRatio * 100)}%` : "an unquoted amount";
    const detail = Number.isFinite(varianceRatio)
      ? `Final amount is ${formatRinggit(varianceCents)} (${percentage}) above the ${formatRinggit(input.quotedAmountCents)} quote.`
      : `Final amount of ${formatRinggit(input.finalAmountCents)} has no quoted baseline.`;
    flags.push({ code: "high_price_variance", label: "High price variance", detail });
  }

  if (input.evidenceFileCount === 0) {
    flags.push({ code: "missing_evidence", label: "Missing job evidence", detail: "No job-evidence file is recorded for this completed job." });
  }

  return flags;
}

import type { ValidatedToolCall } from "./tool-contracts";

const MONEY_TERMS = /\b(amount|amassed|earn(?:ed|ings)?|money|revenue|takings|total)\b/i;
const PRIVATE_DETAIL_TERMS = /\b(customer|phone|address|receipt|attachment|file)\b/i;
const WORKLOAD_TERMS = /\b(overload(?:ed)?|workload|busy|busiest|capacity)\b/i;
const UNSUPPORTED_WORKLOAD_PERIODS = /\b(today|last week|all time)\b/i;
const WORKFLOW_WATCHLIST_TERMS = /\b(?:need(?:s)?\s+(?:manager\s+)?(?:review|attention)|review\s+(?:queue|watchlist)|workflow\s+(?:issue|alert|supervisor)|missing\s+evidence|price\s+variance)\b/i;

export function completionSummaryCallForQuestion(question: string): Extract<ValidatedToolCall, { name: "get_completion_summary" }> | null {
  if (PRIVATE_DETAIL_TERMS.test(question) || !MONEY_TERMS.test(question)) return null;
  const normalized = question.toLowerCase();
  const period = normalized.includes("last week")
    ? "last_week"
    : normalized.includes("this week") || normalized.includes("weekly")
      ? "this_week"
      : normalized.includes("today")
        ? "today"
        : "all_time";
  return { name: "get_completion_summary", arguments: { period } };
}

export function workloadCallForQuestion(question: string): Extract<ValidatedToolCall, { name: "get_technician_workload" }> | null {
  if (PRIVATE_DETAIL_TERMS.test(question) || UNSUPPORTED_WORKLOAD_PERIODS.test(question) || !WORKLOAD_TERMS.test(question)) return null;
  return { name: "get_technician_workload", arguments: { period: "this_week" } };
}

export function workflowReviewWatchlistCallForQuestion(question: string): Extract<ValidatedToolCall, { name: "get_workflow_review_watchlist" }> | null {
  if (PRIVATE_DETAIL_TERMS.test(question) || !WORKFLOW_WATCHLIST_TERMS.test(question)) return null;
  return { name: "get_workflow_review_watchlist", arguments: {} };
}

import type { ValidatedToolCall } from "./tool-contracts";

const MONEY_TERMS = /\b(amount|amassed|earn(?:ed|ings)?|money|revenue|takings|total)\b/i;
const PRIVATE_DETAIL_TERMS = /\b(customer|phone|address|receipt|attachment|file)\b/i;

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

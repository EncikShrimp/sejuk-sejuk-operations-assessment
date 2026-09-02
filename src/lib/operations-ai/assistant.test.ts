import { describe, expect, it } from "vitest";

import { completionSummaryCallForQuestion } from "./query-intent";

describe("completion-summary question interpretation", () => {
  it("maps the reported count-and-money question to a bounded all-time aggregate", () => {
    expect(completionSummaryCallForQuestion("how many jobs have completed and how much we have amassed? what about the money?")).toEqual({
      name: "get_completion_summary",
      arguments: { period: "all_time" },
    });
  });

  it("uses an explicitly named reporting window", () => {
    expect(completionSummaryCallForQuestion("What revenue did completed jobs earn this week?")).toEqual({
      name: "get_completion_summary",
      arguments: { period: "this_week" },
    });
  });

  it("does not turn a customer-specific money request into an aggregate", () => {
    expect(completionSummaryCallForQuestion("How much money did customer Ahmad pay?")).toBeNull();
  });
});

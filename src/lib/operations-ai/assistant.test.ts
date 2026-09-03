import { describe, expect, it } from "vitest";

import { completionSummaryCallForQuestion, workflowReviewWatchlistCallForQuestion, workloadCallForQuestion } from "./query-intent";

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

describe("workload question interpretation", () => {
  it("maps an overload question to the current-week workload tool", () => {
    expect(workloadCallForQuestion("Which technician might be overloaded this week?")).toEqual({
      name: "get_technician_workload",
      arguments: { period: "this_week" },
    });
  });

  it("does not expand the workload capability to other reporting periods", () => {
    expect(workloadCallForQuestion("Who was overloaded last week?")).toBeNull();
  });
});

describe("workflow watchlist question interpretation", () => {
  it("maps Manager review questions to the zero-argument watchlist", () => {
    expect(workflowReviewWatchlistCallForQuestion("Which completed jobs need Manager review?")).toEqual({
      name: "get_workflow_review_watchlist",
      arguments: {},
    });
  });

  it("rejects private-detail requests instead of turning them into watchlists", () => {
    expect(workflowReviewWatchlistCallForQuestion("Which customer needs review?")).toBeNull();
  });
});

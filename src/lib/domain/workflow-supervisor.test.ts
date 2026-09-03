import { describe, expect, it } from "vitest";

import { getWorkflowSupervisorFlags } from "./workflow-supervisor";

describe("workflow supervisor", () => {
  it("flags a completed job with a material final-price variance", () => {
    expect(
      getWorkflowSupervisorFlags({ status: "job_done", quotedAmountCents: 18_000, finalAmountCents: 42_000, evidenceFileCount: 2 }),
    ).toEqual([
      {
        code: "high_price_variance",
        label: "High price variance",
        detail: "Final amount is RM240.00 (133%) above the RM180.00 quote.",
      },
    ]);
  });

  it("flags a completed job without job evidence", () => {
    expect(
      getWorkflowSupervisorFlags({ status: "reviewed", quotedAmountCents: 18_000, finalAmountCents: 18_000, evidenceFileCount: 0 }),
    ).toEqual([
      {
        code: "missing_evidence",
        label: "Missing job evidence",
        detail: "No job-evidence file is recorded for this completed job.",
      },
    ]);
  });

  it("does not flag small variance, closed work, or receipts as job evidence", () => {
    expect(getWorkflowSupervisorFlags({ status: "job_done", quotedAmountCents: 18_000, finalAmountCents: 20_000, evidenceFileCount: 1 })).toEqual([]);
    expect(getWorkflowSupervisorFlags({ status: "closed", quotedAmountCents: 18_000, finalAmountCents: 42_000, evidenceFileCount: 0 })).toEqual([]);
  });
});

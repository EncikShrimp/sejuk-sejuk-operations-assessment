import { describe, expect, it } from "vitest";

import { formatSafeToolResult } from "./tool-results";

describe("safe workload formatting", () => {
  it("labels a workload watchlist as a Manager-review signal and exposes its inputs", () => {
    expect(
      formatSafeToolResult({
        kind: "workload_insight",
        period: "this_week",
        teamAverageActiveJobs: 1,
        workloadThreshold: 2,
        watchlist: [{ technician: "Bala", activeJobs: 3, completedJobs: 1 }],
      } as never),
    ).toBe("Bala is on the workload watchlist this week with 3 active jobs, against a team average of 1.0. The watchlist threshold is 2 active jobs. This is a Manager-review signal, not an automated scheduling decision.");
  });

  it("states that watchlist flags require Manager review without changing a workflow status", () => {
    expect(
      formatSafeToolResult({
        kind: "workflow_review_watchlist",
        jobs: [
          {
            orderNumber: "SSS-2026-00041",
            flags: [{ code: "missing_evidence", label: "Missing job evidence", detail: "0 job-evidence files are attached." }],
          },
        ],
      } as never),
    ).toBe("Manager review watchlist: SSS-2026-00041 — Missing job evidence: 0 job-evidence files are attached. These rule-backed signals do not change workflow status.");
  });
});

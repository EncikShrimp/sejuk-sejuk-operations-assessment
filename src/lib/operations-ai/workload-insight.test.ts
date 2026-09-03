import { describe, expect, it } from "vitest";

import { deriveWorkloadInsight } from "./workload-insight";

describe("workload insight", () => {
  it("places a technician on the watchlist when active work reaches the transparent workload threshold", () => {
    expect(
      deriveWorkloadInsight([
        { technician: "Ali", activeJobs: 1, completedJobs: 2 },
        { technician: "Bala", activeJobs: 3, completedJobs: 1 },
        { technician: "John", activeJobs: 0, completedJobs: 0 },
        { technician: "Yusoff", activeJobs: 0, completedJobs: 1 },
      ]),
    ).toEqual({
      teamAverageActiveJobs: 1,
      workloadThreshold: 2,
      watchlist: [{ technician: "Bala", activeJobs: 3, completedJobs: 1 }],
    });
  });

  it("does not label balanced active work as an overload concern", () => {
    expect(
      deriveWorkloadInsight([
        { technician: "Ali", activeJobs: 2, completedJobs: 1 },
        { technician: "Bala", activeJobs: 2, completedJobs: 0 },
      ]),
    ).toEqual({ teamAverageActiveJobs: 2, workloadThreshold: 3, watchlist: [] });
  });

  it("returns an empty, safe insight when there are no active technicians", () => {
    expect(deriveWorkloadInsight([])).toEqual({ teamAverageActiveJobs: 0, workloadThreshold: 2, watchlist: [] });
  });
});

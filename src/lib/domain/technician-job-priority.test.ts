import { describe, expect, it } from "vitest";

import { prioritizeTechnicianJobs } from "./technician-job-priority";

describe("technician mobile job priority", () => {
  it("places an in-progress job before an earlier assigned job", () => {
    const assigned = { id: "assigned", status: "assigned" as const, scheduledAt: "2026-09-10T08:00:00.000Z" };
    const inProgress = { id: "in-progress", status: "in_progress" as const, scheduledAt: "2026-09-10T12:00:00.000Z" };

    expect(prioritizeTechnicianJobs([assigned, inProgress]).map((job) => job.id)).toEqual(["in-progress", "assigned"]);
  });

  it("orders jobs with the same status by the nearest scheduled visit without mutating input", () => {
    const later = { id: "later", status: "assigned" as const, scheduledAt: "2026-09-10T12:00:00.000Z" };
    const earlier = { id: "earlier", status: "assigned" as const, scheduledAt: "2026-09-10T08:00:00.000Z" };
    const jobs = [later, earlier];

    expect(prioritizeTechnicianJobs(jobs).map((job) => job.id)).toEqual(["earlier", "later"]);
    expect(jobs.map((job) => job.id)).toEqual(["later", "earlier"]);
  });
});

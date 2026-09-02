import { describe, expect, it } from "vitest";

import { canTransition, transitionOrderStatus } from "./workflow";

describe("order workflow", () => {
  it("permits the assessment workflow in sequence", () => {
    expect(canTransition("new", "assigned")).toBe(true);
    expect(canTransition("assigned", "in_progress")).toBe(true);
    expect(canTransition("in_progress", "job_done")).toBe(true);
    expect(canTransition("job_done", "reviewed")).toBe(true);
    expect(canTransition("reviewed", "closed")).toBe(true);
  });

  it("rejects skipped, reversed and terminal transitions", () => {
    expect(canTransition("new", "job_done")).toBe(false);
    expect(canTransition("reviewed", "in_progress")).toBe(false);
    expect(canTransition("closed", "reviewed")).toBe(false);
    expect(() => transitionOrderStatus("assigned", "closed")).toThrow(/not allowed/i);
  });
});

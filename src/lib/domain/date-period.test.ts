import { describe, expect, it } from "vitest";

import { getPeriodBounds } from "./date-period";

describe("AI reporting periods", () => {
  it("uses Monday as the beginning of this week in Malaysia business time", () => {
    const now = new Date("2026-09-02T06:30:00.000Z"); // Wednesday, 2:30 PM in Kuala Lumpur
    const bounds = getPeriodBounds("this_week", now);

    expect(bounds.start.toISOString()).toBe("2026-08-30T16:00:00.000Z");
    expect(bounds.end.toISOString()).toBe("2026-09-02T16:00:00.000Z");
  });

  it("returns the previous complete Monday-Sunday reporting window in Malaysia time", () => {
    const bounds = getPeriodBounds("last_week", new Date("2026-09-02T06:30:00.000Z"));

    expect(bounds.start.toISOString()).toBe("2026-08-23T16:00:00.000Z");
    expect(bounds.end.toISOString()).toBe("2026-08-30T16:00:00.000Z");
  });

  it("anchors today at Malaysia midnight across a UTC date boundary", () => {
    // 16:30 UTC is 00:30 the following day in Asia/Kuala_Lumpur.
    const bounds = getPeriodBounds("today", new Date("2026-09-01T16:30:00.000Z"));

    expect(bounds.start.toISOString()).toBe("2026-09-01T16:00:00.000Z");
    expect(bounds.end.toISOString()).toBe("2026-09-02T16:00:00.000Z");
  });
});

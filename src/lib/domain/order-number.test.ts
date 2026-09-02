import { describe, expect, it } from "vitest";

import { formatOrderNumber, isOrderNumber } from "./order-number";

describe("order numbers", () => {
  it("creates a fixed-width order number from a date and sequence", () => {
    expect(formatOrderNumber(new Date("2026-09-02T10:00:00+08:00"), 42)).toBe("SSS-2026-00042");
  });

  it("recognises the system order number shape", () => {
    expect(isOrderNumber("SSS-2026-00042")).toBe(true);
    expect(isOrderNumber("ORDER1234")).toBe(false);
    expect(isOrderNumber("SSS-202-00042")).toBe(false);
  });
});

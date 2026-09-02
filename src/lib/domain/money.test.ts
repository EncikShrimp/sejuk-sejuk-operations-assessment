import { describe, expect, it } from "vitest";

import { calculateFinalAmount, centsFromInput, formatRinggit } from "./money";

describe("money domain rules", () => {
  it("converts a decimal input into integer cents without floating-point drift", () => {
    expect(centsFromInput("120.50")).toBe(12050);
    expect(centsFromInput("0")).toBe(0);
    expect(centsFromInput("1.005")).toBe(101);
  });

  it("rejects negative, blank and malformed money input", () => {
    expect(() => centsFromInput("-1")).toThrow();
    expect(() => centsFromInput("")).toThrow();
    expect(() => centsFromInput("12.3.4")).toThrow();
  });

  it("calculates final amount exclusively from quote and extra charges", () => {
    expect(calculateFinalAmount({ quotedAmountCents: 18500, extraChargesCents: 2500 })).toBe(21000);
    expect(() => calculateFinalAmount({ quotedAmountCents: 18500, extraChargesCents: -1 })).toThrow();
  });

  it("formats Malaysian Ringgit for human-facing UI", () => {
    expect(formatRinggit(21000)).toBe("RM210.00");
  });
});

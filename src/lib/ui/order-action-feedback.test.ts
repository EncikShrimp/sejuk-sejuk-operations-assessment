import { describe, expect, it } from "vitest";

import { getManagerEvidenceFeedback, getOrderActionFeedback } from "./order-action-feedback";

describe("getOrderActionFeedback", () => {
  it("replaces only the initiating close action with a pending label", () => {
    expect(getOrderActionFeedback({ orderId: "order-1", action: "close", fallbackLabel: "Close job", pending: [{ orderId: "order-1", action: "close" }] })).toEqual({
      label: "Closing…",
      pending: true,
    });
  });

  it("does not make a different order or action appear pending", () => {
    expect(getOrderActionFeedback({ orderId: "order-2", action: "close", fallbackLabel: "Close job", pending: [{ orderId: "order-1", action: "close" }] })).toEqual({
      label: "Close job",
      pending: false,
    });
    expect(getOrderActionFeedback({ orderId: "order-1", action: "review", fallbackLabel: "Mark reviewed", pending: [{ orderId: "order-1", action: "close" }] })).toEqual({
      label: "Mark reviewed",
      pending: false,
    });
  });
});

describe("getManagerEvidenceFeedback", () => {
  it("reports absence as a job-evidence file state rather than a completion event", () => {
    expect(getManagerEvidenceFeedback(0)).toEqual({ label: "Job-evidence files", value: "None recorded" });
  });

  it("reports the stored job-evidence file count", () => {
    expect(getManagerEvidenceFeedback(2)).toEqual({ label: "Job-evidence files", value: "2 recorded" });
  });
});

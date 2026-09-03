import { describe, expect, it } from "vitest";

import { sortOrdersNewestCreatedFirst } from "./order-sort";
import type { ServiceOrder } from "./types";

function order(id: string, createdAt: string): ServiceOrder {
  return {
    id,
    orderNumber: id,
    status: "assigned",
    customerName: "Demo customer",
    customerPhone: "0123456789",
    address: "Demo address",
    issue: "Demo issue",
    serviceType: "General servicing",
    quotedAmountCents: 0,
    extraChargesCents: 0,
    finalAmountCents: 0,
    assignedTechnicianId: null,
    assignedTechnicianName: null,
    adminNotes: null,
    scheduledAt: createdAt,
    completedAt: null,
    createdAt,
    auditEvents: [],
  };
}

describe("order register sorting", () => {
  it("shows the most recently created order first without mutating the source array", () => {
    const orders = [
      order("oldest", "2026-09-01T00:00:00.000Z"),
      order("newest", "2026-09-03T00:00:00.000Z"),
      order("middle", "2026-09-02T00:00:00.000Z"),
    ];

    expect(sortOrdersNewestCreatedFirst(orders).map((item) => item.id)).toEqual(["newest", "middle", "oldest"]);
    expect(orders.map((item) => item.id)).toEqual(["oldest", "newest", "middle"]);
  });

  it("uses the generated order number as a deterministic newest-first tie-breaker for batch fixtures", () => {
    const createdAt = "2026-09-02T00:00:00.000Z";

    expect(sortOrdersNewestCreatedFirst([order("SSS-2026-00039", createdAt), order("SSS-2026-00041", createdAt), order("SSS-2026-00040", createdAt)]).map((item) => item.orderNumber)).toEqual(["SSS-2026-00041", "SSS-2026-00040", "SSS-2026-00039"]);
  });
});

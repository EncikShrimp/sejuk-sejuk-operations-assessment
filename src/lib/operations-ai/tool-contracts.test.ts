import { describe, expect, it } from "vitest";

import { validateToolCall } from "./tool-contracts";

describe("operations AI tool contracts", () => {
  it("accepts the approved, bounded completed-jobs query", () => {
    expect(
      validateToolCall({
        name: "get_completed_jobs",
        arguments: { technician: "Ali", period: "last_week" },
      }),
    ).toEqual({ name: "get_completed_jobs", arguments: { technician: "Ali", period: "last_week" } });
  });

  it("accepts only known periods and technicians", () => {
    expect(() =>
      validateToolCall({
        name: "get_completed_jobs",
        arguments: { technician: "Unauthorised", period: "all_time" },
      }),
    ).toThrow();
  });

  it("accepts an aggregate jobs-and-money summary without opening arbitrary data access", () => {
    expect(validateToolCall({ name: "get_completion_summary", arguments: { period: "all_time" } })).toEqual({
      name: "get_completion_summary",
      arguments: { period: "all_time" },
    });
  });

  it("rejects arbitrary tools and SQL-like arguments", () => {
    expect(() =>
      validateToolCall({
        name: "run_sql",
        arguments: { query: "select * from orders" },
      }),
    ).toThrow();
  });

  it("accepts the exactly scoped count query", () => {
    expect(validateToolCall({ name: "count_completed_jobs", arguments: { date: "today" } })).toEqual({
      name: "count_completed_jobs",
      arguments: { date: "today" },
    });
  });
});

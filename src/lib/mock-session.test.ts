import { describe, expect, it } from "vitest";

import { hasMockRole, isMockRole, portalPathForRole } from "./mock-session";

describe("mock assessment session helpers", () => {
  it("recognises only the three assessment roles", () => {
    expect(isMockRole("admin")).toBe(true);
    expect(isMockRole("technician")).toBe(true);
    expect(isMockRole("manager")).toBe(true);
    expect(isMockRole("accounts")).toBe(false);
    expect(isMockRole(undefined)).toBe(false);
  });

  it("maps each role to its dedicated portal route", () => {
    expect(portalPathForRole("admin")).toBe("/admin");
    expect(portalPathForRole("technician")).toBe("/technician");
    expect(portalPathForRole("manager")).toBe("/manager");
  });

  it("checks a requested action against the selected mock role", () => {
    expect(hasMockRole("admin", "admin")).toBe(true);
    expect(hasMockRole("admin", "manager")).toBe(false);
    expect(hasMockRole(undefined, "technician")).toBe(false);
  });
});

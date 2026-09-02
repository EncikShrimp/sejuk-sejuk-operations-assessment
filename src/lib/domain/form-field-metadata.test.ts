import { describe, expect, it } from "vitest";

import { fieldMetadataFor } from "./form-field-metadata";

describe("mobile form field metadata", () => {
  it("supplies mobile autofill and client-safe limits for customer intake", () => {
    expect(fieldMetadataFor("customerName")).toEqual({ autoComplete: "name", maxLength: 120, enterKeyHint: "next" });
    expect(fieldMetadataFor("customerPhone")).toEqual({ autoComplete: "tel", maxLength: 32, enterKeyHint: "next" });
    expect(fieldMetadataFor("address")).toEqual({ autoComplete: "street-address", maxLength: 500, enterKeyHint: "next" });
  });

  it("limits long completion notes and has no unsafe default for unknown fields", () => {
    expect(fieldMetadataFor("workDoneNotes")).toEqual({ maxLength: 3000, enterKeyHint: "next" });
    expect(fieldMetadataFor("unknown")).toBeUndefined();
  });
});

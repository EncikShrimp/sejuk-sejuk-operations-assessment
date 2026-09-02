import { describe, expect, it } from "vitest";

import { evidenceFileLimitMessage } from "./evidence";

describe("evidence selection limits", () => {
  it("allows up to six selected evidence files", () => {
    expect(evidenceFileLimitMessage(0)).toBeNull();
    expect(evidenceFileLimitMessage(6)).toBeNull();
  });

  it("returns a clear local error before submission when the file limit is exceeded", () => {
    expect(evidenceFileLimitMessage(7)).toBe("Choose at most 6 evidence files before marking this job done.");
  });
});

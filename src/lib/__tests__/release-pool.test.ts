import { describe, expect, it } from "vitest";

import { RELEASE_BASIS, RELEASE_LABEL, withoutExcluded } from "../release-pool";
import { PUBLIC_CONTENT_DISCLAIMER } from "../landing-content";

describe("Class 10 automated production release", () => {
  it("names the automated release basis, never a human or official certification", () => {
    expect(RELEASE_BASIS).toBe("FOUNDER_APPROVED_AUTOMATED_PRODUCTION");
    expect(RELEASE_LABEL).toBe("EduOS verified (automated)");
    expect(RELEASE_LABEL.toLowerCase()).not.toContain("expert");
    expect(RELEASE_LABEL.toLowerCase()).not.toContain("certified by");
  });

  it("drops excluded questions from any candidate pool", () => {
    const rows = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(withoutExcluded(rows, new Set(["b"])).map((r) => r.id)).toEqual(["a", "c"]);
    expect(withoutExcluded(rows, new Set()).length).toBe(3);
    expect(withoutExcluded(rows, new Set(["a", "b", "c"])).length).toBe(0);
  });

  it("states EduOS authorship and non-affiliation without claiming endorsement", () => {
    expect(PUBLIC_CONTENT_DISCLAIMER).toContain("EduOS original curriculum-aligned practice");
    expect(PUBLIC_CONTENT_DISCLAIMER).toContain("Automated multi-stage quality verification");
    expect(PUBLIC_CONTENT_DISCLAIMER).toContain(
      "Not affiliated with or endorsed by CBSE or NCERT",
    );
    const lowered = PUBLIC_CONTENT_DISCLAIMER.toLowerCase();
    for (const claim of ["expert-certified", "ncert approved", "cbse approved", "official"]) {
      expect(lowered).not.toContain(claim);
    }
  });
});

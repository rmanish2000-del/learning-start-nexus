import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Assessment safety: EduOS never runs an assessment offline. Every answering
 * surface must disable submission and show the non-dismissible warning while
 * the connection is down, and must never queue answers for background send.
 */
const SURFACES = [
  "src/routes/free-check.$checkId.tsx",
  "src/routes/diagnostic.session.$token.tsx",
  "src/routes/_authenticated/session.$sessionId.tsx",
];

describe("assessment offline gating", () => {
  for (const file of SURFACES) {
    it(`${file} blocks submission and warns while offline`, () => {
      const source = readFileSync(file, "utf8");
      expect(source).toContain("useAssessmentOnline()");
      expect(source).toContain("<AssessmentOfflineNotice online={online} />");
      expect(source).toMatch(/disabled=\{[^}]*!online[^}]*\}/);
      // No background queue / retry of answers is permitted.
      expect(source).not.toMatch(/backgroundSync|queueAnswer|BackgroundSyncPlugin/);
    });
  }
});

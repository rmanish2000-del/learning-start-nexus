import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// @ts-expect-error -- plain ESM helper
import { releaseFingerprint } from "../../../scripts/release-fingerprint.mjs";

const ROOT = resolve(__dirname, "../../..");

describe("release fingerprint", () => {
  it("is deterministic and 64-hex", () => {
    const a = releaseFingerprint(ROOT);
    const b = releaseFingerprint(ROOT);
    expect(a).toEqual(b);
    expect(a.fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(a.releaseId).toBe(`eduos-${a.fingerprint.slice(0, 12)}`);
  });

  it("version endpoint exposes only release ID, fingerprint and build time", () => {
    const src = readFileSync(resolve(ROOT, "src/routes/api/public/version.ts"), "utf8");
    expect(src).not.toMatch(/process\.env|import\.meta\.env/);
    const body = src.slice(src.indexOf("JSON.stringify("), src.indexOf("}),"));
    expect(body.match(/^\s+(\w+):/gm)?.map((k) => k.trim())).toEqual([
      "releaseId:",
      "fingerprint:",
      "builtAt:",
    ]);
  });
});

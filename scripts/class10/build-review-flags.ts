/**
 * Regenerate content/compliance/class-10-2026-27.review-flags.json from the
 * committed 326-item register. Read-only with respect to the database.
 *
 *   bun scripts/class10/build-review-flags.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { detectReviewFlags, type FlagInput } from "../../src/lib/sme-review-flags";

const ROOT = resolve(import.meta.dir, "../..");
const REGISTER = resolve(ROOT, "EDUOS_CLASS_10_FINAL_QUESTION_REGISTER.json");
const OUT = resolve(ROOT, "content/compliance/class-10-2026-27.review-flags.json");

const items = (JSON.parse(readFileSync(REGISTER, "utf8")).items as FlagInput[]).map((i) => ({
  externalRef: i.externalRef,
  subject: i.subject,
  pool: i.pool,
  outcomeId: i.outcomeId,
  prompt: i.prompt,
}));

const flags = detectReviewFlags(items);
writeFileSync(
  OUT,
  `${JSON.stringify(
    {
      generator: "scripts/class10/build-review-flags.ts",
      source: "EDUOS_CLASS_10_FINAL_QUESTION_REGISTER.json",
      itemsScanned: items.length,
      flags,
    },
    null,
    2,
  )}\n`,
);
console.log(`${flags.length} flags written for ${items.length} items -> ${OUT}`);

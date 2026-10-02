// Deterministic compliance validator. Read-only; exits non-zero on failure.
//   bun run scripts/compliance/validate.ts

import { analyse } from "./analysis";
import { VALIDATOR_VERSION } from "../../src/lib/compliance-shared";

const { snapshot, sourceIssues, subjects, overall } = analyse();

console.log(`${VALIDATOR_VERSION} — ${snapshot.board} Class ${snapshot.classLevel} ${snapshot.academicYear}`);
console.log(`source registry: ${sourceIssues.filter((i) => i.level === "error").length} error(s), ${sourceIssues.filter((i) => i.level === "warning").length} warning(s)`);

for (const s of subjects) {
  console.log(`\n== ${s.subject} — ${s.status} (${s.gaps} failing check(s))`);
  for (const g of s.gateResults) {
    console.log(`  ${g.pass ? "PASS" : "FAIL"} ${g.gate}`);
    for (const c of g.checks.filter((c) => !c.pass)) console.log(`       - ${c.id}: ${c.detail}`);
  }
}

console.log(`\nOVERALL: ${overall}`);
process.exit(overall === "COMPLIANT" || overall === "COMPLIANT_WITH_ACCEPTED_LIMITATIONS" ? 0 : 1);

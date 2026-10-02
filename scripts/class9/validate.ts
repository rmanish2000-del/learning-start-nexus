// Wave 1: local validation + import dry run for the Class 9 preparation packs.
//
//   bun run scripts/class9/validate.ts
//
// Read-only. It never touches the database: it re-derives the packs, validates
// them against the pipeline contracts, checks duplicates and integrity, and
// prints the rows an import WOULD write, together with the readiness matrix.

import {
  buildReadinessMatrix,
  checkPackIntegrity,
  curriculumPackSchema,
  flattenOutcomes,
  questionPackSchema,
  requiredQuestionsPerUnit,
  type VolumeGates,
} from "../../src/lib/class9-content-schema";
import { SUBJECTS } from "./authoring";
import { buildPacks } from "./build-packs";

// Gates read from the live catalogue_subjects row for the Class 10 pilot
// subjects (min_questions_per_outcome = 1, diagnostic_target = 20,
// diagnostic_minimum = 5). Class 9 will inherit the same gates.
export const LIVE_GATES: VolumeGates = {
  diagnosticMinimum: 5,
  diagnosticTarget: 20,
  minQuestionsPerOutcome: 1,
};

let failures = 0;

for (const subject of SUBJECTS) {
  const { curriculum, questions } = buildPacks(subject);
  curriculumPackSchema.parse(curriculum);
  questionPackSchema.parse(questions);

  const issues = checkPackIntegrity(curriculum, questions.questions);
  const errors = issues.filter((i) => i.level === "error");
  failures += errors.length;

  const rows = flattenOutcomes(curriculum);
  const matrix = buildReadinessMatrix(curriculum, questions.questions, LIVE_GATES);

  console.log(`\n=== ${subject.subjectKey} (${curriculum.catalogueCode}) ===`);
  console.log(
    `structure: ${curriculum.units.length} units / ` +
      `${curriculum.units.flatMap((u) => u.chapters).length} chapters / ` +
      `${curriculum.units.flatMap((u) => u.chapters.flatMap((c) => c.topics)).length} topics / ` +
      `${rows.length} outcomes / ${rows.reduce((s, r) => s + r.outcome.atoms.length, 0)} atoms / ` +
      `${questions.questions.length} questions`,
  );
  console.log(
    `activation: active=${curriculum.activation.isActive} commercial=${curriculum.activation.commercialStatus} ` +
      `review=${curriculum.activation.reviewState} diagnosticEligible=${curriculum.activation.diagnosticEligible}`,
  );
  console.log(`integrity issues: ${errors.length} error(s), ${issues.length - errors.length} warning(s)`);
  for (const i of issues) console.log(`  [${i.level}] ${i.code}: ${i.detail}`);

  console.log("readiness matrix (unit | outcomes | required | prepared | verified | coverage% | shortfall):");
  for (const m of matrix) {
    console.log(
      `  ${m.unitId} ${m.unitTitle.padEnd(34)} ${String(m.outcomes).padStart(2)} | ` +
        `${String(m.required).padStart(3)} | ${String(m.prepared).padStart(3)} | ${String(m.verified).padStart(3)} | ` +
        `${String(m.outcomeCoveragePct).padStart(3)}% | ${m.shortfall}`,
    );
  }

  const totalRequired = matrix.reduce((s, m) => s + m.required, 0);
  console.log(
    `dry run (no writes): would upsert ${curriculum.units.length} units, ` +
      `${curriculum.units.flatMap((u) => u.chapters).length} chapters, ` +
      `${curriculum.units.flatMap((u) => u.chapters.flatMap((c) => c.topics)).length} topics, ` +
      `${rows.length} outcomes, ${questions.questions.length} draft questions ` +
      `(all status=draft, verification_state=unverified). Required verified total: ${totalRequired}.`,
  );
  console.log(
    `derived requirement per unit = max(2 × diagnostic_target, 2 × outcomes × min_per_outcome, 2 × diagnostic_minimum) ` +
      `→ e.g. ${requiredQuestionsPerUnit(LIVE_GATES, 4)} for a 4-outcome unit`,
  );
}

console.log(`\nVALIDATION: ${failures === 0 ? "PASS" : `FAIL (${failures} error(s))`}`);
if (failures > 0) process.exit(1);

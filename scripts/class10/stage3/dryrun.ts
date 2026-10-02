// Stage 3 dry-run validation: canonical corpus vs staging schema + Engine v1.0.0 rerun.
import fs from "node:fs";
import {
  verifyCorpus,
  AUTO_VERIFICATION_ENGINE_VERSION,
  type AutoVerificationItem,
} from "/dev-server/src/lib/auto-verification-shared.ts";
import { NCERT_OVERLAP_CANDIDATES } from "/dev-server/src/lib/sme-review-shared.ts";

const PKG = "/tmp/rem/EDUOS_REMEDIATION_PACKAGE_V1_CORRECTED";
const corpus = JSON.parse(fs.readFileSync(`${PKG}/EDUOS_ALL_329_ITEM_EXPORT_VALIDATED.json`, "utf8"));
const items: any[] = corpus.items;

const KINDS = new Set([
  "mcq", "true_false", "fill_blank", "short_answer", "case_study",
  "assertion_reason", "data_interpretation", "applied_mcq",
]);
const errors: string[] = [];
const ids = new Set<string>();
const refsByBook = new Map<string, Set<string>>();

for (const it of items) {
  const q = it.question;
  if (ids.has(it.database_id)) errors.push(`duplicate database_id ${it.database_id}`);
  ids.add(it.database_id);
  if (!/^[0-9a-f-]{36}$/.test(it.database_id)) errors.push(`bad uuid ${it.database_id}`);
  if (!KINDS.has(q.type)) errors.push(`bad kind ${q.type} on ${it.external_ref}`);
  if (!(q.difficulty >= 1 && q.difficulty <= 5)) errors.push(`bad difficulty ${it.external_ref}`);
  if (!["approved", "draft", "retired"].includes(it.current_flags.status)) errors.push(`bad status ${it.external_ref}`);
  if (!["verified", "unverified", "rejected"].includes(it.current_flags.verification_state)) errors.push(`bad vstate ${it.external_ref}`);
  if (!q.text || !q.correct_answer || !q.explanation) errors.push(`missing content ${it.external_ref}`);
  const book = it.provenance.source_reference.book_id;
  if (it.external_ref) {
    const set = refsByBook.get(book) ?? new Set<string>();
    if (set.has(it.external_ref)) errors.push(`duplicate external_ref ${it.external_ref}`);
    set.add(it.external_ref);
    refsByBook.set(book, set);
  }
}

const bySubject: Record<string, number> = {};
const byBook: Record<string, number> = {};
for (const it of items) {
  bySubject[it.subject] = (bySubject[it.subject] ?? 0) + 1;
  byBook[it.provenance.source_reference.book_id] = (byBook[it.provenance.source_reference.book_id] ?? 0) + 1;
}

// Engine v1.0.0 rerun over all 329 items.
const engineItems: AutoVerificationItem[] = items.map((it) => ({
  id: it.database_id,
  externalRef: it.external_ref ?? null,
  subject: it.subject,
  kind: it.question.type,
  difficulty: it.question.difficulty,
  prompt: it.question.text,
  stimulus: it.question.stimulus ?? null,
  options: it.question.options ?? null,
  correctAnswer: it.question.correct_answer,
  explanation: it.question.explanation ?? null,
  outcomeCode: it.outcome_code ?? null,
  unitTitle: it.unit_title ?? null,
  chapterTitle: null,
}));
const contaminated = new Set(NCERT_OVERLAP_CANDIDATES.map((c) => c.externalRef));
const verdicts = verifyCorpus(engineItems, contaminated);
const byId = new Map(verdicts.map((v) => [v.questionId, v]));

let agreeStored = 0, agreeRecomputed = 0;
const disagreements: any[] = [];
for (const it of items) {
  const v = byId.get(it.database_id)!;
  if (v.outcome === it.engine_evidence_stored?.outcome) agreeStored += 1;
  if (v.outcome === it.engine_recomputed?.outcome) agreeRecomputed += 1;
  else disagreements.push({ ref: it.external_ref, mine: v.outcome, pkg: it.engine_recomputed?.outcome });
}
const outcomeCounts = verdicts.reduce((a: any, v) => ((a[v.outcome] = (a[v.outcome] ?? 0) + 1), a), {});
// No open-response item may be auto-approved.
const openApproved = verdicts.filter(
  (v) => v.outcome === "auto_approved" &&
    v.checks.some((c) => c.verdict === "not_machine_checkable"),
);

const report = {
  engine_version: AUTO_VERIFICATION_ENGINE_VERSION,
  record_count: items.length,
  unique_ids: ids.size,
  by_subject: bySubject,
  by_book: byBook,
  null_external_ref: items.filter((i) => !i.external_ref).length,
  schema_errors: errors,
  engine_outcome_counts: outcomeCounts,
  agrees_with_stored: agreeStored,
  agrees_with_package_recomputed: agreeRecomputed,
  disagreements,
  open_response_auto_approved: openApproved.length,
  held_with_approved_true: items.filter(
    (i) => i.current_flags.status === "approved" && byId.get(i.database_id)!.outcome === "quarantined",
  ).length,
};
fs.mkdirSync("/tmp/stage3/out", { recursive: true });
fs.writeFileSync("/tmp/stage3/out/dryrun.json", JSON.stringify(report, null, 2));
fs.writeFileSync(
  "/tmp/stage3/out/engine_rerun.json",
  JSON.stringify(verdicts, null, 2),
);
console.log(JSON.stringify({ ...report, disagreements: disagreements.slice(0, 5) }, null, 2));

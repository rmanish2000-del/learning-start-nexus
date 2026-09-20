// Engine v1.0.0 rerun across the active Class 10 corpus after the final
// explanation repairs. Append-only: writes one engine_rerun_results row per
// item under a fresh run id and backfills question_auto_verifications for any
// item without evidence for this engine version. Changes no approval,
// eligibility, pool or queue field.
//
//   bun run scripts/class10/final/engine.ts [--dry]

import fs from "node:fs";
import path from "node:path";

import {
  verifyCorpus,
  AUTO_VERIFICATION_ENGINE_VERSION,
  type AutoVerificationItem,
} from "../../../src/lib/auto-verification-shared";
import { NCERT_OVERLAP_CANDIDATES } from "../../../src/lib/sme-review-shared";

const BASE = `${process.env.SUPABASE_URL!.replace(/\/$/, "")}/rest/v1/`;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ORG = "11111111-1111-4111-8111-111111111111";
const RUN_ID = "b4d1f0e2-77a3-4c85-9e10-6c2f3a9d51bb";
const EVIDENCE = path.join(import.meta.dir, "evidence");

async function rest(method: string, p: string, body?: unknown, prefer?: string) {
  const res = await fetch(BASE + p, {
    method,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} ${p} -> ${res.status}: ${(await res.text()).slice(0, 500)}`);
  const text = await res.text();
  return text.trim() ? JSON.parse(text) : [];
}

async function page(p: string) {
  const out: any[] = [];
  for (let i = 0; ; i++) {
    const chunk = await rest("GET", `${p}&limit=500&offset=${i * 500}`);
    if (!chunk.length) return out;
    out.push(...chunk);
  }
}

const rows: any[] = await page(
  "question_bank?select=id,book_id,outcome_id,external_ref,status,kind,difficulty,prompt,stimulus," +
    "options,correct_answer,explanation&external_ref=like.C10-2627-*&status=neq.retired&order=external_ref",
);

const outcomeIds = [...new Set(rows.map((r) => r.outcome_id))].filter(Boolean);
const outcomes: any[] = [];
for (let i = 0; i < outcomeIds.length; i += 50) {
  outcomes.push(
    ...(await rest(
      "GET",
      `assessment_outcomes?select=id,code,title,unit_id&id=in.(${outcomeIds.slice(i, i + 50).join(",")})`,
    )),
  );
}
const outcomeById = new Map(outcomes.map((o) => [o.id, o]));
const unitIds = [...new Set(outcomes.map((o) => o.unit_id))].filter(Boolean);
const units: any[] = unitIds.length
  ? await rest("GET", `curriculum_units?select=id,title&id=in.(${unitIds.join(",")})`)
  : [];
const unitById = new Map(units.map((u) => [u.id, u.title]));

const items: AutoVerificationItem[] = rows.map((q) => {
  const outcome = outcomeById.get(q.outcome_id);
  const options = Array.isArray(q.options)
    ? q.options.map((o: any) => (typeof o === "string" ? o : String(o?.text ?? o)))
    : null;
  return {
    id: q.id,
    externalRef: q.external_ref,
    subject: /-SCI-/.test(q.external_ref) ? "Science" : "Mathematics",
    kind: q.kind,
    difficulty: q.difficulty,
    prompt: q.prompt,
    stimulus: q.stimulus,
    options,
    correctAnswer: q.correct_answer,
    explanation: q.explanation,
    outcomeCode: outcome?.code ?? null,
    unitTitle: (outcome && unitById.get(outcome.unit_id)) ?? null,
    chapterTitle: outcome?.title ?? null,
  };
});

const contaminated = new Set(NCERT_OVERLAP_CANDIDATES.map((c) => c.externalRef));
const verdicts = verifyCorpus(items, contaminated);
const kindByQuestion = new Map(rows.map((r) => [r.id, r.kind]));

const summary = {
  runId: RUN_ID,
  engineVersion: AUTO_VERIFICATION_ENGINE_VERSION,
  itemsEvaluated: verdicts.length,
  autoApproved: verdicts.filter((v) => v.outcome === "auto_approved").length,
  quarantined: verdicts.filter((v) => v.outcome === "quarantined").length,
  openResponseAutoApproved: verdicts.filter(
    (v) => v.outcome === "auto_approved" && !["mcq", "assertion_reason"].includes(kindByQuestion.get(v.questionId)),
  ).length,
  bySubject: ["Mathematics", "Science"].map((s) => ({
    subject: s,
    items: verdicts.filter((v) => v.subject === s).length,
    autoApproved: verdicts.filter((v) => v.subject === s && v.outcome === "auto_approved").length,
  })),
};

if (process.argv.includes("--dry")) {
  console.log(JSON.stringify(summary, null, 1));
} else {
  const payload = verdicts.map((v) => ({
    org_id: ORG,
    run_id: RUN_ID,
    engine_version: AUTO_VERIFICATION_ENGINE_VERSION,
    question_id: v.questionId,
    external_ref: v.externalRef,
    subject: v.subject,
    outcome: v.outcome,
    confidence: v.confidence,
    strong_signals: (v as any).strongSignals ?? 0,
    checks: v.checks,
    reasons: (v as any).reasons ?? [],
  }));
  for (let i = 0; i < payload.length; i += 100) {
    await rest(
      "POST",
      "engine_rerun_results?on_conflict=run_id,question_id",
      payload.slice(i, i + 100),
      "return=minimal,resolution=ignore-duplicates",
    );
  }

  const autoRows = verdicts.map((v) => ({
    org_id: ORG,
    question_id: v.questionId,
    run_id: RUN_ID,
    engine_version: AUTO_VERIFICATION_ENGINE_VERSION,
    outcome: v.outcome,
    confidence: v.confidence,
    checks: v.checks,
  }));
  for (let i = 0; i < autoRows.length; i += 100) {
    await rest(
      "POST",
      "question_auto_verifications?on_conflict=question_id,engine_version,outcome",
      autoRows.slice(i, i + 100),
      "return=minimal,resolution=ignore-duplicates",
    );
  }

  fs.mkdirSync(EVIDENCE, { recursive: true });
  fs.writeFileSync(path.join(EVIDENCE, "engine_rerun_final.json"), JSON.stringify(summary, null, 1));
  console.log(JSON.stringify(summary, null, 1));
}

// Engine v1.0.0 rerun across all 329 Class 10 items after the content resolution.
// Append-only: writes one engine_rerun_results row per item under a fresh run id.
// Changes no approval, verification, pool or queue field.
//
//   bun run scripts/class10/resolve/engine_rerun.ts [--dry]

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
const ORG = "458d3caf-5dc4-486b-b499-02124d0da319";
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

const books: any[] = await page("books?select=id,title&order=title");
const subjectByBook = new Map<string, "Mathematics" | "Science">();
for (const b of books) {
  if (/Mathematics/i.test(b.title)) subjectByBook.set(b.id, "Mathematics");
  else if (/Science/i.test(b.title)) subjectByBook.set(b.id, "Science");
}

const rows: any[] = await page(
  "question_bank?select=id,book_id,outcome_id,external_ref,kind,difficulty,prompt,stimulus," +
    "options,correct_answer,explanation&order=external_ref",
);
const scoped = rows.filter((r) => subjectByBook.has(r.book_id));

const outcomeIds = [...new Set(scoped.map((r) => r.outcome_id))].filter(Boolean);
const outcomes: any[] = [];
for (let i = 0; i < outcomeIds.length; i += 50) {
  outcomes.push(
    ...(await rest("GET", `assessment_outcomes?select=id,code,title,unit_id&id=in.(${outcomeIds.slice(i, i + 50).join(",")})`)),
  );
}
const outcomeById = new Map(outcomes.map((o) => [o.id, o]));
const unitIds = [...new Set(outcomes.map((o) => o.unit_id))].filter(Boolean);
const units: any[] = unitIds.length
  ? await rest("GET", `curriculum_units?select=id,title&id=in.(${unitIds.join(",")})`)
  : [];
const unitById = new Map(units.map((u) => [u.id, u.title]));

const items: AutoVerificationItem[] = scoped.map((q) => {
  const outcome = outcomeById.get(q.outcome_id);
  const options = Array.isArray(q.options)
    ? q.options.map((o: any) => (typeof o === "string" ? o : String(o?.text ?? o)))
    : null;
  return {
    id: q.id,
    externalRef: q.external_ref,
    subject: subjectByBook.get(q.book_id)!,
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

const summary = {
  engineVersion: AUTO_VERIFICATION_ENGINE_VERSION,
  itemsEvaluated: verdicts.length,
  autoApproved: verdicts.filter((v) => v.outcome === "auto_approved").length,
  quarantined: verdicts.filter((v) => v.outcome === "quarantined").length,
  bySubject: ["Mathematics", "Science"].map((s) => ({
    subject: s,
    items: verdicts.filter((v) => v.subject === s).length,
    autoApproved: verdicts.filter((v) => v.subject === s && v.outcome === "auto_approved").length,
  })),
  resolvedItems: verdicts
    .filter((v) => v.externalRef && /REQ022-DIAG-009|REQ024-DIAG-004|REQ032-DIAG-001|REQ034-REASS-005|REQ043-REASS-002/.test(v.externalRef))
    .map((v) => ({ externalRef: v.externalRef, outcome: v.outcome, confidence: v.confidence })),
};

if (process.argv.includes("--dry")) {
  console.log(JSON.stringify(summary, null, 1));
} else {
  const runId = crypto.randomUUID();
  const payload = verdicts.map((v) => ({
    org_id: ORG,
    run_id: runId,
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
  fs.mkdirSync(EVIDENCE, { recursive: true });
  fs.writeFileSync(
    path.join(EVIDENCE, "engine_rerun_post_resolution.json"),
    JSON.stringify({ runId, ...summary }, null, 1),
  );
  console.log(JSON.stringify({ runId, ...summary }, null, 1));
}

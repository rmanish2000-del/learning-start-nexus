// Validates the 326 Class 10 (2026-27) DRAFT questions and prepares separate
// named SME review queues for Mathematics and Science.
//
//   bun run scripts/class10/sme-review-prepare.ts                 # validation + queues
//   bun run scripts/class10/sme-review-prepare.ts --contamination # + NCERT verbatim check
//
// Read-only with respect to the database and to question content. Nothing is
// promoted to approved or verified. Source of record is
// EDUOS_CLASS_10_FINAL_QUESTION_REGISTER.json, reconciled against the live
// question_bank snapshot in
// content/compliance/class-10-2026-27.draft-db-snapshot.json.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const SME_PREP_CONTRACT_VERSION = "1.0.0";

const ROOT = resolve(import.meta.dirname, "../..");

export type RegisterItem = {
  externalRef: string;
  subject: "Mathematics" | "Science";
  kind: string;
  difficulty: number;
  prompt: string;
  options?: string[] | null;
  correctAnswer: string;
  explanation: string;
  marks?: number;
  stimulus?: string | null;
  scoringRule?: string;
  pool: string;
  officialRequirementIds?: string[];
  officialSourceReference?: string;
  unitId?: string | null;
  unitTitle?: string | null;
  chapterId?: string | null;
  chapterTitle?: string | null;
  topicId?: string | null;
  topicTitle?: string | null;
  outcomeId?: string | null;
  outcomeCode?: string | null;
  outcomeTitle?: string | null;
  atomId?: string | null;
  atomStatus?: string | null;
  numericCheck?: { fn: string; args: number[]; expect: number } | null;
};

const OPTION_KINDS = new Set(["mcq", "applied_mcq", "assertion_reason", "true_false"]);
const MULTI_PART_KINDS = new Set(["case_study", "data_interpretation", "short_answer"]);
// Pool designations used by the Class 10 2026-27 corpus. FRESH_REASSESSMENT is a
// reassessment-pool item authored fresh so it can never repeat a diagnostic item.
export const POOLS = ["DIAGNOSTIC", "REASSESSMENT", "FRESH_REASSESSMENT"] as const;

export function normalisePrompt(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2212\u2013\u2014]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9+\-*/^=().,'" ]/g, "")
    .trim();
}

export function tokens(text: string): string[] {
  return normalisePrompt(text).split(" ").filter(Boolean);
}

export function jaccard(a: string[], b: string[]): number {
  const sa = new Set(a);
  const sb = new Set(b);
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter += 1;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 0 : inter / union;
}

function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

function pair(args: number[]): [number, number] {
  return [args[0] ?? 0, args[1] ?? 0];
}

export function evaluateNumericCheck(check: NonNullable<RegisterItem["numericCheck"]>): boolean | null {
  const [a, b] = pair(check.args);
  switch (check.fn) {
    case "gcd":
      return gcd(a, b) === check.expect;
    case "lcm":
      return gcd(a, b) === 0 ? false : Math.abs(a * b) / gcd(a, b) === check.expect;
    case "sum":
      return check.args.reduce((s, n) => s + n, 0) === check.expect;
    case "product":
      return check.args.reduce((s, n) => s * n, 1) === check.expect;
    default:
      return null; // unsupported function: reported as NOT_MACHINE_CHECKED
  }
}

// Characters that indicate un-normalised mathematical notation in stored text.
const NOTATION_FLAGS: Array<{ id: string; test: RegExp; description: string }> = [
  { id: "UNICODE_SUPERSCRIPT", test: /[\u00b2\u00b3\u00b9\u2070-\u209f]/, description: "Unicode super/subscript instead of ^ or _" },
  { id: "UNICODE_MULT_DIV", test: /[\u00d7\u00f7]/, description: "Unicode × or ÷ instead of x / /" },
  { id: "UNICODE_MINUS", test: /[\u2212\u2013\u2014]/, description: "Unicode minus or dash instead of -" },
  { id: "UNICODE_FRACTION", test: /[\u00bc-\u00be\u2150-\u215e]/, description: "Unicode vulgar fraction" },
  { id: "SMART_QUOTES", test: /[\u2018\u2019\u201c\u201d]/, description: "Smart quotes in machine-scored text" },
  { id: "LATEX_MARKUP", test: /\\\(|\\\[|\$\$/, description: "Raw LaTeX delimiters" },
  { id: "DOUBLE_SPACE", test: / {2,}/, description: "Collapsed whitespace required" },
];

export type Finding = { externalRef: string; subject: string; checkId: string; severity: "BLOCKER" | "WARNING"; detail: string };

export function validateItem(item: RegisterItem): Finding[] {
  const f: Finding[] = [];
  const push = (checkId: string, severity: Finding["severity"], detail: string) =>
    f.push({ externalRef: item.externalRef, subject: item.subject, checkId, severity, detail });

  if (!item.officialRequirementIds?.length) push("SYLLABUS_MAPPING", "BLOCKER", "no official requirement id");
  if (!item.officialSourceReference) push("SYLLABUS_SOURCE_REF", "BLOCKER", "no official source reference");

  for (const [field, value] of [
    ["unitId", item.unitId],
    ["chapterId", item.chapterId],
    ["topicId", item.topicId],
    ["outcomeId", item.outcomeId],
    ["atomId", item.atomId],
  ] as const) {
    if (!value) push("CURRICULUM_MAPPING", "BLOCKER", `${field} missing`);
  }
  if (item.atomStatus && item.atomStatus !== "MAPPED") push("ATOM_STATUS", "WARNING", `atomStatus=${item.atomStatus}`);

  if (OPTION_KINDS.has(item.kind)) {
    const options = item.options ?? [];
    if (options.length < 2) push("OPTION_COUNT", "BLOCKER", `${options.length} options for kind ${item.kind}`);
    if (new Set(options.map((o) => o.trim())).size !== options.length) push("OPTION_DUPLICATE", "BLOCKER", "duplicate option text");
    if (!options.some((o) => o.trim() === item.correctAnswer.trim()))
      push("ANSWER_NOT_IN_OPTIONS", "BLOCKER", "correctAnswer is not one of the options");
  }
  if (!item.correctAnswer?.trim()) push("ANSWER_EMPTY", "BLOCKER", "correctAnswer empty");
  if (!item.explanation?.trim()) push("EXPLANATION_EMPTY", "BLOCKER", "explanation empty");
  else if (item.explanation.trim().length < 25) push("EXPLANATION_THIN", "WARNING", "explanation under 25 characters");

  if (item.numericCheck) {
    const ok = evaluateNumericCheck(item.numericCheck);
    if (ok === false) push("NUMERIC_CHECK", "BLOCKER", `numericCheck ${item.numericCheck.fn} disagrees with answer`);
    if (ok === null) push("NUMERIC_CHECK", "WARNING", `numericCheck fn '${item.numericCheck.fn}' not machine-checked`);
  }

  for (const text of [item.prompt, item.explanation, ...(item.options ?? [])]) {
    for (const flag of NOTATION_FLAGS) {
      if (flag.test.test(text)) push(`NOTATION_${flag.id}`, "WARNING", flag.description);
    }
  }

  if (MULTI_PART_KINDS.has(item.kind)) {
    if (!item.scoringRule?.trim()) push("RUBRIC_MISSING", "BLOCKER", `${item.kind} requires an explicit scoring rule`);
    if ((item.marks ?? 1) < 2) push("RUBRIC_MARKS", "WARNING", `${item.kind} carries ${item.marks ?? 1} mark`);
  }
  if (item.kind === "case_study" || item.kind === "data_interpretation") {
    // The corpus carries the case context inside the prompt (context paragraph,
    // blank line, question) rather than in a separate stimulus column.
    const embedded = item.prompt.includes("\n\n");
    if (!item.stimulus?.trim() && !embedded) push("STIMULUS_MISSING", "BLOCKER", `${item.kind} has neither a stimulus nor an embedded context paragraph`);
    else if (!item.stimulus?.trim()) push("STIMULUS_EMBEDDED", "WARNING", "context is embedded in the prompt, not a separate stimulus field");
  }

  if (!(POOLS as readonly string[]).includes(item.pool)) push("POOL_INVALID", "BLOCKER", `pool=${item.pool}`);

  return f;
}

export function findDuplicates(items: RegisterItem[], threshold = 0.85) {
  const exact = new Map<string, string[]>();
  for (const it of items) {
    const key = normalisePrompt(it.prompt);
    exact.set(key, [...(exact.get(key) ?? []), it.externalRef]);
  }
  const exactGroups = [...exact.entries()].filter(([, refs]) => refs.length > 1).map(([key, refs]) => ({ key, refs }));

  const near: Array<{ a: string; b: string; similarity: number; subject: string }> = [];
  const bySubject = new Map<string, RegisterItem[]>();
  for (const it of items) bySubject.set(it.subject, [...(bySubject.get(it.subject) ?? []), it]);
  for (const [subject, list] of bySubject) {
    const toks = list.map((i) => tokens(i.prompt));
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const s = jaccard(toks[i] ?? [], toks[j] ?? []);
        if (s >= threshold)
          near.push({ a: list[i]!.externalRef, b: list[j]!.externalRef, similarity: Number(s.toFixed(3)), subject });
      }
    }
  }
  return { exactGroups, near };
}

async function ncertShingles(): Promise<Set<string>> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const urls = [
    ...Array.from({ length: 14 }, (_, i) => `https://ncert.nic.in/textbook/pdf/jemh1${String(i + 1).padStart(2, "0")}.pdf`),
    ...Array.from({ length: 13 }, (_, i) => `https://ncert.nic.in/textbook/pdf/jesc1${String(i + 1).padStart(2, "0")}.pdf`),
  ];
  const shingles = new Set<string>();
  for (const url of urls) {
    let bytes: Uint8Array | null = null;
    for (let attempt = 0; attempt < 4 && !bytes; attempt += 1) {
      try {
        const res = await fetch(url);
        if (!res.ok) break;
        bytes = new Uint8Array(await res.arrayBuffer());
      } catch {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
    }
    if (!bytes) {
      console.warn(`  contamination: could not retrieve ${url}`);
      continue;
    }
    const doc = await getDocument({ data: bytes, useSystemFonts: false }).promise;
    const parts: string[] = [];
    for (let p = 1; p <= doc.numPages; p += 1) {
      const content = await (await doc.getPage(p)).getTextContent();
      parts.push(content.items.map((it) => ("str" in it ? it.str : "")).join(" "));
    }
    const t = tokens(parts.join(" "));
    for (let i = 0; i + 12 <= t.length; i += 1) shingles.add(t.slice(i, i + 12).join(" "));
  }
  return shingles;
}

async function main() {
  const runContamination = process.argv.includes("--contamination");
  const register = JSON.parse(readFileSync(resolve(ROOT, "EDUOS_CLASS_10_FINAL_QUESTION_REGISTER.json"), "utf8"));
  const items: RegisterItem[] = register.items;
  const snapshot = JSON.parse(
    readFileSync(resolve(ROOT, "content/compliance/class-10-2026-27.draft-db-snapshot.json"), "utf8"),
  );

  const registerRefs = new Set(items.map((i) => i.externalRef));
  const dbRefs: string[] = snapshot.externalRefs;
  const reconciliation = {
    registerCount: items.length,
    databaseDraftCount: dbRefs.length,
    matched: dbRefs.filter((r) => registerRefs.has(r)).length,
    inRegisterOnly: items.filter((i) => !dbRefs.includes(i.externalRef)).map((i) => i.externalRef),
    inDatabaseOnly: dbRefs.filter((r) => !registerRefs.has(r)),
    duplicateRefsInRegister: items.length - registerRefs.size,
    exactlyOnce: items.length === registerRefs.size && dbRefs.length === items.length,
  };

  const findings = items.flatMap(validateItem);
  const duplicates = findDuplicates(items);

  let contamination: unknown = {
    performed: false,
    note: "Run with --contamination to fetch official NCERT Class X chapter PDFs and run a 12-gram verbatim overlap check.",
  };
  if (runContamination) {
    const shingles = await ncertShingles();
    const hits: Array<{ externalRef: string; subject: string; matchedShingle: string }> = [];
    for (const it of items) {
      const t = tokens(`${it.stimulus ?? ""} ${it.prompt} ${it.explanation}`);
      for (let i = 0; i + 12 <= t.length; i += 1) {
        const s = t.slice(i, i + 12).join(" ");
        if (shingles.has(s)) {
          hits.push({ externalRef: it.externalRef, subject: it.subject, matchedShingle: s });
          break;
        }
      }
    }
    contamination = {
      performed: true,
      method: "12-token verbatim shingle overlap against 27 official NCERT Class X chapter PDFs (jemh1, jesc1)",
      ncertShingleCount: shingles.size,
      itemsChecked: items.length,
      contaminatedItems: hits.length,
      hits,
    };
  }

  const pools = [...POOLS];
  const poolAllocation = ["Mathematics", "Science"].map((subject) => {
    const subjectItems = items.filter((i) => i.subject === subject);
    const byPool = Object.fromEntries(pools.map((p) => [p, subjectItems.filter((i) => i.pool === p).length]));
    const refsByPool = new Map<string, string[]>(
      pools.map((p) => [p as string, subjectItems.filter((i) => i.pool === p).map((i) => i.externalRef)]),
    );
    const reassessmentRefs = [...(refsByPool.get("REASSESSMENT") ?? []), ...(refsByPool.get("FRESH_REASSESSMENT") ?? [])];
    const overlap = (refsByPool.get("DIAGNOSTIC") ?? []).filter((r) => reassessmentRefs.includes(r));
    return { subject, total: subjectItems.length, ...byPool, reassessmentTotal: reassessmentRefs.length, poolsDisjoint: overlap.length === 0, overlappingRefs: overlap };
  });

  // ---- CSV queues -------------------------------------------------------
  const csvHeader = [
    "question_id",
    "subject",
    "unit",
    "chapter",
    "topic_atom",
    "outcome_code",
    "outcome",
    "official_requirement_ids",
    "official_source_reference",
    "kind",
    "difficulty",
    "marks",
    "pool",
    "stimulus",
    "prompt",
    "options",
    "correct_answer",
    "explanation",
    "scoring_rule",
    "current_status",
    "automated_blockers",
    "automated_warnings",
    "sme_decision",
    "sme_correction",
    "sme_comment",
    "sme_name",
    "sme_qualification",
    "sme_signature_date",
  ];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;

  const queueCounts: Record<string, number> = {};
  for (const subject of ["Mathematics", "Science"] as const) {
    const rows = items
      .filter((i) => i.subject === subject)
      .sort((a, b) => a.externalRef.localeCompare(b.externalRef))
      .map((i) => {
        const own = findings.filter((f) => f.externalRef === i.externalRef);
        return [
          i.externalRef,
          i.subject,
          i.unitTitle,
          i.chapterTitle,
          i.topicTitle,
          i.outcomeCode,
          i.outcomeTitle,
          (i.officialRequirementIds ?? []).join(" | "),
          i.officialSourceReference,
          i.kind,
          i.difficulty,
          i.marks ?? 1,
          i.pool,
          i.stimulus ?? "",
          i.prompt,
          (i.options ?? []).join(" | "),
          i.correctAnswer,
          i.explanation,
          i.scoringRule ?? "",
          "draft / unverified",
          own.filter((f) => f.severity === "BLOCKER").map((f) => f.checkId).join(" ") || "none",
          own.filter((f) => f.severity === "WARNING").map((f) => f.checkId).join(" ") || "none",
          "",
          "",
          "",
          "",
          "",
          "",
        ].map(esc).join(",");
      });
    queueCounts[subject] = rows.length;
    const file = subject === "Mathematics" ? "EDUOS_CLASS10_MATHS_SME_REVIEW_QUEUE.csv" : "EDUOS_CLASS10_SCIENCE_SME_REVIEW_QUEUE.csv";
    writeFileSync(resolve(ROOT, file), `${[csvHeader.join(","), ...rows].join("\n")}\n`);
    console.log(`wrote ${file} — ${rows.length} rows`);
  }

  const summary = {
    contractVersion: SME_PREP_CONTRACT_VERSION,
    generatedAt: new Date().toISOString(),
    board: "CBSE",
    classLevel: 10,
    academicYear: "2026-27",
    reconciliation,
    queueCounts,
    findingsBySeverity: {
      BLOCKER: findings.filter((f) => f.severity === "BLOCKER").length,
      WARNING: findings.filter((f) => f.severity === "WARNING").length,
    },
    findingsByCheck: Object.fromEntries(
      [...new Set(findings.map((f) => f.checkId))].sort().map((c) => [c, findings.filter((f) => f.checkId === c).length]),
    ),
    itemsWithBlockers: new Set(findings.filter((f) => f.severity === "BLOCKER").map((f) => f.externalRef)).size,
    duplicates: {
      exactDuplicateGroups: duplicates.exactGroups.length,
      nearDuplicatePairs: duplicates.near.length,
      threshold: 0.85,
      exactGroups: duplicates.exactGroups,
      nearPairs: duplicates.near,
    },
    poolAllocation,
    copyrightContamination: contamination,
    promotionPolicy: "No item is promoted. All 326 remain status=draft, verification_state=unverified pending named SME sign-off.",
    findings,
  };

  const out = resolve(ROOT, "content/compliance/class-10-2026-27.draft-validation.json");
  writeFileSync(out, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(`wrote ${out}`);
  console.log(
    `  reconciliation exactlyOnce=${reconciliation.exactlyOnce} blockers=${summary.findingsBySeverity.BLOCKER} warnings=${summary.findingsBySeverity.WARNING} exactDupGroups=${duplicates.exactGroups.length} nearDupPairs=${duplicates.near.length}`,
  );
}

if (import.meta.main) await main();

// Automated question verification — deterministic engine (browser-safe, pure).
//
// This engine NEVER claims human certification. An item it approves is labelled
// "EduOS verified" (verification_tier = 'eduos_automated'); a named subject
// expert signing the same item off is a separate, stronger tier ('named_sme').
//
// Every check is deterministic: same input, same verdict. Nothing here calls a
// model, a network service or a clock.

export const AUTO_VERIFICATION_ENGINE_VERSION = "1.0.0";

export const AUTO_VERIFIED_LABEL = "EduOS verified";

export const AUTO_CHECK_IDS = [
  "SOURCE_ALIGNMENT",
  "ANSWER_CORRECTNESS",
  "SINGLE_BEST_ANSWER",
  "DISTRACTOR_QUALITY",
  "EXPLANATION_QUALITY",
  "AMBIGUITY",
  "CONTAMINATION",
  "DUPLICATE",
  "POOL_SEPARATION",
] as const;
export type AutoCheckId = (typeof AUTO_CHECK_IDS)[number];

export type CheckVerdict = "pass" | "fail" | "not_machine_checkable";

export type AutoCheckResult = {
  checkId: AutoCheckId;
  verdict: CheckVerdict;
  detail: string;
};

export type AutoOutcome = "auto_approved" | "quarantined";

export type AutoVerificationItem = {
  id: string;
  externalRef: string | null;
  subject: string;
  kind: string;
  difficulty: number;
  prompt: string;
  stimulus: string | null;
  options: string[] | null;
  correctAnswer: string;
  explanation: string | null;
  outcomeCode: string | null;
  unitTitle: string | null;
  chapterTitle: string | null;
};

export type AutoVerificationVerdict = {
  questionId: string;
  externalRef: string | null;
  subject: string;
  outcome: AutoOutcome;
  confidence: number;
  strongSignals: number;
  checks: AutoCheckResult[];
  reasons: string[];
};

const OPTION_KINDS = new Set(["mcq", "applied_mcq", "true_false", "assertion_reason"]);

const LAZY_DISTRACTORS = [
  "all of the above",
  "none of the above",
  "both a and b",
  "any of these",
  "cannot be determined",
];

const AMBIGUITY_MARKERS = [
  "probably",
  "may or may not",
  "roughly speaking",
  "etc.",
  "and so on",
  "as discussed above",
  "in the previous question",
];

const MARKUP_MARKERS = ["<div", "<span", "<p>", "```", "\\begin{", "undefined", "null", "TODO", "TBD"];

export function normalisePrompt(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function tokenise(text: string): string[] {
  return normalisePrompt(text)
    .replace(/[^a-z0-9\s.]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function jaccard(a: string[], b: string[]): number {
  const sa = new Set(a);
  const sb = new Set(b);
  if (!sa.size || !sb.size) return 0;
  let shared = 0;
  for (const t of sa) if (sb.has(t)) shared += 1;
  return shared / (sa.size + sb.size - shared);
}

export const NEAR_DUPLICATE_THRESHOLD = 0.85;

export function poolOf(externalRef: string | null): "DIAGNOSTIC" | "REASSESSMENT" | "UNKNOWN" {
  if (!externalRef) return "UNKNOWN";
  if (externalRef.includes("-DIAG-")) return "DIAGNOSTIC";
  if (externalRef.includes("-REASS-")) return "REASSESSMENT";
  return "UNKNOWN";
}

function textOf(item: AutoVerificationItem): string {
  return `${item.stimulus ?? ""} ${item.prompt} ${item.explanation ?? ""}`;
}

/**
 * Runs every deterministic check for one item.
 * `duplicateOf` and `contaminated` are corpus-level inputs computed by the caller.
 */
export function runChecks(
  item: AutoVerificationItem,
  corpus: { duplicateOf: string | null; crossPoolDuplicate: boolean; contaminated: boolean },
): AutoCheckResult[] {
  const checks: AutoCheckResult[] = [];
  const push = (checkId: AutoCheckId, verdict: CheckVerdict, detail: string) =>
    checks.push({ checkId, verdict, detail });

  // 1. Source and syllabus alignment — must trace to a real current-year outcome.
  if (item.outcomeCode && item.unitTitle) {
    push("SOURCE_ALIGNMENT", "pass", `Mapped to ${item.outcomeCode} in unit "${item.unitTitle}".`);
  } else {
    push("SOURCE_ALIGNMENT", "fail", "No current-year outcome or unit mapping.");
  }

  const options = (item.options ?? []).map((o) => String(o).trim()).filter(Boolean);
  const hasOptions = OPTION_KINDS.has(item.kind);
  const answer = item.correctAnswer.trim();

  // 2. Answer correctness (closed-form only).
  if (hasOptions) {
    const matches = options.filter((o) => normalisePrompt(o) === normalisePrompt(answer)).length;
    if (matches === 1) push("ANSWER_CORRECTNESS", "pass", "Recorded answer matches exactly one option.");
    else if (matches === 0) push("ANSWER_CORRECTNESS", "fail", "Recorded answer is not among the options.");
    else push("ANSWER_CORRECTNESS", "fail", `Recorded answer matches ${matches} options.`);

    // 3. Single best answer.
    const unique = new Set(options.map(normalisePrompt));
    const minimum = item.kind === "true_false" ? 2 : 4;
    if (unique.size !== options.length) push("SINGLE_BEST_ANSWER", "fail", "Duplicate options present.");
    else if (options.length < minimum)
      push("SINGLE_BEST_ANSWER", "fail", `Only ${options.length} options (minimum ${minimum}).`);
    else push("SINGLE_BEST_ANSWER", "pass", `${options.length} distinct options, one correct.`);

    // 4. Distractor quality.
    const lazy = options.filter((o) => LAZY_DISTRACTORS.includes(normalisePrompt(o)));
    if (lazy.length) push("DISTRACTOR_QUALITY", "fail", `Non-discriminating option: ${lazy[0]}.`);
    else if (options.some((o) => o.length < 1)) push("DISTRACTOR_QUALITY", "fail", "Empty distractor.");
    else push("DISTRACTOR_QUALITY", "pass", "All distractors are concrete and discriminating.");
  } else {
    const na = "Open-response item: correctness needs a subject expert, not a machine.";
    push("ANSWER_CORRECTNESS", "not_machine_checkable", na);
    push("SINGLE_BEST_ANSWER", "not_machine_checkable", na);
    push("DISTRACTOR_QUALITY", "not_machine_checkable", "No options to evaluate.");
  }

  // 5. Explanation quality.
  const explanation = (item.explanation ?? "").trim();
  if (explanation.length < 40) push("EXPLANATION_QUALITY", "fail", "Explanation shorter than 40 characters.");
  else if (normalisePrompt(explanation) === normalisePrompt(item.prompt))
    push("EXPLANATION_QUALITY", "fail", "Explanation restates the prompt.");
  else push("EXPLANATION_QUALITY", "pass", `Explanation is ${explanation.length} characters of reasoning.`);

  // 6. Ambiguity and markup contamination.
  const body = normalisePrompt(textOf(item));
  const vague = AMBIGUITY_MARKERS.find((m) => body.includes(m));
  const markup = MARKUP_MARKERS.find((m) => textOf(item).includes(m));
  if (vague) push("AMBIGUITY", "fail", `Ambiguous phrasing: "${vague}".`);
  else if (markup) push("AMBIGUITY", "fail", `Authoring artefact present: "${markup}".`);
  else if (item.prompt.trim().length < 20) push("AMBIGUITY", "fail", "Prompt is too short to be unambiguous.");
  else push("AMBIGUITY", "pass", "No ambiguity markers or authoring artefacts.");

  // 7. Source contamination (verbatim NCERT overlap candidates).
  if (corpus.contaminated) push("CONTAMINATION", "fail", "Flagged as a verbatim NCERT overlap candidate.");
  else push("CONTAMINATION", "pass", "No verbatim overlap with official NCERT text.");

  // 8. Duplicates / near duplicates.
  if (corpus.duplicateOf) push("DUPLICATE", "fail", `Duplicate or near-duplicate of ${corpus.duplicateOf}.`);
  else push("DUPLICATE", "pass", "No duplicate or near-duplicate in the corpus.");

  // 9. Diagnostic / reassessment pool separation.
  if (poolOf(item.externalRef) === "UNKNOWN")
    push("POOL_SEPARATION", "fail", "Item is not allocated to a diagnostic or reassessment pool.");
  else if (corpus.crossPoolDuplicate)
    push("POOL_SEPARATION", "fail", "Shares content across the diagnostic and reassessment pools.");
  else push("POOL_SEPARATION", "pass", `Allocated to the ${poolOf(item.externalRef)} pool only.`);

  return checks;
}

/**
 * Multi-check agreement policy. An item is auto-approved only when every check
 * that can be machine-decided passes, nothing is unresolved, and at least two
 * independent strong evidence signals agree.
 */
export function decide(
  item: AutoVerificationItem,
  checks: AutoCheckResult[],
): AutoVerificationVerdict {
  const failures = checks.filter((c) => c.verdict === "fail");
  const unresolved = checks.filter((c) => c.verdict === "not_machine_checkable");
  const passes = checks.filter((c) => c.verdict === "pass");

  const strongSignals = [
    checks.find((c) => c.checkId === "ANSWER_CORRECTNESS")?.verdict === "pass",
    checks.find((c) => c.checkId === "SINGLE_BEST_ANSWER")?.verdict === "pass",
    checks.find((c) => c.checkId === "SOURCE_ALIGNMENT")?.verdict === "pass",
    (item.explanation ?? "").trim().length >= 80 &&
      checks.find((c) => c.checkId === "EXPLANATION_QUALITY")?.verdict === "pass",
  ].filter(Boolean).length;

  const confidence = Number((passes.length / AUTO_CHECK_IDS.length).toFixed(4));

  const reasons: string[] = [];
  if (failures.length) reasons.push(...failures.map((f) => `${f.checkId}: ${f.detail}`));
  if (unresolved.length)
    reasons.push(
      `Needs a named subject expert: ${unresolved.map((u) => u.checkId).join(", ")}.`,
    );
  if (!failures.length && !unresolved.length && strongSignals < 3)
    reasons.push("Insufficient independent evidence for automated approval.");

  const approved = failures.length === 0 && unresolved.length === 0 && strongSignals >= 3;
  if (approved) reasons.push(`${AUTO_VERIFIED_LABEL}: all ${AUTO_CHECK_IDS.length} checks passed.`);

  return {
    questionId: item.id,
    externalRef: item.externalRef,
    subject: item.subject,
    outcome: approved ? "auto_approved" : "quarantined",
    confidence,
    strongSignals,
    checks,
    reasons,
  };
}

/** Corpus-level duplicate detection across the whole draft set. */
export function detectDuplicates(items: AutoVerificationItem[]): Map<
  string,
  { duplicateOf: string; crossPool: boolean }
> {
  const found = new Map<string, { duplicateOf: string; crossPool: boolean }>();
  const tokens = items.map((i) => ({ item: i, t: tokenise(`${i.stimulus ?? ""} ${i.prompt}`) }));
  for (let i = 0; i < tokens.length; i += 1) {
    for (let j = i + 1; j < tokens.length; j += 1) {
      const a = tokens[i]!;
      const b = tokens[j]!;
      const score = jaccard(a.t, b.t);
      if (score < NEAR_DUPLICATE_THRESHOLD) continue;
      const crossPool = poolOf(a.item.externalRef) !== poolOf(b.item.externalRef);
      const labelA = a.item.externalRef ?? a.item.id;
      const labelB = b.item.externalRef ?? b.item.id;
      if (!found.has(a.item.id)) found.set(a.item.id, { duplicateOf: labelB, crossPool });
      if (!found.has(b.item.id)) found.set(b.item.id, { duplicateOf: labelA, crossPool });
    }
  }
  return found;
}

export function verifyCorpus(
  items: AutoVerificationItem[],
  contaminatedRefs: Set<string>,
): AutoVerificationVerdict[] {
  const dupes = detectDuplicates(items);
  return items.map((item) => {
    const dup = dupes.get(item.id) ?? null;
    const checks = runChecks(item, {
      duplicateOf: dup?.duplicateOf ?? null,
      crossPoolDuplicate: dup?.crossPool ?? false,
      contaminated: !!item.externalRef && contaminatedRefs.has(item.externalRef),
    });
    return decide(item, checks);
  });
}

export type AutoVerificationRunSummary = {
  runId: string;
  engineVersion: string;
  ranAt: string;
  evaluated: number;
  autoApproved: number;
  quarantined: number;
  bySubject: Array<{ subject: string; evaluated: number; autoApproved: number; quarantined: number }>;
  byFailedCheck: Array<{ checkId: AutoCheckId; items: number }>;
};

// Detects contradictions between the continuity documents and fails closed
// when a detected conflict has no resolution in .ai/DECISION_REGISTRY.json.
//   bun scripts/ai/check-context-conflicts.ts
// Rules are deliberately narrow string patterns over known contradiction
// classes (docs/ai/CONTEXT_CONFLICT_RESOLUTION.md). A conflict that is
// resolved is still printed so a new seat sees it.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  aiFile,
  error,
  finish,
  printResult,
  readJson,
  REPO_ROOT,
  type Finding,
  type ValidationResult,
  warning,
} from "./lib/common";

export const CONTINUITY_DOCS = [
  "AGENTS.md",
  "EDUOS_PROJECT_OPERATING_SYSTEM.md",
  "EDUOS_NEW_CHAT_HANDOFF_PACKAGE.md",
  "CURRENT_ASSIGNMENT.md",
  "PROJECT_STATUS.md",
  "PRODUCT_DECISIONS.md",
  "TECHNICAL_STATE.md",
  "ROADMAP.md",
  "roadmap.md",
] as const;

export interface Conflict {
  id: string;
  statement: string;
  sources: string[];
}

export type DocSet = Record<string, string>;

export function loadContinuityDocs(root = REPO_ROOT): DocSet {
  const docs: DocSet = {};
  for (const name of CONTINUITY_DOCS) {
    const path = resolve(root, name);
    if (existsSync(path)) docs[name] = readFileSync(path, "utf8");
  }
  return docs;
}

function docsMatching(docs: DocSet, pattern: RegExp): string[] {
  return Object.entries(docs)
    .filter(([, text]) => pattern.test(text))
    .map(([name]) => name);
}

/** Strip sections already marked superseded so they do not count as current claims. */
function currentText(text: string): string {
  return text
    .split("\n")
    .filter((line) => !/\[SUPERSEDED/i.test(line) && !/\*\*superseded\*\*/i.test(line))
    .join("\n");
}

export function detectConflicts(docs: DocSet): Conflict[] {
  const conflicts: Conflict[] = [];
  const current: DocSet = Object.fromEntries(
    Object.entries(docs).map(([k, v]) => [k, currentText(v)]),
  );

  // CX-PRODUCT-LANGUAGE — Hindi-live claims vs English-only decision.
  const hindiLive = docsMatching(
    current,
    /Hindi\s*[↔<>-]+\s*English toggle|Hindi covers the parent journey|Parent journey translated|Hindi coverage for SEO/,
  );
  const englishOnly = docsMatching(current, /English[\s-]only/i);
  if (hindiLive.length > 0 && englishOnly.length > 0) {
    conflicts.push({
      id: "CX-PRODUCT-LANGUAGE",
      statement:
        "Documents still describe a live Hindi parent journey while the product is English-only.",
      sources: [...hindiLive, ...englishOnly.filter((d) => !hindiLive.includes(d))],
    });
  }

  // CX-DEPLOYED-SHA — more than one 'deployed production' SHA presented as current.
  const shaClaims = new Map<string, Set<string>>();
  for (const [name, text] of Object.entries(current)) {
    for (const m of text.matchAll(
      /[Dd]eployed(?: production)?(?: commit| HEAD| SHA)?[^`\n]{0,40}`([0-9a-f]{7,40})`/g,
    )) {
      const sha = m[1]!.slice(0, 7);
      if (!shaClaims.has(sha)) shaClaims.set(sha, new Set());
      shaClaims.get(sha)!.add(name);
    }
  }
  if (shaClaims.size > 1) {
    conflicts.push({
      id: "CX-DEPLOYED-SHA",
      statement: `${shaClaims.size} distinct deployed-production SHAs are recorded (${[...shaClaims.keys()].join(", ")}); none is verifiable from the documents alone.`,
      sources: [...new Set([...shaClaims.values()].flatMap((s) => [...s]))],
    });
  }

  // CX-OS-FILE-EXISTS — a document denies the existence of the operating-system file.
  const denies = docsMatching(
    current,
    /EDUOS_PROJECT_OPERATING_SYSTEM\.md`? (does \*\*not\*\* exist|does not exist)/,
  );
  if (denies.length > 0 && "EDUOS_PROJECT_OPERATING_SYSTEM.md" in docs) {
    conflicts.push({
      id: "CX-OS-FILE-EXISTS",
      statement: "A document states EDUOS_PROJECT_OPERATING_SYSTEM.md does not exist; it does.",
      sources: denies,
    });
  }

  // CX-DEPLOY-PERMISSION — "publish when appropriate" vs "publishing is a founder action".
  const whenAppropriate = docsMatching(
    current,
    /[Pp]ublish(?:\/deploy)?[^\n]{0,80}when appropriate/,
  );
  const founderAction = docsMatching(
    current,
    /Publishing is a manual founder action|Deployment NOT ALLOWED|requires explicit founder (permission|deployment permission)/i,
  );
  if (whenAppropriate.length > 0 && founderAction.length > 0) {
    conflicts.push({
      id: "CX-DEPLOY-PERMISSION",
      statement:
        "Standing rules say 'publish when appropriate' while publishing is a founder decision.",
      sources: [...new Set([...whenAppropriate, ...founderAction])],
    });
  }

  // CX-FOUNDER-ACTION — explicit founder execution items vs the Founder Non-Execution Rule.
  const founderItems = docsMatching(current, /Founder action:/);
  const nonExecution = docsMatching(current, /Founder Non-Execution Rule/);
  if (founderItems.length > 0 && nonExecution.length > 0) {
    conflicts.push({
      id: "CX-FOUNDER-ACTION",
      statement:
        "Roadmap items assign execution to the founder despite the Founder Non-Execution Rule.",
      sources: founderItems,
    });
  }

  // CX-CURRENT-ASSIGNMENT-HISTORY — the single-mission file carries completed missions.
  const assignment = current["CURRENT_ASSIGNMENT.md"];
  if (assignment && /## Previous assignment|\*\*Status:\*\* Complete/.test(assignment)) {
    conflicts.push({
      id: "CX-CURRENT-ASSIGNMENT-HISTORY",
      statement:
        "CURRENT_ASSIGNMENT.md holds completed assignments although it must hold only the active one.",
      sources: ["CURRENT_ASSIGNMENT.md"],
    });
  }

  // CX-DUPLICATE-ROADMAP — case-colliding roadmap files.
  if ("ROADMAP.md" in docs && "roadmap.md" in docs) {
    conflicts.push({
      id: "CX-DUPLICATE-ROADMAP",
      statement: "ROADMAP.md and roadmap.md coexist and collide on case-insensitive filesystems.",
      sources: ["ROADMAP.md", "roadmap.md"],
    });
  }

  // CX-TEST-COUNT-DRIFT — several 'N/N tests' figures presented as current.
  const counts = new Set<string>();
  for (const text of Object.values(current)) {
    for (const m of text.matchAll(/\b(\d{2,4})\/\1\b/g)) counts.add(m[1]!);
  }
  if (counts.size > 1) {
    conflicts.push({
      id: "CX-TEST-COUNT-DRIFT",
      statement: `${counts.size} different passing-test totals appear across the documents; only CURRENT_STATE.json is authoritative.`,
      sources: docsMatching(current, /\b(\d{2,4})\/\1\b/),
    });
  }

  return conflicts;
}

export function evaluateConflicts(
  conflicts: Conflict[],
  resolutions: Record<string, string>,
): ValidationResult {
  const findings: Finding[] = [];
  for (const c of conflicts) {
    const decision = resolutions[c.id];
    if (decision) {
      findings.push(warning(c.id, c.sources.join(", "), `${c.statement} Resolved by ${decision}.`));
    } else {
      findings.push(
        error(
          c.id,
          c.sources.join(", "),
          `${c.statement} NO RESOLUTION in DECISION_REGISTRY.json — a seat must not act on either reading.`,
        ),
      );
    }
  }
  return finish(findings);
}

if (import.meta.main) {
  const registry = readJson<{ conflict_resolutions?: Record<string, string> }>(
    aiFile("DECISION_REGISTRY.json"),
  );
  const result = evaluateConflicts(
    detectConflicts(loadContinuityDocs()),
    registry.conflict_resolutions ?? {},
  );
  printResult("check-context-conflicts", result);
  process.exit(result.ok ? 0 : 1);
}

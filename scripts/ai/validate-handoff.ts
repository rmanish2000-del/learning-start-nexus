// Fail-closed validator for EduOS handoffs (.ai/HANDOFF_SCHEMA.json plus the
// semantic rules in docs/ai/TOOL_HANDOFF_PROTOCOL.md).
//   bun scripts/ai/validate-handoff.ts <handoff.json|handoff.md>

import { readFileSync } from "node:fs";

import {
  aiFile,
  error,
  finish,
  FULL_SHA,
  isBareFilename,
  printResult,
  readJson,
  type Finding,
  type ValidationResult,
  vagueLocationIssue,
  warning,
} from "./lib/common";
import { validateAgainstSchema } from "./lib/json-schema";
import { parseAssignmentText } from "./validate-assignment";

type Json = Record<string, unknown>;

export function loadHandoffSchema(): Json {
  return readJson<Json>(aiFile("HANDOFF_SCHEMA.json"));
}

const PRODUCTION_VERIFIERS = /api\/public\/version|deployment (id|record)|fingerprint/i;

export function validateHandoff(
  input: unknown,
  schema: Json = loadHandoffSchema(),
): ValidationResult {
  const findings: Finding[] = [];
  for (const issue of validateAgainstSchema(input, schema)) {
    findings.push(error("SCHEMA", issue.path, issue.message));
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) return finish(findings);
  const handoff = input as Json;
  const result = handoff["result"];

  // --- Repository SHA ------------------------------------------------------
  const repo = (handoff["repo"] as Json | undefined) ?? {};
  if (typeof repo["head_sha"] !== "string" || !FULL_SHA.test(repo["head_sha"])) {
    findings.push(
      error(
        "MISSING_REPO_SHA",
        "$.repo.head_sha",
        "handoff must carry the full 40-character head SHA it describes",
      ),
    );
  }

  // --- Production claims ---------------------------------------------------
  const production = (handoff["production"] as Json | undefined) ?? {};
  const prodSha = production["sha"];
  const prodGrade = production["evidence_grade"];
  const prodSource = typeof production["source"] === "string" ? production["source"] : "";
  if (production["touched"] === true) {
    if (typeof prodSha !== "string") {
      findings.push(
        error(
          "PRODUCTION_SHA_MISSING",
          "$.production.sha",
          "production was touched but no deployed SHA is recorded",
        ),
      );
    }
    if (prodGrade !== "verified") {
      findings.push(
        error(
          "PRODUCTION_UNVERIFIED",
          "$.production.evidence_grade",
          "production was touched; the deployed state must be verified, not reported",
        ),
      );
    }
  }
  if (prodGrade === "verified" && !PRODUCTION_VERIFIERS.test(prodSource)) {
    findings.push(
      error(
        "PRODUCTION_UNVERIFIED",
        "$.production.source",
        "a 'verified' production claim must cite /api/public/version, the fingerprint or a deployment record (GV-006)",
      ),
    );
  }
  if (typeof prodSha === "string" && prodGrade === "assumed") {
    findings.push(
      error(
        "PRODUCTION_UNVERIFIED",
        "$.production.evidence_grade",
        "a production SHA cannot be 'assumed'",
      ),
    );
  }

  // --- Evidence grading ----------------------------------------------------
  ((handoff["evidence"] as Json[] | undefined) ?? []).forEach((ev, i) => {
    const path = `$.evidence[${i}]`;
    const claim = typeof ev["claim"] === "string" ? ev["claim"] : "";
    if (ev["grade"] === "verified" && typeof ev["command"] !== "string" && !ev["coordinate"]) {
      findings.push(
        error(
          "EVIDENCE_UNGROUNDED",
          path,
          `"${claim.slice(0, 60)}" is 'verified' but names neither a command nor a coordinate`,
        ),
      );
    }
    const vague = vagueLocationIssue(claim);
    if (vague)
      findings.push(
        error(
          "VAGUE_LOCATION",
          `${path}.claim`,
          `"${claim.slice(0, 60)}" refers to a non-addressable location (${vague})`,
        ),
      );
    if (isBareFilename(claim))
      findings.push(
        error("FILENAME_ONLY_REFERENCE", `${path}.claim`, `"${claim}" is a bare filename`),
      );
  });
  const summary = typeof handoff["summary"] === "string" ? handoff["summary"] : "";
  const vagueSummary = vagueLocationIssue(summary);
  if (vagueSummary)
    findings.push(
      error(
        "VAGUE_LOCATION",
        "$.summary",
        `summary refers to a non-addressable location (${vagueSummary})`,
      ),
    );

  // --- Artifacts: published and retrievable --------------------------------
  ((handoff["artifacts"] as Json[] | undefined) ?? []).forEach((art, i) => {
    const path = `$.artifacts[${i}]`;
    const name = typeof art["name"] === "string" ? art["name"] : "";
    if (!art["coordinate"] || typeof art["coordinate"] !== "object") {
      findings.push(
        error(
          "FILENAME_ONLY_ARTIFACT",
          `${path}.coordinate`,
          `artifact "${name}" has no coordinate`,
        ),
      );
    }
    if (art["publication_confirmed"] !== true) {
      findings.push(
        error(
          "PUBLICATION_UNCONFIRMED",
          `${path}.publication_confirmed`,
          `artifact "${name}" is listed but its publication was not confirmed by the producer`,
        ),
      );
    }
    if (art["retrieval_confirmed"] !== true) {
      findings.push(
        warning(
          "RETRIEVAL_UNCONFIRMED",
          `${path}.retrieval_confirmed`,
          `artifact "${name}" awaits consumer retrieval confirmation`,
        ),
      );
    } else if (typeof art["retrieval_confirmed_by"] !== "string") {
      findings.push(
        error(
          "RETRIEVAL_UNCONFIRMED",
          `${path}.retrieval_confirmed_by`,
          `artifact "${name}" is marked retrieved but names no consumer`,
        ),
      );
    }
  });

  // --- Result consistency --------------------------------------------------
  const blockers = (handoff["blockers"] as Json[] | undefined) ?? [];
  if (result === "PASS" && blockers.length > 0) {
    findings.push(
      error("RESULT_INCONSISTENT", "$.result", "PASS with open blockers; use PARTIAL or BLOCKED"),
    );
  }
  if (result === "PASS" && handoff["worktree_clean"] !== true) {
    findings.push(
      error("RESULT_INCONSISTENT", "$.worktree_clean", "PASS requires a clean worktree"),
    );
  }
  if (result === "BLOCKED" && blockers.length === 0) {
    findings.push(
      error("RESULT_INCONSISTENT", "$.blockers", "BLOCKED without a registered blocker"),
    );
  }
  blockers.forEach((b, i) => {
    if (b["owner"] === "founder" && typeof b["founder_exception"] !== "string") {
      findings.push(
        error(
          "FOUNDER_EXCEPTION_MISSING",
          `$.blockers[${i}]`,
          "a founder-owned blocker must name its G1 exception",
        ),
      );
    }
  });
  ((handoff["contradictions"] as Json[] | undefined) ?? []).forEach((c, i) => {
    if (typeof c["decision_ref"] !== "string") {
      findings.push(
        warning(
          "CONTRADICTION_UNREGISTERED",
          `$.contradictions[${i}]`,
          "record the resolution in .ai/DECISION_REGISTRY.json",
        ),
      );
    }
  });

  return finish(findings);
}

if (import.meta.main) {
  const file = process.argv[2];
  if (!file) {
    console.error("usage: bun scripts/ai/validate-handoff.ts <handoff.json|handoff.md>");
    process.exit(2);
  }
  const result = validateHandoff(parseAssignmentText(readFileSync(file, "utf8")));
  printResult(`validate-handoff ${file}`, result);
  process.exit(result.ok ? 0 : 1);
}

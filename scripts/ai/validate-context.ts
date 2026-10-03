// Fail-closed validator for the `.ai` context bundle itself.
//   bun scripts/ai/validate-context.ts
// Checks structure, schema keyword support, SHA pinning, staleness of
// CURRENT_TASK, evidence grading of production claims, and cross-references
// between registries.

import { existsSync } from "node:fs";
import { resolve } from "node:path";

import {
  aiFile,
  error,
  finish,
  FULL_SHA,
  printResult,
  readJson,
  REPO_ROOT,
  SHA256,
  type Finding,
  type ValidationResult,
  warning,
} from "./lib/common";
import { unsupportedKeywords } from "./lib/json-schema";

type Json = Record<string, unknown>;

export interface ContextBundle {
  contextIndex: Json;
  currentState: Json;
  currentTask: Json;
  toolCapabilities: Json;
  repositoryAuthorities: Json;
  artifactRegistry: Json;
  decisionRegistry: Json;
  blockerRegistry: Json;
  assignmentSchema: Json;
  handoffSchema: Json;
}

export const REGISTRY_FILES: Record<keyof ContextBundle, string> = {
  contextIndex: "CONTEXT_INDEX.json",
  currentState: "CURRENT_STATE.json",
  currentTask: "CURRENT_TASK.json",
  toolCapabilities: "TOOL_CAPABILITIES.json",
  repositoryAuthorities: "REPOSITORY_AUTHORITIES.json",
  artifactRegistry: "ARTIFACT_REGISTRY.json",
  decisionRegistry: "DECISION_REGISTRY.json",
  blockerRegistry: "BLOCKER_REGISTRY.json",
  assignmentSchema: "ASSIGNMENT_SCHEMA.json",
  handoffSchema: "HANDOFF_SCHEMA.json",
};

export function loadContextBundle(): ContextBundle {
  const bundle: Partial<ContextBundle> = {};
  for (const [key, file] of Object.entries(REGISTRY_FILES) as Array<
    [keyof ContextBundle, string]
  >) {
    bundle[key] = readJson<Json>(aiFile(file));
  }
  return bundle as ContextBundle;
}

export interface ContextOptions {
  now?: Date;
  /** Resolver for repo-relative paths named by CONTEXT_INDEX; injectable for tests. */
  pathExists?: (relativePath: string) => boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function validateContext(
  bundle: ContextBundle,
  options: ContextOptions = {},
): ValidationResult {
  const findings: Finding[] = [];
  const now = options.now ?? new Date();
  const pathExists = options.pathExists ?? ((p: string) => existsSync(resolve(REPO_ROOT, p)));

  // --- Every registry carries version, timestamp and author ----------------
  const registries: Array<[string, Json]> = [
    ["CONTEXT_INDEX.json", bundle.contextIndex],
    ["CURRENT_STATE.json", bundle.currentState],
    ["CURRENT_TASK.json", bundle.currentTask],
    ["TOOL_CAPABILITIES.json", bundle.toolCapabilities],
    ["REPOSITORY_AUTHORITIES.json", bundle.repositoryAuthorities],
    ["ARTIFACT_REGISTRY.json", bundle.artifactRegistry],
    ["DECISION_REGISTRY.json", bundle.decisionRegistry],
    ["BLOCKER_REGISTRY.json", bundle.blockerRegistry],
  ];
  for (const [name, reg] of registries) {
    if (reg["schema_version"] !== "1.0")
      findings.push(error("REGISTRY_VERSION", name, "schema_version must be '1.0'"));
    const updatedAt = reg["updated_at"];
    if (typeof updatedAt !== "string" || Number.isNaN(Date.parse(updatedAt))) {
      findings.push(error("REGISTRY_TIMESTAMP", name, "updated_at must be an ISO-8601 timestamp"));
    }
    const by = reg["updated_by"] as Json | undefined;
    if (!by || typeof by["tool"] !== "string")
      findings.push(error("REGISTRY_AUTHOR", name, "updated_by.tool is required"));
  }

  // --- Schemas only use keywords the validator understands ----------------
  for (const [name, schema] of [
    ["ASSIGNMENT_SCHEMA.json", bundle.assignmentSchema],
    ["HANDOFF_SCHEMA.json", bundle.handoffSchema],
  ] as const) {
    for (const kw of unsupportedKeywords(schema)) {
      findings.push(
        error(
          "SCHEMA_KEYWORD",
          `${name}:${kw}`,
          "keyword is not supported by scripts/ai/lib/json-schema.ts; the schema would silently under-validate",
        ),
      );
    }
  }

  // --- CURRENT_STATE: verified head SHA and graded production -------------
  const repo = (bundle.currentState["repo"] as Json | undefined) ?? {};
  const headSha = repo["verified_head_sha"];
  if (typeof headSha !== "string" || !FULL_SHA.test(headSha)) {
    findings.push(
      error(
        "MISSING_REPO_SHA",
        "CURRENT_STATE.json:$.repo.verified_head_sha",
        "must be a full 40-character SHA",
      ),
    );
  }
  if (repo["evidence_grade"] !== "verified") {
    findings.push(
      error(
        "STATE_UNVERIFIED",
        "CURRENT_STATE.json:$.repo.evidence_grade",
        "the repository head must be verified by the seat that wrote the state",
      ),
    );
  }
  const production = (bundle.currentState["production"] as Json | undefined) ?? {};
  const deployedSha = production["deployed_sha"];
  const prodGrade = production["evidence_grade"];
  if (deployedSha === null && prodGrade === "verified") {
    findings.push(
      error(
        "PRODUCTION_UNVERIFIED",
        "CURRENT_STATE.json:$.production",
        "deployed_sha is null but graded 'verified'",
      ),
    );
  }
  if (
    typeof deployedSha === "string" &&
    (!FULL_SHA.test(deployedSha) || prodGrade !== "verified")
  ) {
    findings.push(
      error(
        "PRODUCTION_UNVERIFIED",
        "CURRENT_STATE.json:$.production",
        "a deployed SHA must be a full SHA graded 'verified' with its verification method",
      ),
    );
  }
  if (typeof deployedSha !== "string" && deployedSha !== null) {
    findings.push(
      error(
        "PRODUCTION_UNVERIFIED",
        "CURRENT_STATE.json:$.production.deployed_sha",
        "must be a full SHA or null",
      ),
    );
  }
  const fingerprint = production["expected_release_fingerprint"];
  if (typeof fingerprint === "string" && !SHA256.test(fingerprint)) {
    findings.push(
      error(
        "FINGERPRINT_FORMAT",
        "CURRENT_STATE.json:$.production.expected_release_fingerprint",
        "must be 64 hex characters",
      ),
    );
  }

  // --- CURRENT_TASK: single, fresh, pinned to the verified head -----------
  const task = (bundle.currentTask["task"] as Json | undefined) ?? {};
  const staleAfter = bundle.currentTask["stale_after_days"];
  const updatedAt = bundle.currentTask["updated_at"];
  if (typeof staleAfter !== "number" || staleAfter <= 0) {
    findings.push(
      error(
        "STALE_CURRENT_TASK",
        "CURRENT_TASK.json:$.stale_after_days",
        "must be a positive number of days",
      ),
    );
  } else if (typeof updatedAt === "string" && !Number.isNaN(Date.parse(updatedAt))) {
    const ageDays = (now.getTime() - Date.parse(updatedAt)) / DAY_MS;
    if (ageDays > staleAfter) {
      findings.push(
        error(
          "STALE_CURRENT_TASK",
          "CURRENT_TASK.json:$.updated_at",
          `task is ${Math.floor(ageDays)} days old (limit ${staleAfter}); re-verify and re-stamp before acting on it`,
        ),
      );
    }
  }
  if (Array.isArray(bundle.currentTask["task"])) {
    findings.push(
      error(
        "MULTIPLE_ACTIVE_TASKS",
        "CURRENT_TASK.json:$.task",
        "exactly one active task is allowed (GV-010)",
      ),
    );
  }
  const taskRepo = (task["repo"] as Json | undefined) ?? {};
  if (typeof taskRepo["base_sha"] !== "string" || !FULL_SHA.test(taskRepo["base_sha"])) {
    findings.push(
      error(
        "MISSING_REPO_SHA",
        "CURRENT_TASK.json:$.task.repo.base_sha",
        "task must pin a full base SHA",
      ),
    );
  } else if (typeof headSha === "string" && taskRepo["base_sha"] !== headSha) {
    findings.push(
      error(
        "STALE_CURRENT_TASK",
        "CURRENT_TASK.json:$.task.repo.base_sha",
        `task base ${taskRepo["base_sha"]} differs from CURRENT_STATE verified head ${headSha}; re-verify the task against the current head`,
      ),
    );
  }
  const status = task["status"];
  if (!["planned", "in_progress", "blocked"].includes(String(status))) {
    findings.push(
      error(
        "STALE_CURRENT_TASK",
        "CURRENT_TASK.json:$.task.status",
        `status "${String(status)}" is not an active status; a completed task must move to history and be replaced`,
      ),
    );
  }
  const deployment = (task["deployment"] as Json | undefined) ?? {};
  if (deployment["in_scope"] === true && deployment["permission"] !== "explicit") {
    findings.push(
      error(
        "DEPLOYMENT_PERMISSION",
        "CURRENT_TASK.json:$.task.deployment",
        "deployment in scope without explicit permission",
      ),
    );
  }
  ((task["steps"] as Json[] | undefined) ?? []).forEach((step, i) => {
    if (step["executor"] === "founder" && typeof step["founder_exception"] !== "string") {
      findings.push(
        error(
          "FOUNDER_EXECUTION",
          `CURRENT_TASK.json:$.task.steps[${i}]`,
          "a founder step must name its G1 exception",
        ),
      );
    }
  });

  // --- CONTEXT_INDEX: every git-located source must exist -----------------
  ((bundle.contextIndex["sources"] as Json[] | undefined) ?? []).forEach((source, i) => {
    const kind = source["kind"];
    const location = source["location"];
    if (
      (kind === "registry" || kind === "document") &&
      typeof location === "string" &&
      !location.includes("*")
    ) {
      if (!pathExists(location)) {
        findings.push(
          error(
            "CONTEXT_SOURCE_MISSING",
            `CONTEXT_INDEX.json:$.sources[${i}]`,
            `${location} does not exist in the repository`,
          ),
        );
      }
    }
    if (typeof source["status"] !== "string") {
      findings.push(
        error("CONTEXT_SOURCE_STATUS", `CONTEXT_INDEX.json:$.sources[${i}]`, "status is required"),
      );
    }
  });

  // --- DECISION_REGISTRY: resolutions point at real decisions --------------
  const decisionIds = new Set(
    ((bundle.decisionRegistry["decisions"] as Json[] | undefined) ?? []).map((d) =>
      String(d["id"]),
    ),
  );
  const resolutions =
    (bundle.decisionRegistry["conflict_resolutions"] as Record<string, string> | undefined) ?? {};
  for (const [conflict, decision] of Object.entries(resolutions)) {
    if (!decisionIds.has(decision)) {
      findings.push(
        error(
          "RESOLUTION_DANGLING",
          `DECISION_REGISTRY.json:$.conflict_resolutions.${conflict}`,
          `points at unknown decision ${decision}`,
        ),
      );
    }
  }

  // --- ARTIFACT_REGISTRY ↔ BLOCKER_REGISTRY ---------------------------------
  const blockerIds = new Set(
    ((bundle.blockerRegistry["blockers"] as Json[] | undefined) ?? []).map((b) => String(b["id"])),
  );
  ((bundle.artifactRegistry["artifacts"] as Json[] | undefined) ?? []).forEach((art, i) => {
    const status = art["status"];
    if (
      (status === "missing" || status === "blocked") &&
      !blockerIds.has(String(art["blocker_id"]))
    ) {
      findings.push(
        error(
          "BLOCKER_UNREGISTERED",
          `ARTIFACT_REGISTRY.json:$.artifacts[${i}]`,
          `${String(art["id"])} is ${String(status)} but has no matching blocker`,
        ),
      );
    }
  });
  ((bundle.blockerRegistry["blockers"] as Json[] | undefined) ?? []).forEach((b, i) => {
    if (b["owner"] === "founder" && typeof b["founder_exception"] !== "string") {
      findings.push(
        error(
          "FOUNDER_EXECUTION",
          `BLOCKER_REGISTRY.json:$.blockers[${i}]`,
          "a founder-owned blocker must name its G1 exception",
        ),
      );
    }
  });

  // --- TOOL_CAPABILITIES sanity ---------------------------------------------
  const founderOnly = bundle.toolCapabilities["founder_only"];
  if (!Array.isArray(founderOnly) || !founderOnly.includes("repo.merge")) {
    findings.push(
      error(
        "FOUNDER_ONLY_MERGE",
        "TOOL_CAPABILITIES.json:$.founder_only",
        "repo.merge must be founder-only",
      ),
    );
  }
  const tools = (bundle.toolCapabilities["tools"] as Record<string, Json> | undefined) ?? {};
  for (const [tool, def] of Object.entries(tools)) {
    if (tool === "founder") continue;
    const caps = (def["capabilities"] as Record<string, Json> | undefined) ?? {};
    const rewrite = caps["repo.history_rewrite"];
    if (rewrite && rewrite["status"] !== "forbidden") {
      findings.push(
        error(
          "HISTORY_REWRITE",
          `TOOL_CAPABILITIES.json:$.tools.${tool}`,
          "repo.history_rewrite must be forbidden for every tool (AGENTS.md)",
        ),
      );
    }
  }
  if (Object.keys(tools).length === 0)
    findings.push(warning("TOOLS_EMPTY", "TOOL_CAPABILITIES.json", "no tools recorded"));

  return finish(findings);
}

if (import.meta.main) {
  const result = validateContext(loadContextBundle());
  printResult("validate-context", result);
  process.exit(result.ok ? 0 : 1);
}

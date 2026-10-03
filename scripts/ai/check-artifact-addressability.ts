// Fails closed when an artifact that crosses a tool boundary cannot be
// retrieved from a coordinate (docs/ai/ARTIFACT_TRANSPORT_PROTOCOL.md).
//   bun scripts/ai/check-artifact-addressability.ts
// Git coordinates are resolved with `git cat-file -e <ref>:<path>`; the
// resolver is injectable so the vitest suite can prove every branch.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import {
  aiFile,
  DRIVE_ID,
  error,
  finish,
  FULL_SHA,
  printResult,
  readJson,
  REPO_ROOT,
  type Finding,
  type ValidationResult,
  warning,
} from "./lib/common";
import { validateAgainstSchema } from "./lib/json-schema";

type Json = Record<string, unknown>;

export type GitResolution = "present" | "missing_object" | "missing_path" | "pending_commit";

export interface AddressabilityInputs {
  artifactRegistry: Json;
  blockerRegistry: Json;
  currentTask: Json;
  repositoryAuthorities: Json;
  handoffSchema: Json;
}

export interface Resolvers {
  git: (repo: string, ref: string, path: string) => GitResolution;
}

export function gitResolver(root = REPO_ROOT): Resolvers["git"] {
  return (_repo, ref, path) => {
    try {
      execFileSync("git", ["cat-file", "-e", `${ref}^{commit}`], { cwd: root, stdio: "ignore" });
    } catch {
      return "missing_object";
    }
    try {
      execFileSync("git", ["cat-file", "-e", `${ref}:${path}`], { cwd: root, stdio: "ignore" });
      return "present";
    } catch {
      return existsSync(resolve(root, path)) ? "pending_commit" : "missing_path";
    }
  };
}

export function loadAddressabilityInputs(): AddressabilityInputs {
  return {
    artifactRegistry: readJson<Json>(aiFile("ARTIFACT_REGISTRY.json")),
    blockerRegistry: readJson<Json>(aiFile("BLOCKER_REGISTRY.json")),
    currentTask: readJson<Json>(aiFile("CURRENT_TASK.json")),
    repositoryAuthorities: readJson<Json>(aiFile("REPOSITORY_AUTHORITIES.json")),
    handoffSchema: readJson<Json>(aiFile("HANDOFF_SCHEMA.json")),
  };
}

export function checkArtifactAddressability(
  inputs: AddressabilityInputs,
  resolvers: Resolvers = { git: gitResolver() },
): ValidationResult {
  const findings: Finding[] = [];
  const coordinateSchema = { $ref: "#/$defs/Coordinate" } as Json;
  const knownRepos = new Set(
    ((inputs.repositoryAuthorities["repositories"] as Json[] | undefined) ?? []).map((r) =>
      String(r["name"]),
    ),
  );
  const openBlockers = new Set(
    ((inputs.blockerRegistry["blockers"] as Json[] | undefined) ?? [])
      .filter((b) => b["status"] === "open")
      .map((b) => String(b["id"])),
  );
  const task = (inputs.currentTask["task"] as Json | undefined) ?? {};
  const requiredByTask = new Set(
    ((task["input_artifact_ids"] as string[] | undefined) ?? []).map(String),
  );
  const seenIds = new Set<string>();

  ((inputs.artifactRegistry["artifacts"] as Json[] | undefined) ?? []).forEach((art, i) => {
    const id = String(art["id"]);
    const path = `$.artifacts[${i}] (${id})`;
    const status = art["status"];
    const coordinate = art["coordinate"];
    const required = requiredByTask.has(id);
    const fatal = (code: string, msg: string) => findings.push(error(code, path, msg));
    const soft = (code: string, msg: string) =>
      findings.push(
        required
          ? error(code, path, `${msg} — required by CURRENT_TASK`)
          : warning(code, path, msg),
      );

    if (seenIds.has(id)) fatal("ARTIFACT_DUPLICATE_ID", "artifact id is not unique");
    seenIds.add(id);
    requiredByTask.delete(id);

    const access = (art["access"] as Json | undefined) ?? {};
    const producer = (art["producer"] as Json | undefined) ?? {};
    const consumer = (art["consumer"] as Json | undefined) ?? {};

    if (status === "missing" || status === "blocked") {
      if (!openBlockers.has(String(art["blocker_id"])))
        fatal("BLOCKER_UNREGISTERED", `${String(status)} artifact has no open blocker`);
      if (required)
        fatal(
          "INACCESSIBLE_ARTIFACT",
          "CURRENT_TASK depends on an artifact that is missing or blocked; the task must stop as BLOCKED (GV-012)",
        );
      return;
    }

    if (coordinate === null || typeof coordinate !== "object") {
      fatal("FILENAME_ONLY_ARTIFACT", "a current artifact must have a coordinate (GV-001)");
      return;
    }
    const schemaIssues = validateAgainstSchema(coordinate, coordinateSchema, inputs.handoffSchema);
    if (schemaIssues.length > 0) {
      fatal("COORDINATE_INVALID", schemaIssues.map((s) => `${s.path} ${s.message}`).join("; "));
      return;
    }
    if (access["status"] === "inaccessible")
      fatal(
        "INACCESSIBLE_ARTIFACT",
        "a current artifact is recorded as inaccessible; mark it blocked and register the blocker",
      );
    else if (access["status"] !== "verified")
      soft("ACCESS_UNVERIFIED", `access status is "${String(access["status"])}"`);

    const coord = coordinate as Json;
    if (coord["store"] === "git") {
      const repo = String(coord["repo"]);
      const ref = String(coord["ref"]);
      const filePath = String(coord["path"]);
      if (!knownRepos.has(repo))
        fatal("REPO_UNKNOWN", `${repo} is not in REPOSITORY_AUTHORITIES.json`);
      if (!FULL_SHA.test(ref)) fatal("MISSING_REPO_SHA", "git coordinate ref must be a full SHA");
      if (typeof producer["repo"] === "string" && producer["repo"] !== repo) {
        fatal(
          "PRODUCER_CONSUMER_REPO_MISMATCH",
          `producer wrote to ${String(producer["repo"])} but the coordinate names ${repo}`,
        );
      }
      if (
        typeof consumer["repo"] === "string" &&
        consumer["repo"] !== repo &&
        typeof art["transport"] !== "object"
      ) {
        fatal(
          "PRODUCER_CONSUMER_REPO_MISMATCH",
          `consumer reads from ${String(consumer["repo"])} but the coordinate names ${repo}; record a transport entry or fix the coordinate`,
        );
      }
      const resolution = resolvers.git(repo, ref, filePath);
      if (resolution === "missing_object")
        soft(
          "UNREACHABLE_FROM_CHECKOUT",
          `commit ${ref.slice(0, 7)} is not in this checkout; fetch it before relying on ${filePath}`,
        );
      else if (resolution === "missing_path")
        fatal("INACCESSIBLE_ARTIFACT", `${filePath} does not exist at ${ref.slice(0, 7)}`);
      else if (resolution === "pending_commit")
        findings.push(
          warning(
            "PENDING_COMMIT",
            path,
            `${filePath} exists in the worktree but not yet at ${ref.slice(0, 7)}`,
          ),
        );
    } else if (coord["store"] === "drive") {
      if (!DRIVE_ID.test(String(coord["file_id"])))
        fatal("COORDINATE_INVALID", "Drive file id is malformed");
      if (
        typeof consumer["repo"] === "string" &&
        typeof producer["repo"] === "string" &&
        consumer["repo"] !== producer["repo"]
      ) {
        fatal(
          "PRODUCER_CONSUMER_REPO_MISMATCH",
          "producer and consumer name different repositories for a Drive artifact",
        );
      }
    } else if (coord["store"] === "url") {
      if (!String(coord["url"]).startsWith("https://"))
        fatal("COORDINATE_INVALID", "URL coordinates must be https");
    }

    if (consumer["retrieval_confirmed"] !== true) {
      findings.push(
        warning(
          "RETRIEVAL_UNCONFIRMED",
          path,
          `consumer ${String(consumer["tool"])} has not confirmed retrieval`,
        ),
      );
    }
  });

  for (const id of requiredByTask) {
    findings.push(
      error(
        "INACCESSIBLE_ARTIFACT",
        `CURRENT_TASK.input_artifact_ids (${id})`,
        "artifact is not registered at all",
      ),
    );
  }

  return finish(findings);
}

if (import.meta.main) {
  const result = checkArtifactAddressability(loadAddressabilityInputs());
  printResult("check-artifact-addressability", result);
  process.exit(result.ok ? 0 : 1);
}

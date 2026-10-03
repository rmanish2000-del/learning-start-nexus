import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  checkArtifactAddressability,
  loadAddressabilityInputs,
  type AddressabilityInputs,
  type GitResolution,
} from "../../../scripts/ai/check-artifact-addressability";
import {
  detectConflicts,
  evaluateConflicts,
  loadContinuityDocs,
} from "../../../scripts/ai/check-context-conflicts";
import { unsupportedKeywords, validateAgainstSchema } from "../../../scripts/ai/lib/json-schema";
import {
  loadAssignmentSchema,
  loadCapabilities,
  parseAssignmentText,
  validateAssignment,
} from "../../../scripts/ai/validate-assignment";
import { loadContextBundle, validateContext } from "../../../scripts/ai/validate-context";
import { loadHandoffSchema, validateHandoff } from "../../../scripts/ai/validate-handoff";

const ROOT = resolve(import.meta.dirname, "../../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");
const json = (p: string) => JSON.parse(read(p)) as Record<string, unknown>;

type Json = Record<string, unknown>;
const clone = <T>(v: T): T => structuredClone(v);

const exampleAssignment = () => json("docs/ai/examples/assignment.example.json");
const exampleHandoff = () => json("docs/ai/examples/handoff.example.json");
const codes = (r: { findings: Array<{ code: string; severity: string }> }) =>
  r.findings.filter((f) => f.severity === "error").map((f) => f.code);

const NOW = new Date("2026-10-04T00:00:00Z");

describe("live .ai bundle", () => {
  it("validates as a whole", () => {
    const result = validateContext(loadContextBundle(), { now: NOW });
    expect(codes(result)).toEqual([]);
  });

  it("schemas use only keywords the validator understands", () => {
    expect(unsupportedKeywords(loadAssignmentSchema())).toEqual([]);
    expect(unsupportedKeywords(loadHandoffSchema())).toEqual([]);
  });

  it("the example assignment and handoff pass", () => {
    expect(codes(validateAssignment(exampleAssignment()))).toEqual([]);
    expect(codes(validateHandoff(exampleHandoff()))).toEqual([]);
  });

  it("every detected conflict in the continuity documents has a resolution", () => {
    const registry = json(".ai/DECISION_REGISTRY.json");
    const conflicts = detectConflicts(loadContinuityDocs());
    const result = evaluateConflicts(
      conflicts,
      registry["conflict_resolutions"] as Record<string, string>,
    );
    expect(codes(result)).toEqual([]);
    // The audit found real contradictions; the detector must still see them.
    expect(conflicts.map((c) => c.id)).toContain("CX-PRODUCT-LANGUAGE");
    expect(conflicts.map((c) => c.id)).toContain("CX-DEPLOYED-SHA");
  });

  it("registered artifacts are addressable from this checkout", () => {
    const result = checkArtifactAddressability(loadAddressabilityInputs());
    expect(codes(result)).toEqual([]);
  });

  it("ships every standard, registry and validator named in the README", () => {
    for (const p of [
      ".ai/README.md",
      ".ai/CONTEXT_INDEX.json",
      ".ai/CURRENT_STATE.json",
      ".ai/CURRENT_TASK.json",
      ".ai/TOOL_CAPABILITIES.json",
      ".ai/REPOSITORY_AUTHORITIES.json",
      ".ai/ARTIFACT_REGISTRY.json",
      ".ai/DECISION_REGISTRY.json",
      ".ai/BLOCKER_REGISTRY.json",
      ".ai/HANDOFF_SCHEMA.json",
      ".ai/ASSIGNMENT_SCHEMA.json",
      "docs/ai/PROMPT_ENGINEERING_STANDARD.md",
      "docs/ai/CONTEXT_ENGINEERING_STANDARD.md",
      "docs/ai/ARTIFACT_TRANSPORT_PROTOCOL.md",
      "docs/ai/TOOL_HANDOFF_PROTOCOL.md",
      "docs/ai/CONTEXT_CONFLICT_RESOLUTION.md",
      "scripts/ai/validate-context.ts",
      "scripts/ai/validate-assignment.ts",
      "scripts/ai/validate-handoff.ts",
      "scripts/ai/check-context-conflicts.ts",
      "scripts/ai/check-artifact-addressability.ts",
    ]) {
      expect(existsSync(resolve(ROOT, p)), p).toBe(true);
    }
    const pkg = json("package.json") as { scripts: Record<string, string> };
    expect(pkg.scripts["ai:check"]).toContain("validate-context");
  });
});

describe("assignment validator fails closed", () => {
  it("rejects an input given by filename only (no coordinate)", () => {
    const a = exampleAssignment();
    (a["inputs"] as Json[])[0] = {
      name: "EDUOS_MPBSE_A11Y_EXPORT.zip",
      access_verified: true,
      verified_by: "lovable",
    };
    const result = validateAssignment(a);
    expect(result.ok).toBe(false);
    expect(codes(result)).toContain("FILENAME_ONLY_INPUT");
  });

  it("rejects a bare filename in the objective", () => {
    const a = exampleAssignment();
    a["objective"] = "EDUOS_MPBSE_A11Y_EXPORT.zip";
    expect(codes(validateAssignment(a))).toContain("FILENAME_ONLY_REFERENCE");
  });

  it('rejects "see Files", "this project" and "attached" references', () => {
    for (const phrase of [
      "Retrieve the package from Files and integrate it",
      "Use the design bundle in this project",
      "The handoff ZIP is attached",
      "Apply the patch shared earlier in chat",
    ]) {
      const a = exampleAssignment();
      (a["inputs"] as Json[])[0]!["purpose"] = phrase;
      const result = validateAssignment(a);
      expect(result.ok, phrase).toBe(false);
      expect(codes(result), phrase).toContain("VAGUE_LOCATION");
    }
  });

  it("rejects a missing or short repository SHA", () => {
    const a = exampleAssignment();
    (a["repo"] as Json)["base_sha"] = "fa5fcde";
    expect(codes(validateAssignment(a))).toContain("MISSING_REPO_SHA");
    const b = exampleAssignment();
    delete (b["repo"] as Json)["base_sha"];
    expect(codes(validateAssignment(b))).toContain("MISSING_REPO_SHA");
  });

  it("rejects an input whose access was not verified", () => {
    const a = exampleAssignment();
    (a["inputs"] as Json[])[0]!["access_verified"] = false;
    expect(codes(validateAssignment(a))).toContain("INPUT_NOT_VERIFIED");
    const b = exampleAssignment();
    delete (b["inputs"] as Json[])[0]!["verified_by"];
    expect(codes(validateAssignment(b))).toContain("INPUT_VERIFIER_MISSING");
  });

  it("rejects founder execution when a tool holds the capability", () => {
    const a = exampleAssignment();
    (a["steps"] as Json[]).push({
      id: "S9",
      action: "Run the test suite and report the result",
      executor: "founder",
      capability: "repo.test",
    });
    const result = validateAssignment(a);
    expect(result.ok).toBe(false);
    expect(codes(result)).toContain("FOUNDER_EXECUTION");
  });

  it("accepts a founder step only for founder-only capabilities with a named exception", () => {
    const a = exampleAssignment();
    (a["steps"] as Json[]).push({
      id: "S9",
      action: "Merge the pull request",
      executor: "founder",
      capability: "repo.merge",
    });
    expect(codes(validateAssignment(a))).toContain("FOUNDER_EXCEPTION_MISSING");
    (a["steps"] as Json[])[a["steps"] instanceof Array ? (a["steps"] as Json[]).length - 1 : 0]![
      "founder_exception"
    ] = "irreversible_decision";
    expect(codes(validateAssignment(a))).toEqual([]);
  });

  it("rejects a tool step for a forbidden or unavailable capability", () => {
    const a = exampleAssignment();
    (a["steps"] as Json[]).push({
      id: "S9",
      action: "Force-push the branch",
      executor: "lovable",
      capability: "repo.history_rewrite",
    });
    expect(codes(validateAssignment(a))).toContain("CAPABILITY_FORBIDDEN");
    const b = exampleAssignment();
    (b["steps"] as Json[]).push({
      id: "S9",
      action: "Fetch production HTML",
      executor: "claude_code",
      capability: "web.fetch_production",
    });
    expect(codes(validateAssignment(b))).toContain("CAPABILITY_UNAVAILABLE");
  });

  it("requires explicit founder deployment permission", () => {
    const a = exampleAssignment();
    a["deployment"] = { in_scope: true, permission: "none" };
    (a["steps"] as Json[]).push({
      id: "S9",
      action: "Publish to production",
      executor: "lovable",
      capability: "deploy.production",
    });
    const result = validateAssignment(a);
    expect(result.ok).toBe(false);
    expect(codes(result)).toContain("DEPLOYMENT_PERMISSION");
  });

  it('rejects "publish when appropriate" as permission', () => {
    const a = exampleAssignment();
    a["deployment"] = {
      in_scope: true,
      permission: "explicit",
      granted_by: "founder",
      target: "production",
      statement: "Publish the verified canonical HEAD when appropriate.",
    };
    const result = validateAssignment(a);
    expect(result.ok).toBe(false);
    expect(
      result.findings.some(
        (f) => f.code === "DEPLOYMENT_PERMISSION" && /conditional/.test(f.message),
      ),
    ).toBe(true);
  });

  it("accepts an explicit, unconditional founder deployment statement", () => {
    const a = exampleAssignment();
    a["deployment"] = {
      in_scope: true,
      permission: "explicit",
      granted_by: "founder",
      target: "staging",
      statement: "Founder, 2026-10-03: deploy this commit to staging after all gates pass.",
    };
    (a["steps"] as Json[]).push({
      id: "S9",
      action: "Publish to staging",
      executor: "lovable",
      capability: "deploy.staging",
    });
    expect(codes(validateAssignment(a))).toEqual([]);
  });

  it("rejects a deploy step when deployment is not in scope", () => {
    const a = exampleAssignment();
    (a["steps"] as Json[]).push({
      id: "S9",
      action: "Publish to staging",
      executor: "lovable",
      capability: "deploy.staging",
    });
    expect(codes(validateAssignment(a))).toContain("DEPLOY_STEP_OUT_OF_SCOPE");
  });

  it("rejects merging by anyone but the founder", () => {
    const a = exampleAssignment();
    a["merge"] = { allowed: true, by: "lovable" };
    expect(codes(validateAssignment(a))).toContain("SCHEMA");
    const b = exampleAssignment();
    (b["steps"] as Json[]).push({
      id: "S9",
      action: "Merge into main",
      executor: "lovable",
      capability: "repo.merge",
    });
    expect(codes(validateAssignment(b))).toContain("MERGE_NOT_FOUNDER");
  });

  it("rejects outputs without a store location and a non-Copilot return", () => {
    const a = exampleAssignment();
    a["outputs"] = [{ name: "Report", store: "git" }];
    expect(codes(validateAssignment(a))).toContain("OUTPUT_UNADDRESSABLE");
    const b = exampleAssignment();
    b["return_to"] = "founder";
    expect(codes(validateAssignment(b))).toContain("SCHEMA");
  });

  it("parses a Markdown assignment with exactly one json block", () => {
    const md = `# Assignment\n\nProse.\n\n\`\`\`json\n${JSON.stringify(exampleAssignment())}\n\`\`\`\n`;
    expect(codes(validateAssignment(parseAssignmentText(md)))).toEqual([]);
    expect(() => parseAssignmentText("# nothing here")).toThrow(/exactly one/);
  });
});

describe("handoff validator fails closed", () => {
  it("rejects a missing or abbreviated head SHA", () => {
    const h = exampleHandoff();
    (h["repo"] as Json)["head_sha"] = "6b33e35";
    expect(codes(validateHandoff(h))).toContain("MISSING_REPO_SHA");
  });

  it("rejects production touched without verified evidence", () => {
    const h = exampleHandoff();
    h["production"] = {
      touched: true,
      sha: null,
      evidence_grade: "reported",
      source: "Lovable said it published",
    };
    const result = validateHandoff(h);
    expect(codes(result)).toContain("PRODUCTION_SHA_MISSING");
    expect(codes(result)).toContain("PRODUCTION_UNVERIFIED");
  });

  it("rejects a 'verified' production claim that does not cite the version endpoint", () => {
    const h = exampleHandoff();
    h["production"] = {
      touched: true,
      sha: "6aef3be2c7179c2a4968d636c94b6416b63506a6",
      evidence_grade: "verified",
      source: "PROJECT_STATUS.md",
    };
    expect(codes(validateHandoff(h))).toContain("PRODUCTION_UNVERIFIED");
    h["production"] = {
      touched: true,
      sha: "6aef3be2c7179c2a4968d636c94b6416b63506a6",
      evidence_grade: "verified",
      source: "GET /api/public/version fingerprint matched local build",
    };
    expect(codes(validateHandoff(h))).toEqual([]);
  });

  it("rejects ungrounded 'verified' evidence and vague locations", () => {
    const h = exampleHandoff();
    h["evidence"] = [{ claim: "Everything passes, see Files for the log", grade: "verified" }];
    const result = validateHandoff(h);
    expect(codes(result)).toContain("EVIDENCE_UNGROUNDED");
    expect(codes(result)).toContain("VAGUE_LOCATION");
  });

  it("rejects artifacts without a coordinate or publication confirmation", () => {
    const h = exampleHandoff();
    h["artifacts"] = [
      { name: "report.md", publication_confirmed: false, retrieval_confirmed: false },
    ];
    const result = validateHandoff(h);
    expect(codes(result)).toContain("FILENAME_ONLY_ARTIFACT");
    expect(codes(result)).toContain("PUBLICATION_UNCONFIRMED");
  });

  it("rejects PASS with blockers or a dirty worktree, and BLOCKED without blockers", () => {
    const h = exampleHandoff();
    h["result"] = "PASS";
    expect(codes(validateHandoff(h))).toContain("RESULT_INCONSISTENT");
    const g = exampleHandoff();
    g["result"] = "BLOCKED";
    g["blockers"] = [];
    expect(codes(validateHandoff(g))).toContain("RESULT_INCONSISTENT");
    const k = exampleHandoff();
    k["result"] = "PASS";
    k["blockers"] = [];
    k["worktree_clean"] = false;
    expect(codes(validateHandoff(k))).toContain("RESULT_INCONSISTENT");
  });

  it("rejects a founder-owned blocker with no G1 exception and ownership not returned to Copilot", () => {
    const h = exampleHandoff();
    h["blockers"] = [{ id: "BLK-X", statement: "Needs a decision", owner: "founder" }];
    expect(codes(validateHandoff(h))).toContain("FOUNDER_EXCEPTION_MISSING");
    const g = exampleHandoff();
    g["ownership_returned_to"] = "founder";
    expect(codes(validateHandoff(g))).toContain("SCHEMA");
  });
});

describe("context validator fails closed", () => {
  it("rejects a stale CURRENT_TASK by age", () => {
    const bundle = loadContextBundle();
    const result = validateContext(bundle, { now: new Date("2026-12-01T00:00:00Z") });
    expect(result.ok).toBe(false);
    expect(codes(result)).toContain("STALE_CURRENT_TASK");
  });

  it("rejects a CURRENT_TASK pinned to a different SHA than the verified head", () => {
    const bundle = clone(loadContextBundle());
    ((bundle.currentTask["task"] as Json)["repo"] as Json)["base_sha"] =
      "0000000000000000000000000000000000000000";
    expect(codes(validateContext(bundle, { now: NOW }))).toContain("STALE_CURRENT_TASK");
  });

  it("rejects a completed task left as current", () => {
    const bundle = clone(loadContextBundle());
    (bundle.currentTask["task"] as Json)["status"] = "complete";
    expect(codes(validateContext(bundle, { now: NOW }))).toContain("STALE_CURRENT_TASK");
  });

  it("rejects a state without a full verified head SHA", () => {
    const bundle = clone(loadContextBundle());
    (bundle.currentState["repo"] as Json)["verified_head_sha"] = "main";
    expect(codes(validateContext(bundle, { now: NOW }))).toContain("MISSING_REPO_SHA");
  });

  it("rejects a 'verified' production grade with no deployed SHA, and a short deployed SHA", () => {
    const bundle = clone(loadContextBundle());
    (bundle.currentState["production"] as Json)["evidence_grade"] = "verified";
    expect(codes(validateContext(bundle, { now: NOW }))).toContain("PRODUCTION_UNVERIFIED");
    const other = clone(loadContextBundle());
    (other.currentState["production"] as Json)["deployed_sha"] = "6aef3be";
    expect(codes(validateContext(other, { now: NOW }))).toContain("PRODUCTION_UNVERIFIED");
  });

  it("rejects a context source that does not exist in the repository", () => {
    const bundle = clone(loadContextBundle());
    (bundle.contextIndex["sources"] as Json[]).push({
      rank: 9,
      id: "ghost",
      kind: "document",
      location: "GHOST.md",
      status: "current",
    });
    expect(codes(validateContext(bundle, { now: NOW }))).toContain("CONTEXT_SOURCE_MISSING");
  });

  it("rejects a conflict resolution pointing at an unknown decision and a missing artifact without a blocker", () => {
    const bundle = clone(loadContextBundle());
    (bundle.decisionRegistry["conflict_resolutions"] as Record<string, string>)["CX-NEW"] =
      "GV-999";
    (bundle.artifactRegistry["artifacts"] as Json[]).push({
      id: "ART-9999",
      title: "lost",
      status: "missing",
      coordinate: null,
    });
    const result = validateContext(bundle, { now: NOW });
    expect(codes(result)).toContain("RESOLUTION_DANGLING");
    expect(codes(result)).toContain("BLOCKER_UNREGISTERED");
  });

  it("rejects history rewriting being available to any tool", () => {
    const bundle = clone(loadContextBundle());
    (((bundle.toolCapabilities["tools"] as Json)["lovable"] as Json)["capabilities"] as Json)[
      "repo.history_rewrite"
    ] = { status: "available" };
    expect(codes(validateContext(bundle, { now: NOW }))).toContain("HISTORY_REWRITE");
  });
});

describe("context conflict detector fails closed", () => {
  const docs = {
    "PROJECT_STATUS.md": "EduOS is **English only** (founder decision).",
    "PRODUCT_DECISIONS.md":
      "| 20 | Hindi covers the parent journey only; English fallback | Live |",
  };

  it("detects conflicting product-language claims", () => {
    const conflicts = detectConflicts(docs);
    expect(conflicts.map((c) => c.id)).toEqual(["CX-PRODUCT-LANGUAGE"]);
    expect(conflicts[0]!.sources).toEqual(["PRODUCT_DECISIONS.md", "PROJECT_STATUS.md"]);
  });

  it("fails without a registered resolution and passes with one", () => {
    const conflicts = detectConflicts(docs);
    expect(evaluateConflicts(conflicts, {}).ok).toBe(false);
    expect(evaluateConflicts(conflicts, { "CX-PRODUCT-LANGUAGE": "GV-003" }).ok).toBe(true);
  });

  it("ignores claims marked superseded", () => {
    const marked = {
      ...docs,
      "PRODUCT_DECISIONS.md":
        "**[SUPERSEDED 2026-10-03: GV-003]** | 20 | Hindi covers the parent journey only | Live |",
    };
    expect(detectConflicts(marked)).toEqual([]);
  });

  it("detects multiple deployed SHAs, founder-action items and assignment history", () => {
    const conflicts = detectConflicts({
      "PROJECT_STATUS.md": "Deployed production commit: `e6e34008bd264b1533707180428d860dda76a6f9`",
      "TECHNICAL_STATE.md": "Deployed SHA `463eb6ddd610d0e117520dc333e4228cf851b5b8`",
      "roadmap.md": "- [ ] Founder action: remix this project as eduos-staging",
      "EDUOS_PROJECT_OPERATING_SYSTEM.md": "## 11.1 Founder Non-Execution Rule",
      "CURRENT_ASSIGNMENT.md": "## Previous assignment (complete)\n**Status:** Complete.",
    }).map((c) => c.id);
    expect(conflicts).toEqual([
      "CX-DEPLOYED-SHA",
      "CX-FOUNDER-ACTION",
      "CX-CURRENT-ASSIGNMENT-HISTORY",
    ]);
  });
});

describe("artifact addressability fails closed", () => {
  const base = (): AddressabilityInputs => {
    const inputs = clone(loadAddressabilityInputs());
    // The live task may require live artifacts; these cases register their own.
    delete (inputs.currentTask["task"] as Json)["input_artifact_ids"];
    return inputs;
  };
  const resolverReturning = (r: GitResolution) => ({ git: () => r });
  const currentGit = (over: Json = {}): Json => ({
    id: "ART-T001",
    title: "test",
    kind: "report",
    status: "current",
    coordinate: {
      store: "git",
      repo: "rmanish2000-del/learning-start-nexus",
      ref: "fa5fcde09323096a715e8307fc5114b210ae198f",
      path: "README.md",
    },
    producer: { tool: "claude_code", repo: "rmanish2000-del/learning-start-nexus" },
    consumer: { tool: "lovable", retrieval_confirmed: true },
    access: { status: "verified" },
    ...over,
  });

  it("passes a resolvable artifact", () => {
    const inputs = base();
    inputs.artifactRegistry["artifacts"] = [currentGit()];
    expect(codes(checkArtifactAddressability(inputs, resolverReturning("present")))).toEqual([]);
  });

  it("rejects an artifact whose path does not exist at the pinned commit", () => {
    const inputs = base();
    inputs.artifactRegistry["artifacts"] = [currentGit()];
    const result = checkArtifactAddressability(inputs, resolverReturning("missing_path"));
    expect(result.ok).toBe(false);
    expect(codes(result)).toContain("INACCESSIBLE_ARTIFACT");
  });

  it("rejects an unreachable commit only when the current task depends on it", () => {
    const inputs = base();
    inputs.artifactRegistry["artifacts"] = [currentGit()];
    expect(codes(checkArtifactAddressability(inputs, resolverReturning("missing_object")))).toEqual(
      [],
    );
    (inputs.currentTask["task"] as Json)["input_artifact_ids"] = ["ART-T001"];
    expect(
      codes(checkArtifactAddressability(inputs, resolverReturning("missing_object"))),
    ).toContain("UNREACHABLE_FROM_CHECKOUT");
  });

  it("rejects a current artifact with no coordinate or recorded as inaccessible", () => {
    const inputs = base();
    inputs.artifactRegistry["artifacts"] = [
      currentGit({ id: "ART-T002", coordinate: null }),
      currentGit({ id: "ART-T003", access: { status: "inaccessible" } }),
    ];
    const result = checkArtifactAddressability(inputs, resolverReturning("present"));
    expect(codes(result)).toContain("FILENAME_ONLY_ARTIFACT");
    expect(codes(result)).toContain("INACCESSIBLE_ARTIFACT");
  });

  it("rejects a task that depends on a missing artifact or an unregistered id", () => {
    const inputs = base();
    (inputs.currentTask["task"] as Json)["input_artifact_ids"] = ["ART-0005", "ART-NOPE"];
    const result = checkArtifactAddressability(inputs, resolverReturning("present"));
    expect(result.ok).toBe(false);
    expect(result.findings.filter((f) => f.code === "INACCESSIBLE_ARTIFACT")).toHaveLength(2);
  });

  it("skips superseded artifacts unless the current task still depends on them", () => {
    const inputs = base();
    inputs.artifactRegistry["artifacts"] = [
      currentGit({ id: "ART-T011", status: "superseded", coordinate: null }),
    ];
    expect(codes(checkArtifactAddressability(inputs, resolverReturning("present")))).toEqual([]);
    (inputs.currentTask["task"] as Json)["input_artifact_ids"] = ["ART-T011"];
    expect(codes(checkArtifactAddressability(inputs, resolverReturning("present")))).toContain(
      "INACCESSIBLE_ARTIFACT",
    );
  });

  it("rejects a missing artifact with no open blocker", () => {
    const inputs = base();
    inputs.artifactRegistry["artifacts"] = [
      currentGit({ id: "ART-T004", status: "missing", coordinate: null, blocker_id: "BLK-NOPE" }),
    ];
    expect(codes(checkArtifactAddressability(inputs, resolverReturning("present")))).toContain(
      "BLOCKER_UNREGISTERED",
    );
  });

  it("rejects producer/consumer repository mismatches", () => {
    const inputs = base();
    inputs.artifactRegistry["artifacts"] = [
      currentGit({
        id: "ART-T005",
        producer: { tool: "lovable", repo: "rmanish2000-del/eduos-ai" },
      }),
      currentGit({
        id: "ART-T006",
        consumer: { tool: "lovable", repo: "rmanish2000-del/eduos", retrieval_confirmed: true },
      }),
    ];
    const result = checkArtifactAddressability(inputs, resolverReturning("present"));
    expect(
      result.findings.filter((f) => f.code === "PRODUCER_CONSUMER_REPO_MISMATCH"),
    ).toHaveLength(2);
    // A recorded transport makes the cross-repository hand-over explicit.
    (inputs.artifactRegistry["artifacts"] as Json[])[1]!["transport"] = {
      by: "claude_code",
      method: "git format-patch",
    };
    expect(
      result.findings.filter((f) => f.code === "PRODUCER_CONSUMER_REPO_MISMATCH").length,
    ).toBeGreaterThan(
      checkArtifactAddressability(inputs, resolverReturning("present")).findings.filter(
        (f) => f.code === "PRODUCER_CONSUMER_REPO_MISMATCH",
      ).length,
    );
  });

  it("rejects coordinates that are malformed, in unknown repositories or non-https", () => {
    const inputs = base();
    inputs.artifactRegistry["artifacts"] = [
      currentGit({
        id: "ART-T007",
        coordinate: {
          store: "git",
          repo: "someone/else",
          ref: "fa5fcde09323096a715e8307fc5114b210ae198f",
          path: "x.md",
        },
        producer: { tool: "claude_code", repo: "someone/else" },
      }),
      currentGit({
        id: "ART-T008",
        coordinate: {
          store: "git",
          repo: "rmanish2000-del/learning-start-nexus",
          ref: "fa5fcde",
          path: "x.md",
        },
      }),
      currentGit({
        id: "ART-T009",
        coordinate: { store: "url", url: "http://example.com/x.zip" },
        producer: { tool: "lovable" },
      }),
      currentGit({
        id: "ART-T010",
        coordinate: { store: "drive", file_id: "short" },
        producer: { tool: "lovable" },
      }),
    ];
    const result = checkArtifactAddressability(inputs, resolverReturning("present"));
    expect(codes(result)).toContain("REPO_UNKNOWN");
    expect(codes(result)).toContain("COORDINATE_INVALID");
    expect(
      result.findings.filter((f) => f.code === "COORDINATE_INVALID").length,
    ).toBeGreaterThanOrEqual(3);
  });
});

describe("json-schema subset", () => {
  it("enforces oneOf discriminators and required keys", () => {
    const schema = loadHandoffSchema();
    const ref = { $ref: "#/$defs/Coordinate" };
    expect(
      validateAgainstSchema(
        { store: "git", repo: "a/b", ref: "x".repeat(40), path: "p" },
        ref,
        schema,
      ).length,
    ).toBeGreaterThan(0);
    expect(
      validateAgainstSchema(
        { store: "git", repo: "a/b", ref: "0".repeat(40), path: "p" },
        ref,
        schema,
      ),
    ).toEqual([]);
    expect(validateAgainstSchema({ store: "drive" }, ref, schema).length).toBeGreaterThan(0);
  });
});

describe("continuity documents after the governance change", () => {
  it("CURRENT_ASSIGNMENT.md holds one active mission and mirrors CURRENT_TASK.json", () => {
    const text = read("CURRENT_ASSIGNMENT.md");
    const task = json(".ai/CURRENT_TASK.json")["task"] as Json;
    expect(text).toContain(String(task["id"]));
    expect(text).toContain(String((task["repo"] as Json)["base_sha"]));
    expect(text).not.toMatch(/\*\*Status:\*\* Complete/);
    expect(text).not.toMatch(/## Previous assignment/);
  });

  it("EDUOS_NEW_CHAT_HANDOFF_PACKAGE.md is a short bootstrap index that preserves its history", () => {
    const text = read("EDUOS_NEW_CHAT_HANDOFF_PACKAGE.md");
    const marker = text.indexOf("[SUPERSEDED 2026-10-03");
    expect(marker).toBeGreaterThan(0);
    const bootstrap = text.slice(0, marker);
    expect(bootstrap.split("\n").length).toBeLessThan(80);
    expect(bootstrap).toContain(".ai/CONTEXT_INDEX.json");
    // History below the marker is intact.
    for (const heading of [
      "## 1. New Chat Bootstrap Prompt",
      "## 13. Founder Verdict Format",
      "## 18. New-Chat Acceptance Check",
      "### G1. Founder Non-Execution Rule",
      "### G7. Business-Value-First prioritisation",
    ]) {
      expect(text.slice(marker)).toContain(heading);
    }
  });

  it("AGENTS.md and the operating system carry the AI governance rules", () => {
    const agents = read("AGENTS.md");
    const os = read("EDUOS_PROJECT_OPERATING_SYSTEM.md");
    for (const needle of [".ai/CONTEXT_INDEX.json", "bun run ai:check", "TOOL_CAPABILITIES.json"]) {
      expect(agents).toContain(needle);
    }
    for (const needle of [
      "## 13.",
      "addressable",
      "explicit",
      "m365_copilot",
      "verified",
      "reported",
      "founder",
    ]) {
      expect(os).toContain(needle);
    }
    expect(os).not.toMatch(/Publish\/deploy the verified canonical HEAD when appropriate\.$/m);
  });
});

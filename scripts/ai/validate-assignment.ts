// Fail-closed validator for EduOS assignments (.ai/ASSIGNMENT_SCHEMA.json plus
// the semantic rules in docs/ai/PROMPT_ENGINEERING_STANDARD.md).
//   bun scripts/ai/validate-assignment.ts <assignment.json|assignment.md>
// A Markdown assignment must embed exactly one ```json fenced block.

import { readFileSync } from "node:fs";

import {
  aiFile,
  CONDITIONAL_PERMISSION,
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

type Json = Record<string, unknown>;

export interface CapabilityTable {
  founder_only: string[];
  tools: Record<string, { capabilities: Record<string, { status: string }> }>;
}

export function loadAssignmentSchema(): Json {
  return readJson<Json>(aiFile("ASSIGNMENT_SCHEMA.json"));
}

export function loadCapabilities(): CapabilityTable {
  return readJson<CapabilityTable>(aiFile("TOOL_CAPABILITIES.json"));
}

/** Extract the JSON body from a Markdown assignment or parse raw JSON. */
export function parseAssignmentText(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);
  const blocks = [...trimmed.matchAll(/```json\s*\n([\s\S]*?)\n```/g)];
  if (blocks.length !== 1) {
    throw new Error(`Expected exactly one \`\`\`json block, found ${blocks.length}`);
  }
  return JSON.parse(blocks[0]![1]!);
}

/** True when any tool other than the founder can execute the capability. */
export function toolCanExecute(capabilities: CapabilityTable, capability: string): string[] {
  return Object.entries(capabilities.tools)
    .filter(
      ([tool, def]) => tool !== "founder" && def.capabilities[capability]?.status === "available",
    )
    .map(([tool]) => tool);
}

function textFields(assignment: Json): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const push = (path: string, v: unknown) => {
    if (typeof v === "string") out.push([path, v]);
  };
  push("$.objective", assignment["objective"]);
  push("$.business_value", assignment["business_value"]);
  push("$.notes", assignment["notes"]);
  const scope = assignment["scope"] as Json | undefined;
  (scope?.["in"] as unknown[] | undefined)?.forEach((s, i) => push(`$.scope.in[${i}]`, s));
  (scope?.["out"] as unknown[] | undefined)?.forEach((s, i) => push(`$.scope.out[${i}]`, s));
  (assignment["inputs"] as Json[] | undefined)?.forEach((input, i) => {
    push(`$.inputs[${i}].name`, input["name"]);
    push(`$.inputs[${i}].purpose`, input["purpose"]);
  });
  (assignment["steps"] as Json[] | undefined)?.forEach((step, i) =>
    push(`$.steps[${i}].action`, step["action"]),
  );
  return out;
}

export function validateAssignment(
  input: unknown,
  schema: Json = loadAssignmentSchema(),
  capabilities: CapabilityTable = loadCapabilities(),
): ValidationResult {
  const findings: Finding[] = [];

  for (const issue of validateAgainstSchema(input, schema)) {
    findings.push(error("SCHEMA", issue.path, issue.message));
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) return finish(findings);
  const assignment = input as Json;

  // --- Repository SHA ------------------------------------------------------
  const repo = assignment["repo"] as Json | undefined;
  if (!repo || typeof repo["base_sha"] !== "string" || !FULL_SHA.test(repo["base_sha"])) {
    findings.push(
      error(
        "MISSING_REPO_SHA",
        "$.repo.base_sha",
        "assignment must pin a full 40-character base commit SHA",
      ),
    );
  }

  // --- Inputs: addressable, verified -------------------------------------
  const inputs = (assignment["inputs"] as unknown[] | undefined) ?? [];
  inputs.forEach((raw, i) => {
    const path = `$.inputs[${i}]`;
    if (!raw || typeof raw !== "object") return;
    const ref = raw as Json;
    const name = typeof ref["name"] === "string" ? ref["name"] : "";
    const coordinate = ref["coordinate"];
    if (!coordinate || typeof coordinate !== "object") {
      findings.push(
        error(
          "FILENAME_ONLY_INPUT",
          `${path}.coordinate`,
          `input "${name}" has no coordinate (git repo+sha+path, Drive file id or https URL)`,
        ),
      );
    }
    if (ref["access_verified"] !== true) {
      findings.push(
        error(
          "INPUT_NOT_VERIFIED",
          `${path}.access_verified`,
          `input "${name}" was not verified as retrievable by the issuing seat`,
        ),
      );
    } else if (typeof ref["verified_by"] !== "string") {
      findings.push(
        error(
          "INPUT_VERIFIER_MISSING",
          `${path}.verified_by`,
          `input "${name}" is marked verified but names no verifying seat`,
        ),
      );
    }
    for (const key of ["name", "purpose"] as const) {
      const text = ref[key];
      if (typeof text !== "string") continue;
      const vague = vagueLocationIssue(text);
      if (vague) {
        findings.push(
          error(
            "VAGUE_LOCATION",
            `${path}.${key}`,
            `"${text}" refers to a non-addressable location (${vague})`,
          ),
        );
      }
    }
  });

  // --- Free text must not point at "Files", "this project", attachments ----
  for (const [path, text] of textFields(assignment)) {
    if (path.startsWith("$.inputs[")) continue; // handled above
    const vague = vagueLocationIssue(text);
    if (vague) {
      findings.push(
        error(
          "VAGUE_LOCATION",
          path,
          `"${text.slice(0, 80)}" refers to a non-addressable location (${vague})`,
        ),
      );
    }
    if (isBareFilename(text)) {
      findings.push(
        error("FILENAME_ONLY_REFERENCE", path, `"${text}" is a bare filename, not a coordinate`),
      );
    }
  }

  // --- Steps: founder execution and deployment ---------------------------
  const deployment = (assignment["deployment"] as Json | undefined) ?? {};
  const deploymentInScope = deployment["in_scope"] === true;
  const steps = (assignment["steps"] as unknown[] | undefined) ?? [];
  steps.forEach((raw, i) => {
    if (!raw || typeof raw !== "object") return;
    const step = raw as Json;
    const path = `$.steps[${i}]`;
    const capability = typeof step["capability"] === "string" ? step["capability"] : "";
    const executor = step["executor"];

    if (executor === "founder") {
      const tools = toolCanExecute(capabilities, capability);
      const founderOnly = capabilities.founder_only.includes(capability);
      if (!founderOnly && tools.length > 0) {
        findings.push(
          error(
            "FOUNDER_EXECUTION",
            `${path}.executor`,
            `"${step["action"]}" is assigned to the founder but ${tools.join(", ")} can execute ${capability} (G1 / GV-005)`,
          ),
        );
      } else if (typeof step["founder_exception"] !== "string") {
        findings.push(
          error(
            "FOUNDER_EXCEPTION_MISSING",
            `${path}.founder_exception`,
            `founder step "${step["action"]}" must name its G1 exception`,
          ),
        );
      }
    } else if (typeof executor === "string") {
      const def = capabilities.tools[executor]?.capabilities[capability];
      if (!def) {
        findings.push(
          warning(
            "CAPABILITY_UNKNOWN",
            `${path}.capability`,
            `${executor} has no recorded capability ${capability}; record it in TOOL_CAPABILITIES.json`,
          ),
        );
      } else if (def.status === "forbidden") {
        findings.push(
          error(
            "CAPABILITY_FORBIDDEN",
            `${path}.capability`,
            `${executor} must never execute ${capability}`,
          ),
        );
      } else if (def.status !== "available") {
        findings.push(
          error(
            "CAPABILITY_UNAVAILABLE",
            `${path}.capability`,
            `${executor} cannot execute ${capability} (status ${def.status}); reassign or register a blocker`,
          ),
        );
      }
    }

    if (capability.startsWith("deploy.") && !deploymentInScope) {
      findings.push(
        error(
          "DEPLOY_STEP_OUT_OF_SCOPE",
          `${path}.capability`,
          "a deployment step exists but deployment.in_scope is not true",
        ),
      );
    }
    if (capability === "repo.merge" && executor !== "founder") {
      findings.push(error("MERGE_NOT_FOUNDER", `${path}.executor`, "merging is a founder act"));
    }
  });

  // --- Deployment permission must be explicit ----------------------------
  if (deploymentInScope) {
    const statement = typeof deployment["statement"] === "string" ? deployment["statement"] : "";
    if (deployment["permission"] !== "explicit") {
      findings.push(
        error(
          "DEPLOYMENT_PERMISSION",
          "$.deployment.permission",
          "deployment is in scope but permission is not 'explicit' (GV-004)",
        ),
      );
    }
    if (deployment["granted_by"] !== "founder") {
      findings.push(
        error(
          "DEPLOYMENT_PERMISSION",
          "$.deployment.granted_by",
          "deployment permission must be granted by the founder",
        ),
      );
    }
    if (statement.trim().length < 10) {
      findings.push(
        error(
          "DEPLOYMENT_PERMISSION",
          "$.deployment.statement",
          "deployment permission must quote the founder's explicit statement",
        ),
      );
    } else if (CONDITIONAL_PERMISSION.test(statement)) {
      findings.push(
        error(
          "DEPLOYMENT_PERMISSION",
          "$.deployment.statement",
          `"${statement}" is conditional; 'when appropriate' is not permission (GV-004)`,
        ),
      );
    }
    if (typeof deployment["target"] !== "string") {
      findings.push(
        error(
          "DEPLOYMENT_PERMISSION",
          "$.deployment.target",
          "deployment target (staging|production) is required",
        ),
      );
    }
  } else if (deployment["permission"] === "explicit") {
    findings.push(
      warning(
        "DEPLOYMENT_PERMISSION",
        "$.deployment",
        "permission is 'explicit' but deployment is not in scope",
      ),
    );
  }

  // --- Merge is a founder act --------------------------------------------
  const merge = assignment["merge"] as Json | undefined;
  if (merge && merge["allowed"] === true && merge["by"] !== "founder") {
    findings.push(error("MERGE_NOT_FOUNDER", "$.merge.by", "merging is a founder act"));
  }

  // --- Outputs must be addressable ---------------------------------------
  ((assignment["outputs"] as Json[] | undefined) ?? []).forEach((output, i) => {
    const path = `$.outputs[${i}]`;
    if (
      output["store"] === "git" &&
      (typeof output["repo"] !== "string" || typeof output["path"] !== "string")
    ) {
      findings.push(error("OUTPUT_UNADDRESSABLE", path, "git outputs must name repo and path"));
    }
    if (output["store"] === "drive" && typeof output["folder_id"] !== "string") {
      findings.push(error("OUTPUT_UNADDRESSABLE", path, "Drive outputs must name the folder id"));
    }
  });

  return finish(findings);
}

if (import.meta.main) {
  const file = process.argv[2];
  if (!file) {
    console.error("usage: bun scripts/ai/validate-assignment.ts <assignment.json|assignment.md>");
    process.exit(2);
  }
  const result = validateAssignment(parseAssignmentText(readFileSync(file, "utf8")));
  printResult(`validate-assignment ${file}`, result);
  process.exit(result.ok ? 0 : 1);
}

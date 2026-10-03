// Shared helpers for the `.ai` governance validators. Pure where possible so
// the vitest suite can exercise every fail-closed rule without touching disk.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const REPO_ROOT = resolve(import.meta.dirname, "../../..");
export const AI_DIR = resolve(REPO_ROOT, ".ai");

export const FULL_SHA = /^[0-9a-f]{40}$/;
export const SHA256 = /^[0-9a-f]{64}$/;
export const DRIVE_ID = /^[A-Za-z0-9_-]{20,}$/;

export type Severity = "error" | "warning";

export interface Finding {
  code: string;
  severity: Severity;
  path: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  findings: Finding[];
}

export function finish(findings: Finding[]): ValidationResult {
  return { ok: !findings.some((f) => f.severity === "error"), findings };
}

export function error(code: string, path: string, message: string): Finding {
  return { code, severity: "error", path, message };
}

export function warning(code: string, path: string, message: string): Finding {
  return { code, severity: "warning", path, message };
}

export function readJson<T = unknown>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export function aiFile(name: string): string {
  return resolve(AI_DIR, name);
}

/**
 * Free-text location references that are not addressable. A reference to a
 * chat attachment, "Files", "this project" or a bare filename cannot be
 * retrieved by another tool, so every validator treats them as fatal.
 */
export const VAGUE_LOCATION_PATTERNS: ReadonlyArray<{ id: string; pattern: RegExp }> = [
  { id: "files-tab", pattern: /\b(in|from|see|under|check|via)\s+(the\s+)?Files\b/i },
  { id: "this-project", pattern: /\bthis project\b/i },
  { id: "attached", pattern: /\b(attached|attachment|as attached)\b/i },
  { id: "chat", pattern: /\b(in|from|via)\s+(the\s+)?(chat|thread|conversation)\b/i },
  {
    id: "shared-earlier",
    pattern: /\b(shared|sent|provided)\s+(earlier|before|previously|above)\b/i,
  },
  { id: "as-discussed", pattern: /\bas discussed\b/i },
  { id: "project-knowledge", pattern: /\bproject (knowledge|files)\b/i },
];

export const BARE_FILENAME =
  /^[\w.\- ()]+\.(zip|pdf|md|json|csv|xlsx|docx|txt|png|jpg|sql|ts|tsx)$/i;

export function vagueLocationIssue(text: string): string | null {
  for (const { id, pattern } of VAGUE_LOCATION_PATTERNS) {
    if (pattern.test(text)) return id;
  }
  return null;
}

export function isBareFilename(text: string): boolean {
  return BARE_FILENAME.test(text.trim());
}

/** A permission that is conditional is not a permission. */
export const CONDITIONAL_PERMISSION =
  /\b(when|if|where|as)\s+(appropriate|needed|required|necessary|applicable)\b|\bat (your|the agent'?s) discretion\b/i;

export function printResult(title: string, result: ValidationResult): void {
  const errors = result.findings.filter((f) => f.severity === "error");
  const warnings = result.findings.filter((f) => f.severity === "warning");
  console.log(
    `${title}: ${result.ok ? "PASS" : "FAIL"} (${errors.length} error(s), ${warnings.length} warning(s))`,
  );
  for (const f of result.findings) {
    console.log(`  ${f.severity.toUpperCase()} ${f.code} @ ${f.path} — ${f.message}`);
  }
}

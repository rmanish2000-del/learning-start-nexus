import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * White-label guard. EduOS must never present build-platform branding on any
 * user-facing surface: copy, metadata, manifests, emails, public assets or
 * share previews. Technical imports (`@lovable.dev/*` packages, the managed
 * OAuth consent endpoint, error reporting) are runtime dependencies and are
 * invisible to end users, so they are allow-listed by path/prefix only.
 */

const FORBIDDEN_PHRASES = [
  "made with lovable",
  "built with lovable",
  "edit with lovable",
  "powered by lovable",
  "lovable.app",
  "gptengineer",
];

/** Technical, non-user-facing dependency prefixes that may mention the vendor. */
const TECHNICAL_ALLOWANCES = [
  "@lovable.dev/",
  "lovableproject.com",
  "lovableproject-dev.com",
  "beta.lovable.dev",
  "lovable-error-reporting",
  "reportlovableerror",
  "/integrations/lovable",
  "lovable.auth",
  "lovable_api_key",
  "lovable_send_url",
  "/lovable/email/auth/",
  "/.lovable/oauth/consent",
  ".lovable/oauth/consent",
  "lovable/email/auth",
];

/**
 * Infrastructure files that must reference platform hosts to work at all:
 * preview-session isolation, CSP frame-ancestors, preview-host detection and
 * the Cloud email preview endpoint. None of these render user-facing copy.
 */
const TECHNICAL_FILES = [
  "src/integrations/supabase/previewAuthStorage.ts",
  "src/integrations/supabase/client.ts",
  "src/lib/security-headers.ts",
  "src/lib/pwa/register-sw.ts",
  "src/lib/environment.ts",
  "src/routes/lovable/email/auth/preview.ts",
  "src/routes/lovable/email/auth/webhook.ts",
  "src/lib/__tests__/security-headers.test.ts",
  "src/lib/__tests__/pwa-safety.test.ts",
  "src/lib/__tests__/no-platform-branding.test.ts",
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function offendingLines(file: string): string[] {
  if (TECHNICAL_FILES.some((t) => file.split("\\").join("/").endsWith(t))) return [];
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return [];
  }
  const bad: string[] = [];
  text.split("\n").forEach((line, i) => {
    const lower = line.toLowerCase();
    if (!lower.includes("lovable") && !lower.includes("gptengineer")) return;
    let stripped = lower;
    for (const allowed of TECHNICAL_ALLOWANCES) stripped = stripped.split(allowed).join("");
    if (FORBIDDEN_PHRASES.some((p) => stripped.includes(p))) bad.push(`${file}:${i + 1}`);
  });
  return bad;
}

describe("white-label branding guard", () => {
  it("keeps platform branding out of application source", () => {
    const files = walk("src").filter((f) => /\.(tsx?|css|json|html)$/.test(f));
    const offenders = files.flatMap(offendingLines);
    expect(offenders).toEqual([]);
  });

  it("keeps platform branding out of public assets and the manifest", () => {
    const files = walk("public").filter((f) => /\.(html|webmanifest|json|js|txt|xml)$/.test(f));
    const offenders = files.flatMap(offendingLines);
    expect(offenders).toEqual([]);
  });

  it("keeps platform branding out of authentication and transactional emails", () => {
    const files = walk("src/lib/email-templates");
    for (const f of files) {
      const text = readFileSync(f, "utf8").toLowerCase();
      expect(text).not.toContain("lovable");
    }
  });

  it("gives every public page an EduOS-owned share image", () => {
    // Without an explicit og:image the hosting platform substitutes a generated
    // screenshot served from a third-party preview domain, which leaks the
    // platform name into shared links.
    const publicRoutes = [
      "index",
      "about",
      "contact",
      "privacy",
      "terms",
      "diagnostic.index",
      "free-learning-check",
      "cbse-paper-practice",
      "cbse-class-10-learning-gap-diagnostic",
      "class-10-maths-diagnostic",
      "class-10-science-diagnostic",
      "parent-guide-learning-gaps",
      "reassessment-and-evidence",
    ];
    for (const route of publicRoutes) {
      const src = readFileSync(`src/routes/${route}.tsx`, "utf8");
      const hasImage = src.includes("og:image") || /image:\s*\{/.test(src);
      expect(hasImage, `${route} is missing an EduOS share image`).toBe(true);
    }
  });
});

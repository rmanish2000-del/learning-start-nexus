// Release-blocking: no vendor/platform branding may reach customers.
// Internal identifiers (imports, env names, integration modules, routes required
// by the platform) are allowed; visible text, metadata and public files are not.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { SITE_NAME } from "../seo";

const FORBIDDEN = /lovable|supabase|gpt[\s-]?engineer|learning-start-nexus/i;
const ROOT = process.cwd();

function walk(dir: string, exts: RegExp, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      // `routes/lovable` holds platform-internal endpoints (email webhooks and
      // previews, bypassed from the auth gate) that no customer ever renders.
      if (name === "__tests__" || name === "integrations" || name === "lovable") continue;
      walk(p, exts, out);
    } else if (exts.test(name)) out.push(p);
  }
  return out;
}

// Lines that only carry internal identifiers, never rendered text.
const INTERNAL =
  /^\s*(import|export \{|\/\/|\*|\/\*)|@\/integrations|process\.env|createFileRoute\(|from "@lovable|lovable\.auth\.|supabase\.(auth|from|rpc|storage|functions|channel|removeChannel)|\bsupabase\b(?!["'`])|Supabase[A-Z]\w*|reportLovableError|LovableError|createLovableAiGatewayProvider|__lovable|LOVABLE_|"Lovable-API-Key"|ai\.gateway\.lovable\.dev|lovableproject|beta\.lovable\.dev|\.lovable\/oauth|name: "lovable"|security-headers/;

describe("vendor branding is never customer-visible", () => {
  it("public files (manifest, offline page, robots) are clean", () => {
    const files = walk(join(ROOT, "public"), /\.(html|webmanifest|json|txt|xml|js|svg)$/);
    const hits = files.filter((f) => FORBIDDEN.test(readFileSync(f, "utf8")));
    expect(hits).toEqual([]);
  });

  it("rendered text and metadata in routes/components are clean", () => {
    const files = [
      ...walk(join(ROOT, "src/routes"), /\.tsx?$/),
      ...walk(join(ROOT, "src/components"), /\.tsx?$/),
    ].filter((f) => !f.endsWith("routeTree.gen.ts"));
    const hits: string[] = [];
    for (const f of files) {
      readFileSync(f, "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (FORBIDDEN.test(line) && !INTERNAL.test(line))
            hits.push(`${f}:${i + 1}: ${line.trim()}`);
        });
    }
    expect(hits).toEqual([]);
  });

  it("production metadata uses the EduOS identity", () => {
    const seo = readFileSync(join(ROOT, "src/lib/seo.ts"), "utf8");
    expect(seo).toContain('"https://www.eduos.global"');
    expect(SITE_NAME).toBe("EduOS");
    const manifest = readFileSync(join(ROOT, "public/manifest.webmanifest"), "utf8");
    expect(manifest).toMatch(/EduOS/);
  });

  it("built client bundles carry no visible vendor copy (when a build exists)", () => {
    const dir = join(ROOT, "dist/client/assets");
    if (!existsSync(dir)) return;
    const hits = walk(dir, /\.(html|css)$/).filter((f) => FORBIDDEN.test(readFileSync(f, "utf8")));
    expect(hits).toEqual([]);
  });
});

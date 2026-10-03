import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { sanitizeReturnPath } from "../return-path";

const read = (p: string) => readFileSync(resolve(import.meta.dirname, "../../..", p), "utf8");

describe("sign-in return path (deep links)", () => {
  it("accepts same-origin internal paths, with search and hash", () => {
    expect(sanitizeReturnPath("/exam-pattern")).toBe("/exam-pattern");
    expect(sanitizeReturnPath("/exam-pattern?board=MPBSE")).toBe("/exam-pattern?board=MPBSE");
    expect(sanitizeReturnPath("/learners/abc#notes")).toBe("/learners/abc#notes");
  });

  it("rejects protocol-relative and backslash hosts (//evil.com)", () => {
    expect(sanitizeReturnPath("//evil.com")).toBeUndefined();
    expect(sanitizeReturnPath("//evil.com/exam-pattern")).toBeUndefined();
    expect(sanitizeReturnPath("/\\evil.com")).toBeUndefined();
    expect(sanitizeReturnPath("/\\\\evil.com")).toBeUndefined();
  });

  it("rejects external absolute URLs and non-path values", () => {
    for (const bad of [
      "https://evil.com/",
      "http://evil.com",
      "javascript:alert(1)",
      "evil.com",
      "exam-pattern",
      "",
      42,
      null,
      undefined,
      "/" + "a".repeat(3000),
    ]) {
      expect(sanitizeReturnPath(bad), String(bad)).toBeUndefined();
    }
  });
});

describe("deep-link return wiring", () => {
  it("the document gate and the authenticated layout both carry the requested page to /auth", () => {
    const start = read("src/start.ts");
    expect(start).toMatch(
      /location: `\/auth\?next=\$\{encodeURIComponent\(url\.pathname \+ url\.search\)\}`/,
    );
    const route = read("src/routes/_authenticated/route.tsx");
    expect(route).toContain('throw redirect({ to: "/auth", search: { next: location.href } });');
  });

  it("/auth always sets `next` in validateSearch and consumes only a freshly sanitized value at both redirects", () => {
    const auth = read("src/routes/auth.tsx");
    expect(auth).toContain(
      'import { sanitizeReturnPath, validatedReturnPath } from "@/lib/return-path";',
    );
    expect(auth).toContain("...validatedReturnPath(search),");
    expect(auth).not.toMatch(/auth-return/);
    expect(auth).not.toMatch(/search\["next"\]\.startsWith\("\/"\)/);
    const redirects = auth.match(/window\.location\.replace\(([^)]*)\)/g) ?? [];
    expect(redirects).toHaveLength(2);
    for (const r of redirects) expect(r).toBe("window.location.replace(target)");
    expect((auth.match(/const target = sanitizeReturnPath\(search\.next\);/g) ?? []).length).toBe(
      2,
    );
    // Signed-in cold load: the marker is renewed before `next` is honoured.
    expect(auth).toMatch(
      /setSessionMarker\(\);\s*\n\s*\/\/[^\n]*\n\s*const target = sanitizeReturnPath\(search\.next\);/,
    );
  });

  it("exactly one return-path sanitizer exists in src/lib", () => {
    expect(existsSync(resolve(import.meta.dirname, "../auth-return.ts"))).toBe(false);
    expect(existsSync(resolve(import.meta.dirname, "../return-path.ts"))).toBe(true);
  });
});

describe("attempt storage cleanup wiring", () => {
  it("sign-out from the user menu and the auth listener both clear eduos.pyq.* keys", () => {
    const menu = read("src/components/user-menu.tsx");
    expect(menu).toContain("clearAttemptStorage();");
    const root = read("src/routes/__root.tsx");
    expect(root).toMatch(
      /if \(event === "SIGNED_OUT"\) \{\s*\n\s*clearSessionMarker\(\);\s*\n\s*clearAttemptStorage\(\);/,
    );
    expect(root).toContain("claimAttemptStorage(session?.user.id);");
  });

  it("the exam-pattern page restores a saved attempt only after claiming storage for the signed-in account", () => {
    const page = read("src/routes/_authenticated/exam-pattern.tsx");
    expect(page).toContain("if (claimAttemptStorage(data.session?.user.id)) {");
    expect(page).toContain(
      "window.localStorage.removeItem(`eduos.pyq.answers.${session?.sessionId}`);",
    );
  });
});

describe("MPBSE practice stays disabled", () => {
  it("every MPBSE paper card renders a disabled practice button and an official mpbse.nic.in link only", () => {
    const panel = read("src/components/mpbse-papers.tsx");
    expect(panel).toMatch(
      /<Button size="sm" variant="secondary" disabled aria-describedby="mpbse-practice-note">/,
    );
    expect(panel).not.toMatch(/startPyqSessionFn|startMutation/);
    expect(panel).toContain('rel="noopener noreferrer"');
  });
});

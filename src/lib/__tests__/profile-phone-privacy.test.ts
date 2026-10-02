// Privacy: a member of an organisation must never be able to read another
// member's phone number. Enforcement is server-side (column privileges on
// public.profiles + a scoped SECURITY DEFINER accessor), not UI hiding.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const MIGRATIONS = join(ROOT, "supabase", "migrations");

function migrationWith(pattern: RegExp): string {
  const files = readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  let found = "";
  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS, file), "utf8");
    if (pattern.test(sql)) found = sql;
  }
  return found;
}

const sql = migrationWith(/GRANT SELECT \(id, org_id, full_name/i);

describe("profiles phone column privileges", () => {
  it("has a migration that revokes table-wide SELECT from client roles", () => {
    expect(sql).not.toBe("");
    expect(sql).toMatch(/REVOKE SELECT ON public\.profiles FROM authenticated/i);
    expect(sql).toMatch(/REVOKE SELECT ON public\.profiles FROM anon/i);
  });

  it("re-grants only the non-sensitive columns to signed-in users", () => {
    const grant = /GRANT SELECT \(([^)]+)\)\s*\n?\s*ON public\.profiles TO authenticated/i.exec(sql);
    expect(grant).not.toBeNull();
    const columns = (grant?.[1] ?? "").split(",").map((c) => c.trim());
    expect(columns).toEqual(["id", "org_id", "full_name", "created_at", "updated_at"]);
    expect(columns).not.toContain("phone");
  });

  it("keeps trusted server code able to read the column", () => {
    expect(sql).toMatch(/GRANT ALL ON public\.profiles TO service_role/i);
  });

  it("exposes phone only through a scoped accessor function", () => {
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.profile_phone\(_user_id uuid\)/i);
    expect(sql).toMatch(/SECURITY DEFINER/i);
    expect(sql).toMatch(/SET search_path = public/i);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.profile_phone\(uuid\) FROM PUBLIC/i);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.profile_phone\(uuid\) FROM anon/i);
  });
});

// Mirrors the accessor's SQL predicate so the role boundary is asserted
// positively and negatively.
type Caller = { uid: string | null; isAdmin: boolean; orgId: string | null };
type Target = { id: string; orgId: string | null };

function canReadPhone(caller: Caller, target: Target): boolean {
  if (!caller.uid) return false;
  if (caller.uid === target.id) return true;
  return Boolean(caller.isAdmin && target.orgId && target.orgId === caller.orgId);
}

const TARGET: Target = { id: "parent-a", orgId: "org-1" };

describe("profile_phone access matrix", () => {
  it("allows the owner", () => {
    expect(canReadPhone({ uid: "parent-a", isAdmin: false, orgId: "org-1" }, TARGET)).toBe(true);
  });

  it("allows an admin of the same organisation", () => {
    expect(canReadPhone({ uid: "admin-1", isAdmin: true, orgId: "org-1" }, TARGET)).toBe(true);
  });

  it("denies an admin of another organisation", () => {
    expect(canReadPhone({ uid: "admin-2", isAdmin: true, orgId: "org-2" }, TARGET)).toBe(false);
  });

  it.each([
    ["educator", { uid: "educator-1", isAdmin: false, orgId: "org-1" }],
    ["reviewer", { uid: "reviewer-1", isAdmin: false, orgId: "org-1" }],
    ["learner", { uid: "student-1", isAdmin: false, orgId: "org-1" }],
    ["unrelated parent", { uid: "parent-b", isAdmin: false, orgId: "org-1" }],
    ["rival organisation member", { uid: "rival-1", isAdmin: false, orgId: "org-2" }],
  ] as const)("denies a same-org %s", (_label, caller) => {
    expect(canReadPhone(caller, TARGET)).toBe(false);
  });

  it("denies anonymous callers", () => {
    expect(canReadPhone({ uid: null, isAdmin: false, orgId: null }, TARGET)).toBe(false);
  });

  it("denies an admin when the target has no organisation", () => {
    expect(canReadPhone({ uid: "admin-1", isAdmin: true, orgId: "org-1" }, { id: "x", orgId: null })).toBe(
      false,
    );
  });
});

describe("client-reachable code never selects profiles.phone", () => {
  it("keeps phone out of browser/RLS-scoped profile queries", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "__tests__" || entry.name === "node_modules") continue;
          walk(path);
          continue;
        }
        if (!/\.(ts|tsx)$/.test(entry.name)) continue;
        if (entry.name.endsWith(".server.ts") || entry.name.endsWith(".server.tsx")) continue;
        const src = readFileSync(path, "utf8");
        const matches = src.match(/from\("profiles"\)[\s\S]{0,160}?\.select\(([^)]*)\)/g) ?? [];
        if (matches.some((m) => m.includes("phone"))) offenders.push(path);
      }
    };
    walk(join(ROOT, "src"));
    expect(offenders).toEqual([]);
  });
});

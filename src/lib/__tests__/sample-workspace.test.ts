// Sample workspace guarantees: labelled at the data layer, isolated to one
// organization, created and removed atomically by service-role-only database
// functions, logged, and excluded from every reporting surface.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");
const sql = read("supabase/migrations/20261002050123_4b519290-29d6-4d7b-a837-c369974aa40e.sql");

describe("schema", () => {
  it("flags sample rows on every table the workspace writes to", () => {
    for (const table of ["learners", "assessments", "assessment_sessions"]) {
      expect(sql).toContain(
        `ALTER TABLE public.${table} ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;`,
      );
    }
  });

  it("creation and removal are SECURITY DEFINER functions callable by the service role only", () => {
    for (const fn of ["create_sample_workspace", "remove_sample_workspace"]) {
      expect(sql).toContain(`FUNCTION public.${fn}(p_org uuid, p_actor uuid)`);
      expect(sql).toContain(
        `REVOKE EXECUTE ON FUNCTION public.${fn}(uuid, uuid) FROM PUBLIC, anon, authenticated;`,
      );
      expect(sql).toContain(`GRANT EXECUTE ON FUNCTION public.${fn}(uuid, uuid) TO service_role;`);
    }
    const create = sql.slice(
      sql.indexOf("FUNCTION public.create_sample_workspace"),
      sql.indexOf("FUNCTION public.remove_sample_workspace"),
    );
    expect(create).toContain("SECURITY DEFINER");
    expect(create).toContain("RAISE EXCEPTION 'sample workspace already exists'");
  });

  it("every generated row is labelled SAMPLE and scoped to the requesting organization", () => {
    const create = sql.slice(
      sql.indexOf("FUNCTION public.create_sample_workspace"),
      sql.indexOf("FUNCTION public.remove_sample_workspace"),
    );
    const learnerInserts =
      create.match(/INSERT INTO public\.learners[\s\S]*?VALUES \(p_org,[^\n]*\n/g) ?? [];
    expect(learnerInserts).toHaveLength(5);
    for (const row of learnerInserts) {
      expect(row).toContain("(SAMPLE)");
      expect(row).toContain("true, true, 'centre_managed'"); // is_demo, is_sample
    }
    const assessmentInserts =
      create.match(/INSERT INTO public\.assessments[\s\S]*?VALUES \(p_org,[^\n]*\n/g) ?? [];
    expect(assessmentInserts).toHaveLength(3);
    for (const row of assessmentInserts) {
      expect(row).toContain("'SAMPLE ·");
      expect(row).toMatch(/true, true\)/);
    }
    // No real names: identifiers are generated.
    expect(create).not.toMatch(/Aarav|Anaya|Rudra|Tara|Sharma|Deshmukh/);
  });

  it("removal is all-or-nothing and logged with the acting user", () => {
    const remove = sql.slice(sql.indexOf("FUNCTION public.remove_sample_workspace"));
    expect(remove).toContain("DELETE FROM public.assessment_sessions");
    expect(remove).toContain("DELETE FROM public.assessments WHERE org_id = p_org AND is_sample");
    expect(remove).toContain("DELETE FROM public.learners WHERE org_id = p_org AND is_sample");
    expect(remove).toContain("INSERT INTO public.sample_workspace_events");
    expect(remove).toContain("'removed', p_actor");
    expect(sql).toContain("sample_workspace_events_no_update");
    expect(sql).toContain("sample_workspace_events_no_delete");
  });
});

describe("server surface", () => {
  it("centre-admin functions resolve the organization from the caller, never from input", () => {
    const src = read("src/lib/centre-setup.functions.ts");
    const fns = src.split("export const ").slice(1);
    expect(fns.length).toBe(5);
    for (const fn of fns) {
      expect(fn).toContain('requireAnyRole(context.supabase, context.userId, ["admin"])');
      expect(fn).toContain("callerOrgId(context.supabase, context.userId)");
    }
    expect(src).not.toContain("data.orgId");
  });

  it("creation and removal go through the atomic database functions", () => {
    const src = read("src/lib/centre-setup.server.ts");
    expect(src).toContain('rpc("create_sample_workspace"');
    expect(src).toContain('rpc("remove_sample_workspace"');
    // No piecemeal client-side deletes that could leave a half-removed workspace.
    expect(src).not.toMatch(/\.delete\(\)/);
  });
});

describe("reporting exclusion", () => {
  const reporting = [
    "src/lib/outcome-dashboard.server.ts",
    "src/lib/educator-board.server.ts",
    "src/lib/pilot-evidence.server.ts",
  ];
  for (const file of reporting) {
    it(`${file} excludes sample rows at the data layer`, () => {
      expect(read(file)).toContain('.eq("is_sample", false)');
    });
  }

  it("the dashboard roster and stats exclude sample learners and label the workspace", () => {
    const src = read("src/routes/_authenticated/dashboard.tsx");
    expect(src).toContain('.eq("is_sample", false)');
    expect(src).toContain("SAMPLE workspace active");
  });

  it("the learners list labels every sample learner", () => {
    const src = read("src/routes/_authenticated/learners.tsx");
    expect(src).toContain("learner.is_sample");
    expect(src).toContain("SAMPLE");
  });
});

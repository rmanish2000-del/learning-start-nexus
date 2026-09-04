// Security: a tutor session may only be updated by the signed-in student who
// owns the linked learner record — for the existing row (USING) and for the
// updated row (WITH CHECK), so ownership fields cannot be reassigned.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATIONS = join(process.cwd(), "supabase", "migrations");

function latestUpdatePolicySql(): string {
  const files = readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  let found = "";
  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS, file), "utf8");
    if (/CREATE POLICY\s+"?tutor_sessions_update"?/i.test(sql)) found = sql;
  }
  return found;
}

// Mirrors the SQL predicate of tutor_sessions_update.
type Row = { student_user_id: string | null; org_id: string; learner_id: string };
type Caller = { uid: string | null; orgId: string | null; ownLearnerIds: string[] };

function canUpdate(caller: Caller, existing: Row, updated: Row = existing): boolean {
  const ok = (row: Row) =>
    caller.uid !== null &&
    row.student_user_id === caller.uid &&
    row.org_id === caller.orgId &&
    caller.ownLearnerIds.includes(row.learner_id);
  return ok(existing) && ok(updated);
}

const ROW: Row = { student_user_id: "student-a", org_id: "org-1", learner_id: "learner-a" };
const STUDENT_A: Caller = { uid: "student-a", orgId: "org-1", ownLearnerIds: ["learner-a"] };

describe("tutor_sessions UPDATE policy SQL", () => {
  const sql = latestUpdatePolicySql();

  it("exists", () => {
    expect(sql).not.toBe("");
  });

  it("enforces learner ownership in both USING and WITH CHECK", () => {
    const body = sql.slice(sql.search(/CREATE POLICY\s+"?tutor_sessions_update"?/i));
    const using = body.slice(body.search(/USING/i), body.search(/WITH CHECK/i));
    const withCheck = body.slice(body.search(/WITH CHECK/i));
    for (const clause of [using, withCheck]) {
      expect(clause).toMatch(/student_user_id\s*=\s*auth\.uid\(\)/);
      expect(clause).toMatch(/org_id\s*=\s*private\.current_org_id\(\)/);
      expect(clause).toMatch(/private\.is_own_learner\(\s*learner_id\s*\)/);
    }
  });
});

describe("tutor session update authorisation matrix", () => {
  it("allows the owning learner", () => {
    expect(canUpdate(STUDENT_A, ROW)).toBe(true);
  });

  it("blocks another learner in the same org", () => {
    const studentB: Caller = { uid: "student-b", orgId: "org-1", ownLearnerIds: ["learner-b"] };
    expect(canUpdate(studentB, ROW)).toBe(false);
  });

  it("blocks reassigning learner_id to a sibling in the same family", () => {
    const withSibling: Caller = {
      uid: "student-a",
      orgId: "org-1",
      ownLearnerIds: ["learner-a"],
    };
    expect(canUpdate(withSibling, ROW, { ...ROW, learner_id: "sibling-learner" })).toBe(false);
  });

  it("blocks reassigning student_user_id to another user", () => {
    expect(canUpdate(STUDENT_A, ROW, { ...ROW, student_user_id: "student-b" })).toBe(false);
  });

  it("blocks a caller from another organisation", () => {
    const crossOrg: Caller = { uid: "student-a", orgId: "org-2", ownLearnerIds: ["learner-a"] };
    expect(canUpdate(crossOrg, ROW)).toBe(false);
  });

  it("blocks moving a session to another organisation", () => {
    expect(canUpdate(STUDENT_A, ROW, { ...ROW, org_id: "org-2" })).toBe(false);
  });

  it("blocks anonymous callers", () => {
    const anon: Caller = { uid: null, orgId: null, ownLearnerIds: [] };
    expect(canUpdate(anon, ROW)).toBe(false);
  });

  it("blocks a parent or staff member who is not the session's student", () => {
    const parent: Caller = { uid: "parent-1", orgId: "org-1", ownLearnerIds: ["learner-a"] };
    const educator: Caller = { uid: "educator-1", orgId: "org-1", ownLearnerIds: [] };
    expect(canUpdate(parent, ROW)).toBe(false);
    expect(canUpdate(educator, ROW)).toBe(false);
  });
});

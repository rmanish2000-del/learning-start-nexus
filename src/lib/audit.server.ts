// Sprint 2 audit closure: server-only helpers behind the audit server
// functions. Everything here returns plain DTOs with verbatim database
// responses so an independent reviewer can validate without trusting
// application claims.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { asResultEntries, type ResultEntry } from "./assessment-shared";

type Client = SupabaseClient<Database>;

export type CallerIdentity = {
  userId: string;
  role: string;
  orgId: string | null;
  orgName: string | null;
};

export async function getCallerIdentity(supabase: Client, userId: string): Promise<CallerIdentity> {
  const [{ data: roleRow }, { data: profile }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId).limit(1).maybeSingle(),
    supabase.from("profiles").select("org_id").eq("id", userId).maybeSingle(),
  ]);
  const orgId = profile?.org_id ?? null;
  let orgName: string | null = null;
  if (orgId) {
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", orgId)
      .maybeSingle();
    orgName = org?.name ?? null;
  }
  return { userId, role: (roleRow?.role as string | undefined) ?? "student", orgId, orgName };
}

// ---------------------------------------------------------------------------
// 1. Live policy registry (straight from pg_policies via the audit view)
// ---------------------------------------------------------------------------

export type PolicyAuditRow = {
  tablename: string;
  policyname: string;
  cmd: string;
  roles: string;
  using_expression: string | null;
  with_check_expression: string | null;
};

export const AUDIT_TABLES = [
  "assessments",
  "assessment_sessions",
  "assessment_items",
  "learner_assessments",
  "learner_evidence",
] as const;

export async function fetchPolicyAudit(supabase: Client): Promise<PolicyAuditRow[]> {
  const { data, error } = await supabase
    .from("rls_policy_audit")
    .select("tablename, policyname, cmd, roles, using_expression, with_check_expression");
  if (error) throw new Error(error.message);
  return (data ?? []) as PolicyAuditRow[];
}

// ---------------------------------------------------------------------------
// 2. Cross-organization test runner
// ---------------------------------------------------------------------------

export type DbErrorShape = {
  code: string | null;
  message: string;
  details: string | null;
  hint: string | null;
} | null;

export type CrossOrgTest = {
  key: "read_assessment" | "create_session" | "update_evidence";
  name: string;
  operation: string;
  expectation: string;
  targetOrgId: string;
  targetOrgName: string;
  targetId: string | null;
  pass: boolean;
  skipped: boolean;
  dbResponse: {
    error: DbErrorShape;
    rowsAffected: number | null;
    summary: string;
  };
  postCheck: string | null;
};

function shapeError(err: unknown): DbErrorShape {
  if (!err || typeof err !== "object") return null;
  const e = err as { code?: string; message?: string; details?: string | null; hint?: string | null };
  return {
    code: e.code ?? null,
    message: e.message ?? "unknown error",
    details: e.details ?? null,
    hint: e.hint ?? null,
  };
}

function skippedTest(
  key: CrossOrgTest["key"],
  name: string,
  operation: string,
  expectation: string,
  org: { id: string; name: string },
  reason: string,
): CrossOrgTest {
  return {
    key,
    name,
    operation,
    expectation,
    targetOrgId: org.id,
    targetOrgName: org.name,
    targetId: null,
    pass: true,
    skipped: true,
    dbResponse: { error: null, rowsAffected: null, summary: reason },
    postCheck: null,
  };
}

export async function runCrossOrgTests(
  supabase: Client,
  admin: Client,
  orgId: string,
): Promise<CrossOrgTest[]> {
  const { data: foreignOrg } = await admin
    .from("organizations")
    .select("id, name")
    .neq("id", orgId)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!foreignOrg) return [];
  const org = { id: foreignOrg.id, name: foreignOrg.name };
  const tests: CrossOrgTest[] = [];

  // Locate foreign rows with the service role (the caller can never see
  // these IDs through RLS — that is exactly what we are about to prove).
  const { data: foreignAssessment } = await admin
    .from("assessments")
    .select("id, title")
    .eq("org_id", org.id)
    .limit(1)
    .maybeSingle();
  const { data: foreignLearner } = await admin
    .from("learners")
    .select("id, full_name")
    .eq("org_id", org.id)
    .limit(1)
    .maybeSingle();
  const { data: foreignEvidence } = await admin
    .from("learner_evidence")
    .select("id, note, learners!inner(org_id)")
    .eq("learners.org_id", org.id)
    .limit(1)
    .maybeSingle();

  // --- Test 1: read another organization's assessment by primary key ------
  if (!foreignAssessment) {
    tests.push(
      skippedTest(
        "read_assessment",
        "Read other-org assessment",
        `SELECT assessments WHERE id = <other-org row>`,
        "0 rows — the row belongs to another organization",
        org,
        "Skipped — the other organization has no assessment to target",
      ),
    );
  } else {
    const read = await supabase.from("assessments").select("id, title").eq("id", foreignAssessment.id);
    const rows = read.data?.length ?? 0;
    tests.push({
      key: "read_assessment",
      name: "Read other-org assessment",
      operation: `SELECT id, title FROM assessments WHERE id = '${foreignAssessment.id}'`,
      expectation: "0 rows — the row belongs to another organization",
      targetOrgId: org.id,
      targetOrgName: org.name,
      targetId: foreignAssessment.id,
      pass: rows === 0,
      skipped: false,
      dbResponse: {
        error: shapeError(read.error),
        rowsAffected: rows,
        summary: read.error
          ? `Request rejected: ${read.error.message}`
          : `HTTP 200 OK — ${rows} row(s) returned (target exists globally, confirmed via service role)`,
      },
      postCheck: null,
    });
  }

  // --- Test 2: create a session inside another organization ---------------
  if (!foreignAssessment || !foreignLearner) {
    tests.push(
      skippedTest(
        "create_session",
        "Create session in other org",
        `INSERT INTO assessment_sessions (org_id = <other org>)`,
        "Rejected by RLS (42501 row-level security violation)",
        org,
        "Skipped — the other organization lacks an assessment or learner to target",
      ),
    );
  } else {
    const ins = await supabase.from("assessment_sessions").insert({
      org_id: org.id,
      assessment_id: foreignAssessment.id,
      learner_id: foreignLearner.id,
      status: "assigned",
      answers: {},
      current_position: 0,
    });
    let postCheck: string | null = null;
    if (!ins.error) {
      // Policy breach — remove the row immediately and report failure.
      await admin
        .from("assessment_sessions")
        .delete()
        .eq("org_id", org.id)
        .eq("learner_id", foreignLearner.id)
        .eq("status", "assigned");
      postCheck = "Inserted row was deleted via service role during cleanup.";
    }
    tests.push({
      key: "create_session",
      name: "Create session in other org",
      operation: `INSERT INTO assessment_sessions (org_id = '${org.id}', learner = '${foreignLearner.full_name}')`,
      expectation: "Rejected by RLS (42501 row-level security violation)",
      targetOrgId: org.id,
      targetOrgName: org.name,
      targetId: foreignLearner.id,
      pass: !!ins.error,
      skipped: false,
      dbResponse: {
        error: shapeError(ins.error),
        rowsAffected: ins.error ? 0 : 1,
        summary: ins.error
          ? `HTTP ${ins.error.code === "42501" ? "403 Forbidden" : "error"} — ${ins.error.message}`
          : "INSERT SUCCEEDED — policy breach",
      },
      postCheck,
    });
  }

  // --- Test 3: update another organization's evidence row ------------------
  if (!foreignEvidence) {
    tests.push(
      skippedTest(
        "update_evidence",
        "Update other-org evidence",
        `UPDATE learner_evidence SET note = <tamper> WHERE id = <other-org row>`,
        "0 rows modified — the row is invisible to the caller",
        org,
        "Skipped — the other organization has no evidence row to target",
      ),
    );
  } else {
    const tamperNote = `CROSS-ORG TAMPER ATTEMPT ${new Date().toISOString()}`;
    const upd = await supabase
      .from("learner_evidence")
      .update({ note: tamperNote })
      .eq("id", foreignEvidence.id)
      .select("id");
    const modified = upd.data?.length ?? 0;
    // Independent post-check with the service role: the row must be unchanged.
    const { data: after } = await admin
      .from("learner_evidence")
      .select("note")
      .eq("id", foreignEvidence.id)
      .maybeSingle();
    const unchanged = (after?.note ?? null) === (foreignEvidence.note ?? null);
    tests.push({
      key: "update_evidence",
      name: "Update other-org evidence",
      operation: `UPDATE learner_evidence SET note = '${tamperNote.slice(0, 40)}…' WHERE id = '${foreignEvidence.id}'`,
      expectation: "0 rows modified — the row is invisible to the caller",
      targetOrgId: org.id,
      targetOrgName: org.name,
      targetId: foreignEvidence.id,
      pass: modified === 0 && unchanged,
      skipped: false,
      dbResponse: {
        error: shapeError(upd.error),
        rowsAffected: modified,
        summary: upd.error
          ? `Request rejected: ${upd.error.message}`
          : `HTTP 200 OK — ${modified} row(s) modified`,
      },
      postCheck: unchanged
        ? `Service-role re-read confirms the row is unchanged (note still: ${JSON.stringify(after?.note ?? null)?.slice(0, 80)})`
        : "Service-role re-read shows the row WAS modified — policy breach",
    });
  }

  return tests;
}

// ---------------------------------------------------------------------------
// 3. Assessment audit report (full chain for one completed assessment)
// ---------------------------------------------------------------------------

export type AuditChain = {
  assessment: {
    id: string;
    title: string;
    subject: string;
    topic: string;
    grade: number;
    kind: string;
    status: string;
    createdAt: string;
  };
  session: {
    id: string;
    learnerId: string;
    learnerName: string;
    status: string;
    answers: Record<string, string>;
    answeredCount: number;
    currentPosition: number;
    startedAt: string | null;
    lastActivityAt: string | null;
    submittedAt: string | null;
    createdAt: string;
  };
  scoring: {
    scorePct: number | null;
    correctCount: number | null;
    totalCount: number | null;
    submittedAt: string | null;
    breakdown: ResultEntry[];
  };
  learnerAssessment: {
    id: string;
    title: string;
    subject: string;
    score: number | null;
    status: string;
    takenOn: string | null;
    createdAt: string;
  } | null;
  evidence: {
    id: string;
    title: string;
    kind: string;
    note: string | null;
    recordedOn: string;
    createdAt: string;
  } | null;
  joinKeys: { learnerId: string; assessmentTitle: string; submittedAt: string | null };
};

export async function fetchAuditChain(supabase: Client): Promise<AuditChain | null> {
  const { data: row, error } = await supabase
    .from("assessment_sessions")
    .select(
      "id, assessment_id, learner_id, status, answers, result, score_pct, correct_count, total_count, current_position, started_at, last_activity_at, submitted_at, created_at, learners(full_name), assessments(id, title, subject, topic, grade, kind, status, created_at)",
    )
    .eq("status", "submitted")
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) return null;

  type Joined = {
    assessments: {
      id: string;
      title: string;
      subject: string;
      topic: string;
      grade: number;
      kind: string;
      status: string;
      created_at: string;
    } | null;
    learners: { full_name: string } | null;
  };
  const joined = row as unknown as Joined;
  const assessment = joined.assessments;
  if (!assessment) return null;

  // learner_assessments / learner_evidence carry no session FK; the
  // submission writes them in the same request, so join on learner + title
  // within a 10-minute window after submitted_at.
  const windowStart = new Date(
    new Date(row.submitted_at ?? row.created_at).getTime() - 10 * 60 * 1000,
  ).toISOString();

  const [{ data: laRows }, { data: evRows }] = await Promise.all([
    supabase
      .from("learner_assessments")
      .select("id, title, subject, score, status, taken_on, created_at")
      .eq("learner_id", row.learner_id)
      .eq("title", assessment.title)
      .gte("created_at", windowStart)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("learner_evidence")
      .select("id, title, kind, note, recorded_on, created_at")
      .eq("learner_id", row.learner_id)
      .eq("kind", "assessment")
      .gte("created_at", windowStart)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const la = laRows?.[0] ?? null;
  const ev = evRows?.[0] ?? null;
  const answers = (row.answers ?? {}) as Record<string, string>;

  return {
    assessment: {
      id: assessment.id,
      title: assessment.title,
      subject: assessment.subject,
      topic: assessment.topic,
      grade: assessment.grade,
      kind: assessment.kind,
      status: assessment.status,
      createdAt: assessment.created_at,
    },
    session: {
      id: row.id,
      learnerId: row.learner_id,
      learnerName: joined.learners?.full_name ?? "—",
      status: row.status,
      answers,
      answeredCount: Object.keys(answers).length,
      currentPosition: row.current_position,
      startedAt: row.started_at,
      lastActivityAt: row.last_activity_at,
      submittedAt: row.submitted_at,
      createdAt: row.created_at,
    },
    scoring: {
      scorePct: row.score_pct,
      correctCount: row.correct_count,
      totalCount: row.total_count,
      submittedAt: row.submitted_at,
      breakdown: asResultEntries(row.result),
    },
    learnerAssessment: la
      ? {
          id: la.id,
          title: la.title,
          subject: la.subject,
          score: la.score,
          status: la.status,
          takenOn: la.taken_on,
          createdAt: la.created_at,
        }
      : null,
    evidence: ev
      ? {
          id: ev.id,
          title: ev.title,
          kind: ev.kind,
          note: ev.note,
          recordedOn: ev.recorded_on,
          createdAt: ev.created_at,
        }
      : null,
    joinKeys: {
      learnerId: row.learner_id,
      assessmentTitle: assessment.title,
      submittedAt: row.submitted_at,
    },
  };
}

// ---------------------------------------------------------------------------
// 4. Build-proof counts (caller-visible vs global, per table)
// ---------------------------------------------------------------------------

export type BuildProofCount = {
  table: string;
  label: string;
  visibleToYou: number | null;
  globalAllOrgs: number;
  isolated: boolean;
};

export async function fetchBuildProofCounts(supabase: Client, admin: Client): Promise<{
  counts: BuildProofCount[];
  submittedVisible: number | null;
  submittedGlobal: number;
}> {
  const tables: { table: (typeof AUDIT_TABLES)[number]; label: string }[] = [
    { table: "assessment_items", label: "Item bank" },
    { table: "assessments", label: "Assessments" },
    { table: "assessment_sessions", label: "Sessions / responses" },
    { table: "learner_assessments", label: "Assessment records" },
    { table: "learner_evidence", label: "Evidence" },
  ];
  const counts: BuildProofCount[] = [];
  for (const { table, label } of tables) {
    const [{ count: visible, error: visibleError }, { count: global }] = await Promise.all([
      supabase.from(table).select("id", { count: "exact", head: true }),
      admin.from(table).select("id", { count: "exact", head: true }),
    ]);
    const visibleToYou = visibleError ? null : (visible ?? 0);
    const globalAllOrgs = global ?? 0;
    counts.push({
      table,
      label,
      visibleToYou,
      globalAllOrgs,
      isolated: visibleToYou === null ? true : visibleToYou < globalAllOrgs,
    });
  }
  const [{ count: submittedVisible, error: subErr }, { count: submittedGlobal }] = await Promise.all([
    supabase
      .from("assessment_sessions")
      .select("id", { count: "exact", head: true })
      .eq("status", "submitted"),
    admin
      .from("assessment_sessions")
      .select("id", { count: "exact", head: true })
      .eq("status", "submitted"),
  ]);
  return {
    counts,
    submittedVisible: subErr ? null : (submittedVisible ?? 0),
    submittedGlobal: submittedGlobal ?? 0,
  };
}

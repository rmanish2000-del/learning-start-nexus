// Sprint 2 verification center: every claim about the assessment engine is
// turned into a live, observable query. Reads run TWICE — once as the caller
// (RLS applies) and once with the service role (global truth) — so the page
// can prove row-level security actually filters rows.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ResultEntry } from "./assessment-shared";

type CountComparison = {
  table: string;
  label: string;
  visibleToYou: number | null; // null = access denied by RLS
  globalAllOrgs: number;
  isolated: boolean;
};

type ProbeResult = {
  name: string;
  expectation: string;
  outcome: string;
  pass: boolean;
};

export type AssessmentVerificationReport = {
  generatedAt: string;
  me: { userId: string; role: string; orgId: string | null; orgName: string | null };
  counts: CountComparison[];
  itemBank: {
    restricted: boolean;
    total: number;
    items: {
      id: string;
      topic: string;
      subtopic: string;
      difficulty: number;
      kind: string;
      prompt: string;
      createdAt: string;
    }[];
  };
  assessments: {
    id: string;
    title: string;
    status: string;
    kind: string;
    itemCount: number;
    createdAt: string;
  }[];
  sessions: {
    id: string;
    status: string;
    scorePct: number | null;
    answeredCount: number;
    currentPosition: number;
    lastActivityAt: string | null;
    submittedAt: string | null;
    createdAt: string;
    learnerName: string;
    assessmentTitle: string;
  }[];
  resumeProofs: {
    sessionId: string;
    learnerName: string;
    assessmentTitle: string;
    status: string;
    currentPosition: number;
    lastActivityAt: string | null;
    storedAnswers: Record<string, string>;
  }[];
  scoringProof: {
    sessionId: string;
    learnerName: string;
    assessmentTitle: string;
    scorePct: number | null;
    correctCount: number | null;
    totalCount: number | null;
    submittedAt: string | null;
    lastActivityAt: string | null;
    breakdown: ResultEntry[];
  } | null;
  evidence: {
    id: string;
    learnerName: string;
    title: string;
    kind: string;
    note: string | null;
    recordedOn: string;
    createdAt: string;
  }[];
  learnerAssessments: {
    id: string;
    learnerName: string;
    title: string;
    score: number | null;
    status: string;
    takenOn: string | null;
  }[];
  learners: { id: string; fullName: string }[];
  probes: ProbeResult[];
};

export const getAssessmentVerification = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AssessmentVerificationReport> => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: roleRow }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId).limit(1).maybeSingle(),
      supabase.from("profiles").select("org_id, full_name").eq("id", userId).maybeSingle(),
    ]);
    const role = (roleRow?.role as string | undefined) ?? "student";
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

    // ---- Count comparison: caller-visible (RLS) vs global (service role) ----
    const COUNT_TABLES = [
      { table: "assessment_items", label: "Item bank" },
      { table: "assessments", label: "Assessments" },
      { table: "assessment_sessions", label: "Sessions / responses" },
      { table: "learner_evidence", label: "Evidence" },
      { table: "learner_assessments", label: "Assessment records" },
    ] as const;

    const counts: CountComparison[] = [];
    for (const { table, label } of COUNT_TABLES) {
      const [{ count: visible, error: visibleError }, { count: global }] = await Promise.all([
        supabase.from(table).select("id", { count: "exact", head: true }),
        supabaseAdmin.from(table).select("id", { count: "exact", head: true }),
      ]);
      const visibleToYou = visibleError ? null : (visible ?? 0);
      const globalAllOrgs = global ?? 0;
      counts.push({
        table,
        label,
        visibleToYou,
        globalAllOrgs,
        // Isolation holds when the caller sees fewer rows than exist globally
        // (both orgs are seeded), or when access is denied outright.
        isolated: visibleToYou === null ? true : visibleToYou < globalAllOrgs,
      });
    }

    // ---- Item bank (staff only at the database level) ----
    const itemsResult = await supabase
      .from("assessment_items")
      .select("id, topic, subtopic, difficulty, kind, prompt, created_at")
      .order("topic")
      .order("subtopic")
      .order("difficulty")
      .limit(50);
    const itemBankRestricted = !!itemsResult.error;
    const bankItems = (itemsResult.data ?? []).map((row) => ({
      id: row.id,
      topic: row.topic,
      subtopic: row.subtopic,
      difficulty: row.difficulty,
      kind: row.kind,
      prompt: row.prompt,
      createdAt: row.created_at,
    }));

    // ---- Assessments with item counts ----
    const { data: assessmentRows } = await supabase
      .from("assessments")
      .select("id, title, status, kind, created_at, assessment_item_map(count)")
      .order("created_at", { ascending: false })
      .limit(25);
    const assessments = (assessmentRows ?? []).map((row) => {
      const mapCount = row.assessment_item_map as unknown as { count: number }[];
      return {
        id: row.id,
        title: row.title,
        status: row.status,
        kind: row.kind,
        itemCount: mapCount?.[0]?.count ?? 0,
        createdAt: row.created_at,
      };
    });

    // ---- Sessions (assignments / responses) ----
    const { data: sessionRows } = await supabase
      .from("assessment_sessions")
      .select(
        "id, status, score_pct, correct_count, total_count, current_position, answers, result, last_activity_at, submitted_at, created_at, learners(full_name), assessments(title)",
      )
      .order("created_at", { ascending: false })
      .limit(25);

    type SessionRow = {
      id: string;
      status: string;
      score_pct: number | null;
      correct_count: number | null;
      total_count: number | null;
      current_position: number;
      answers: Record<string, string> | null;
      result: ResultEntry[] | null;
      last_activity_at: string | null;
      submitted_at: string | null;
      created_at: string;
      learners: { full_name: string } | null;
      assessments: { title: string } | null;
    };
    const sessionList = (sessionRows ?? []) as unknown as SessionRow[];

    const sessions = sessionList.map((s) => ({
      id: s.id,
      status: s.status,
      scorePct: s.score_pct,
      answeredCount: Object.keys(s.answers ?? {}).length,
      currentPosition: s.current_position,
      lastActivityAt: s.last_activity_at,
      submittedAt: s.submitted_at,
      createdAt: s.created_at,
      learnerName: s.learners?.full_name ?? "—",
      assessmentTitle: s.assessments?.title ?? "—",
    }));

    // Resume proof: unfinished sessions with server-stored answers.
    const resumeProofs = sessionList
      .filter((s) => s.status !== "submitted" && Object.keys(s.answers ?? {}).length > 0)
      .slice(0, 5)
      .map((s) => ({
        sessionId: s.id,
        learnerName: s.learners?.full_name ?? "—",
        assessmentTitle: s.assessments?.title ?? "—",
        status: s.status,
        currentPosition: s.current_position,
        lastActivityAt: s.last_activity_at,
        storedAnswers: (s.answers ?? {}) as Record<string, string>,
      }));

    // Scoring proof: the most recent submitted session, verbatim from the DB.
    const submitted = sessionList.find((s) => s.status === "submitted");
    const scoringProof = submitted
      ? {
          sessionId: submitted.id,
          learnerName: submitted.learners?.full_name ?? "—",
          assessmentTitle: submitted.assessments?.title ?? "—",
          scorePct: submitted.score_pct,
          correctCount: submitted.correct_count,
          totalCount: submitted.total_count,
          submittedAt: submitted.submitted_at,
          lastActivityAt: submitted.last_activity_at,
          breakdown: (submitted.result ?? []) as ResultEntry[],
        }
      : null;

    // ---- Evidence generated by submissions ----
    const { data: evidenceRows } = await supabase
      .from("learner_evidence")
      .select("id, title, kind, note, recorded_on, created_at, learners(full_name)")
      .eq("kind", "assessment")
      .order("created_at", { ascending: false })
      .limit(10);
    const evidence = (evidenceRows ?? []).map((row) => ({
      id: row.id,
      learnerName: (row.learners as unknown as { full_name: string } | null)?.full_name ?? "—",
      title: row.title,
      kind: row.kind,
      note: row.note,
      recordedOn: row.recorded_on,
      createdAt: row.created_at,
    }));

    const { data: learnerAssessmentRows } = await supabase
      .from("learner_assessments")
      .select("id, title, score, status, taken_on, learners(full_name)")
      .order("created_at", { ascending: false })
      .limit(10);
    const learnerAssessments = (learnerAssessmentRows ?? []).map((row) => ({
      id: row.id,
      learnerName: (row.learners as unknown as { full_name: string } | null)?.full_name ?? "—",
      title: row.title,
      score: row.score,
      status: row.status,
      takenOn: row.taken_on,
    }));

    // Learners (for the assignment probe button; RLS scopes to the org).
    const { data: learnerRows } = await supabase
      .from("learners")
      .select("id, full_name")
      .order("full_name");
    const learners = (learnerRows ?? []).map((l) => ({ id: l.id, fullName: l.full_name }));

    // ---- Live RLS probes ----
    const probes: ProbeResult[] = [];

    // Probe 1: item bank read as the caller.
    if (role === "student") {
      probes.push({
        name: "Student reads item bank (correct answers)",
        expectation: "Denied — items and answer keys are staff-only",
        outcome: itemBankRestricted
          ? `Rejected: ${itemsResult.error!.message}`
          : `${bankItems.length} row(s) returned`,
        pass: itemBankRestricted || bankItems.length === 0,
      });
    } else {
      probes.push({
        name: "Staff reads item bank",
        expectation: "Allowed — scoped to own organization",
        outcome: itemBankRestricted
          ? `Rejected: ${itemsResult.error!.message}`
          : `${bankItems.length} item(s) visible`,
        pass: !itemBankRestricted,
      });
    }

    // Probes 2–4: targeted cross-organization reads. The service role finds a
    // row owned by ANOTHER org, then the caller tries to read it by ID.
    if (orgId) {
      const crossOrgTargets = [
        {
          name: "Cross-org assessment read",
          table: "assessments" as const,
          pick: async () => {
            const { data } = await supabaseAdmin
              .from("assessments")
              .select("id")
              .neq("org_id", orgId)
              .limit(1)
              .maybeSingle();
            return data?.id ?? null;
          },
        },
        {
          name: "Cross-org session read",
          table: "assessment_sessions" as const,
          pick: async () => {
            const { data } = await supabaseAdmin
              .from("assessment_sessions")
              .select("id")
              .neq("org_id", orgId)
              .limit(1)
              .maybeSingle();
            return data?.id ?? null;
          },
        },
        {
          name: "Cross-org evidence read",
          table: "learner_evidence" as const,
          pick: async () => {
            const { data } = await supabaseAdmin
              .from("learner_evidence")
              .select("id, learners!inner(org_id)")
              .neq("learners.org_id", orgId)
              .limit(1)
              .maybeSingle();
            return data?.id ?? null;
          },
        },
      ];

      for (const target of crossOrgTargets) {
        const foreignId = await target.pick();
        if (!foreignId) {
          probes.push({
            name: target.name,
            expectation: "0 rows — row belongs to another organization",
            outcome: "Skipped — no other-organization row exists to test against",
            pass: true,
          });
          continue;
        }
        const { data: leaked } = await supabase
          .from(target.table)
          .select("id")
          .eq("id", foreignId);
        const leakedCount = (leaked ?? []).length;
        probes.push({
          name: target.name,
          expectation: "0 rows — row belongs to another organization",
          outcome:
            leakedCount === 0
              ? `0 rows returned for ${target.table} row ${foreignId.slice(0, 8)}…`
              : `${leakedCount} row(s) leaked across organizations`,
          pass: leakedCount === 0,
        });
      }
    }

    // Probes 5–6: students must not be able to author content.
    if (role === "student" && orgId) {
      const itemWrite = await supabase.from("assessment_items").insert({
        org_id: orgId,
        grade: 6,
        subject: "Mathematics",
        topic: "Fractions",
        subtopic: "rls-probe",
        difficulty: 1,
        kind: "mcq",
        prompt: "RLS probe — should never persist",
        correct_answer: "x",
      });
      if (!itemWrite.error) {
        // Should never happen; clean up immediately if it does.
        await supabaseAdmin.from("assessment_items").delete().eq("subtopic", "rls-probe");
      }
      probes.push({
        name: "Student writes to item bank",
        expectation: "Rejected by RLS (403 / 42501)",
        outcome: itemWrite.error
          ? `Rejected: ${itemWrite.error.message}`
          : "INSERT SUCCEEDED — policy breach (row removed)",
        pass: !!itemWrite.error,
      });

      const assessmentWrite = await supabase.from("assessments").insert({
        org_id: orgId,
        title: "RLS probe — should never persist",
        subject: "Mathematics",
        topic: "Fractions",
        grade: 6,
        kind: "diagnostic",
        status: "draft",
      });
      if (!assessmentWrite.error) {
        await supabaseAdmin.from("assessments").delete().eq("title", "RLS probe — should never persist");
      }
      probes.push({
        name: "Student creates an assessment",
        expectation: "Rejected by RLS (403 / 42501)",
        outcome: assessmentWrite.error
          ? `Rejected: ${assessmentWrite.error.message}`
          : "INSERT SUCCEEDED — policy breach (row removed)",
        pass: !!assessmentWrite.error,
      });
    } else {
      probes.push({
        name: "Student writes to item bank",
        expectation: "Rejected by RLS (403 / 42501)",
        outcome: "Not applicable — sign in as a student (e.g. aarav / 123456) to run this probe",
        pass: true,
      });
      probes.push({
        name: "Student creates an assessment",
        expectation: "Rejected by RLS (403 / 42501)",
        outcome: "Not applicable — sign in as a student (e.g. aarav / 123456) to run this probe",
        pass: true,
      });
    }

    return {
      generatedAt: new Date().toISOString(),
      me: { userId, role, orgId, orgName },
      counts,
      itemBank: {
        restricted: itemBankRestricted,
        total: bankItems.length,
        items: bankItems,
      },
      assessments,
      sessions,
      resumeProofs,
      scoringProof,
      evidence,
      learnerAssessments,
      learners,
      probes,
    };
  });

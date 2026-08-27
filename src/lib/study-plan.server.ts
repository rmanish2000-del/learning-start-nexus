// Class 10 Diagnostic-to-Conversion — server assembly for the self-serve
// study plan. Identity is resolved through the caller's own RLS-scoped client
// first; only then do we read the staff-scoped loop tables (learning_gaps,
// recommendations, assessment_outcomes) with the privileged client, always
// filtered to that single learner id.

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import {
  aggregateBreakdown,
  labelFor,
  sortFocusAreas,
  MASTERY_THRESHOLD,
  type BreakdownEntry,
  type FocusArea,
  type NextTopic,
  type StrengthArea,
  type StudyPlanView,
} from "./study-plan-shared";

type Client = SupabaseClient<Database>;

const EMPTY: StudyPlanView = {
  learnerId: null,
  learnerName: null,
  grade: null,
  subject: null,
  educatorAssigned: false,
  state: "no-learner",
  activeSessionId: null,
  lastSubmittedSessionId: null,
  assessmentTitle: null,
  scorePct: null,
  strengths: [],
  focusAreas: [],
  nextTopics: [],
  canStartDiagnostic: false,
  generatedAt: new Date().toISOString(),
};

async function resolveLearner(supabase: Client, userId: string) {
  const { data, error } = await supabase
    .from("learners")
    .select("id, full_name, grade, subject, educator_id, org_id")
    .eq("student_user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

// Without an educator nobody accepts the suggested recommendations, so the
// AI-generated plan materialises them itself. Idempotent: one intervention per
// recommendation, and existing staff-owned interventions are never touched.
async function materialisePlan(
  admin: Client,
  input: { orgId: string; learnerId: string },
): Promise<void> {
  const [{ data: recs }, { data: existing }] = await Promise.all([
    admin
      .from("recommendations")
      .select("id, gap_id, title, activity, status")
      .eq("learner_id", input.learnerId)
      .eq("status", "suggested"),
    admin.from("interventions").select("id, recommendation_id, gap_id").eq("learner_id", input.learnerId),
  ]);
  const seenRec = new Set((existing ?? []).map((i) => i.recommendation_id).filter(Boolean));
  const seenGap = new Set((existing ?? []).map((i) => i.gap_id).filter(Boolean));
  const rows = (recs ?? [])
    .filter((r) => !seenRec.has(r.id) && !(r.gap_id && seenGap.has(r.gap_id)))
    .map((r) => ({
      org_id: input.orgId,
      learner_id: input.learnerId,
      recommendation_id: r.id,
      gap_id: r.gap_id,
      educator_id: null,
      title: r.title,
      activity: r.activity,
      status: "planned",
    }));
  if (rows.length === 0) return;
  const { error } = await admin.from("interventions").insert(rows);
  if (error) throw new Error(error.message);
}

export async function fetchStudyPlan(supabase: Client, userId: string): Promise<StudyPlanView> {
  const learner = await resolveLearner(supabase, userId);
  if (!learner) return { ...EMPTY, generatedAt: new Date().toISOString() };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as unknown as Client;
  const learnerId = learner.id;
  const orgId = learner.org_id as string;

  const { data: sessions, error: sessionsError } = await admin
    .from("assessment_sessions")
    .select(
      "id, status, score_pct, result, submitted_at, created_at, assessments(title, subject, topic, book_id, unit_id)",
    )
    .eq("learner_id", learnerId)
    .order("created_at", { ascending: false });
  if (sessionsError) throw new Error(sessionsError.message);

  const rows = sessions ?? [];
  const submitted = rows.filter((s) => s.status === "submitted");
  const active = rows.find((s) => s.status !== "submitted") ?? null;
  const latest = submitted[0] ?? null;

  const base = {
    ...EMPTY,
    learnerId,
    learnerName: learner.full_name,
    grade: learner.grade,
    subject: learner.subject,
    educatorAssigned: !!learner.educator_id,
    activeSessionId: active?.id ?? null,
    generatedAt: new Date().toISOString(),
  };

  if (!latest) {
    return {
      ...base,
      state: active ? "in-progress" : "not-started",
      canStartDiagnostic: true,
    };
  }

  await materialisePlan(admin, { orgId, learnerId });

  // Diagnostic sessions store an outcome-level result object; older manual
  // sessions store a flat per-item breakdown array. Support both.
  const result = latest.result as unknown;
  const outcomeResults = Array.isArray((result as { outcomes?: unknown } | null)?.outcomes)
    ? ((result as { outcomes: { code: string; correct: number; total: number; pct: number }[] }).outcomes)
    : null;
  const breakdown = (Array.isArray(result) ? result : []) as unknown as BreakdownEntry[];
  const buckets = outcomeResults
    ? outcomeResults
        .filter((o) => o && typeof o.code === "string")
        .map((o) => ({
          code: o.code,
          correct: Number(o.correct ?? 0),
          total: Number(o.total ?? 0),
          pct: Number(o.pct ?? 0),
        }))
        .sort((a, b) => b.pct - a.pct || a.code.localeCompare(b.code))
    : aggregateBreakdown(breakdown.filter((b) => b && typeof b.subtopic === "string"));

  const codes = buckets.map((b) => b.code);

  const assessment = latest.assessments as unknown as {
    title: string;
    subject: string;
    topic: string;
    book_id: string | null;
    unit_id: string | null;
  } | null;

  const [{ data: gaps }, { data: recs }, { data: interventions }, { data: outcomeRows }] =
    await Promise.all([
      admin
        .from("learning_gaps")
        .select("id, subtopic, severity, status, gap_score_pct")
        .eq("learner_id", learnerId)
        .in("status", ["open", "in_progress"]),
      admin
        .from("recommendations")
        .select("id, gap_id, title, activity, rationale")
        .eq("learner_id", learnerId),
      admin.from("interventions").select("id, gap_id, status").eq("learner_id", learnerId),
      admin
        .from("assessment_outcomes")
        .select("code, title, intervention_strategy, diagnostic_weight, unit_id")
        .eq("org_id", orgId)
        .eq("unit_id", assessment?.unit_id ?? "00000000-0000-0000-0000-000000000000"),
    ]);

  const titles = new Map((outcomeRows ?? []).map((o) => [o.code, o.title]));
  const recByGap = new Map((recs ?? []).map((r) => [r.gap_id, r]));
  const intByGap = new Map((interventions ?? []).map((i) => [i.gap_id, i]));
  const strategyByCode = new Map((outcomeRows ?? []).map((o) => [o.code, o.intervention_strategy]));

  const strengths: StrengthArea[] = buckets
    .filter((b) => b.pct >= MASTERY_THRESHOLD)
    .map((b) => ({
      code: b.code,
      label: labelFor(b.code, titles),
      pct: b.pct,
      correct: b.correct,
      total: b.total,
    }));

  const gapByCode = new Map((gaps ?? []).map((g) => [g.subtopic, g]));
  const focusAreas: FocusArea[] = sortFocusAreas(
    buckets
      .filter((b) => b.pct < MASTERY_THRESHOLD)
      .map((b) => {
        const gap = gapByCode.get(b.code) ?? null;
        const rec = gap ? recByGap.get(gap.id) ?? null : null;
        const intervention = gap ? intByGap.get(gap.id) ?? null : null;
        return {
          gapId: gap?.id ?? null,
          code: b.code,
          label: labelFor(b.code, titles),
          pct: b.pct,
          severity: gap?.severity ?? (b.pct < 40 ? "high" : "medium"),
          activity:
            rec?.activity ??
            strategyByCode.get(b.code) ??
            "Re-teach the concept with worked examples, then practise fresh questions on this outcome.",
          rationale: rec?.rationale ?? null,
          interventionId: intervention?.id ?? null,
        } satisfies FocusArea;
      }),
  );

  const assessed = new Set(codes);
  const nextTopics: NextTopic[] = (outcomeRows ?? [])
    .filter((o) => !assessed.has(o.code))
    .sort((a, b) => (b.diagnostic_weight ?? 0) - (a.diagnostic_weight ?? 0))
    .slice(0, 4)
    .map((o) => ({
      code: o.code,
      title: o.title,
      reason: "Next outcome in this chapter group, ranked by board weight.",
    }));

  return {
    ...base,
    state: "submitted",
    lastSubmittedSessionId: latest.id,
    assessmentTitle: assessment?.title ?? null,
    scorePct: latest.score_pct ?? null,
    strengths,
    focusAreas,
    nextTopics,
    canStartDiagnostic: !active,
  };
}

// Self-serve diagnostic start: no educator, no assignment step. Picks the
// published diagnostic that matches the learner's grade and subject in their
// own organisation and opens a session for them.
export async function startSelfServeDiagnostic(
  supabase: Client,
  userId: string,
): Promise<{ sessionId: string }> {
  const learner = await resolveLearner(supabase, userId);
  if (!learner) throw new Error("No learner profile is linked to this account yet.");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as unknown as Client;

  const { data: open } = await admin
    .from("assessment_sessions")
    .select("id, status")
    .eq("learner_id", learner.id)
    .neq("status", "submitted")
    .order("created_at", { ascending: false })
    .limit(1);
  const openSession = (open ?? [])[0];
  if (openSession) return { sessionId: openSession.id };

  const { data: assessments, error } = await admin
    .from("assessments")
    .select("id, created_at")
    .eq("org_id", learner.org_id as string)
    .eq("status", "published")
    .eq("kind", "diagnostic")
    .eq("grade", learner.grade)
    .eq("subject", learner.subject)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  const assessment = (assessments ?? [])[0];
  if (!assessment) {
    throw new Error("No diagnostic is available for this grade and subject yet.");
  }

  const { data: created, error: insertError } = await admin
    .from("assessment_sessions")
    .insert({
      org_id: learner.org_id as string,
      assessment_id: assessment.id,
      learner_id: learner.id,
      assigned_by: null,
      status: "assigned",
    })
    .select("id")
    .single();
  if (insertError) throw new Error(insertError.message);
  return { sessionId: created.id };
}

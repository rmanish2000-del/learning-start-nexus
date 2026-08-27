// Gap-Closure Loop — server assembly for the gap detail view.
// Authorisation is decided from the caller's own identity first (roles, org,
// parent links, learner link); only then do we read loop tables with the
// privileged client, always filtered to that single gap / learner.

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { stageFor, type LearnerMode } from "./learner-mode";
import {
  nextActionFor,
  resolveGapAccess,
  type GapDetailView,
  type GapEvidenceItem,
} from "./gap-detail-shared";

type Client = SupabaseClient<Database>;

type ResultRow = {
  item_id?: string;
  subtopic?: string;
  given?: string;
  correct?: boolean;
  correct_answer?: string;
};

export async function fetchGapDetail(
  supabase: Client,
  userId: string,
  gapId: string,
): Promise<GapDetailView> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as unknown as Client;

  const [{ data: roles }, { data: profile }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase.from("profiles").select("org_id").eq("id", userId).maybeSingle(),
  ]);
  const roleSet = new Set((roles ?? []).map((r) => r.role as string));

  const { data: gap, error: gapError } = await admin
    .from("learning_gaps")
    .select(
      "id, org_id, learner_id, session_id, subject, topic, subtopic, items_total, items_correct, gap_score_pct, severity, status, detected_at",
    )
    .eq("id", gapId)
    .maybeSingle();
  if (gapError) throw new Error(gapError.message);
  if (!gap) throw new Error("That gap no longer exists.");

  const { data: learner } = await admin
    .from("learners")
    .select("id, full_name, org_id, educator_id, student_user_id, learner_mode")
    .eq("id", gap.learner_id)
    .maybeSingle();
  if (!learner) throw new Error("That learner no longer exists.");
  const learnerMode = ((learner as { learner_mode?: string }).learner_mode ??
    "centre_managed") as LearnerMode;

  const { data: parentLink } = await admin
    .from("parent_learner_links")
    .select("id")
    .eq("learner_id", gap.learner_id)
    .eq("parent_user_id", userId)
    .maybeSingle();

  const access = resolveGapAccess({
    isPlatformAdmin: roleSet.has("admin"),
    isCentreStaff: roleSet.has("educator") || roleSet.has("reviewer"),
    sameOrg: !!profile?.org_id && profile.org_id === learner.org_id,
    isParentOfLearner: !!parentLink,
    isTheLearner: learner.student_user_id === userId,
    learnerMode,
  });
  if (!access.allowed) throw new Error(access.reason);

  if (access.role === "platform_admin") {
    // Support access is audited.
    console.info("[gap-detail] platform admin support access", {
      userId,
      gapId,
      learnerId: gap.learner_id,
      learnerMode,
      at: new Date().toISOString(),
    });
  }

  const [{ data: session }, { data: rec }, { data: intervention }, { data: plan }, { data: outcome }] =
    await Promise.all([
      gap.session_id
        ? admin
            .from("assessment_sessions")
            .select("id, result, assessments(title)")
            .eq("id", gap.session_id)
            .maybeSingle()
        : Promise.resolve({ data: null } as { data: null }),
      admin
        .from("recommendations")
        .select("id, title, activity, rationale")
        .eq("gap_id", gapId)
        .maybeSingle(),
      admin
        .from("interventions")
        .select("id, title, activity, status")
        .eq("gap_id", gapId)
        .maybeSingle(),
      admin
        .from("learner_study_plans")
        .select("id, status")
        .eq("learner_id", gap.learner_id)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from("assessment_outcomes")
        .select("code, title")
        .eq("org_id", gap.org_id as string)
        .eq("code", gap.subtopic)
        .maybeSingle(),
    ]);

  const resultRows = Array.isArray((session as { result?: unknown } | null)?.result)
    ? (((session as { result: unknown }).result as ResultRow[]) ?? [])
    : [];
  const mine = resultRows.filter((r) => r?.subtopic === gap.subtopic);
  const itemIds = mine.map((r) => r.item_id).filter((v): v is string => !!v);

  const prompts = new Map<string, { prompt: string; explanation: string | null }>();
  if (itemIds.length > 0) {
    const [{ data: bankRows }, { data: itemRows }] = await Promise.all([
      admin.from("question_bank").select("id, prompt, explanation").in("id", itemIds),
      admin.from("assessment_items").select("id, prompt, explanation").in("id", itemIds),
    ]);
    for (const r of [...(bankRows ?? []), ...(itemRows ?? [])]) {
      prompts.set(r.id, { prompt: r.prompt, explanation: r.explanation });
    }
  }

  const evidence: GapEvidenceItem[] = mine.map((r) => ({
    itemId: r.item_id ?? "",
    prompt: prompts.get(r.item_id ?? "")?.prompt ?? null,
    learnerAnswer: r.given && r.given.length > 0 ? r.given : "(left blank)",
    expectedAnswer: r.correct_answer ?? "—",
    explanation: prompts.get(r.item_id ?? "")?.explanation ?? null,
    correct: !!r.correct,
  }));

  const planStatus: GapDetailView["planStatus"] =
    plan
      ? "ready"
      : learnerMode === "centre_managed" && !learner.educator_id
        ? "awaiting_educator"
        : intervention
          ? "ready"
          : "preparing";

  const stage = stageFor({
    interventionStatus: intervention?.status ?? null,
    gapStatus: gap.status,
    planExists: planStatus === "ready",
  });

  return {
    gapId: gap.id,
    learnerId: gap.learner_id,
    learnerName: learner.full_name,
    learnerMode,
    viewerRole: access.role,
    concept: outcome?.title ?? gap.topic ?? gap.subtopic,
    outcomeCode: gap.subtopic,
    subject: gap.subject,
    topic: gap.topic,
    severity: gap.severity,
    masteryPct: gap.gap_score_pct,
    itemsCorrect: gap.items_correct,
    itemsTotal: gap.items_total,
    status: gap.status,
    stage,
    detectedAt: gap.detected_at,
    sourceSessionId: gap.session_id,
    sourceAssessmentTitle:
      ((session as { assessments?: { title?: string } | null } | null)?.assessments?.title) ?? null,
    evidence,
    recommendation: rec
      ? { id: rec.id, title: rec.title, activity: rec.activity, rationale: rec.rationale }
      : null,
    intervention: intervention
      ? {
          id: intervention.id,
          title: intervention.title,
          activity: intervention.activity,
          status: intervention.status,
        }
      : null,
    nextAction: nextActionFor({ stage, planStatus, role: access.role }),
    planStatus,
    generatedAt: new Date().toISOString(),
  };
}

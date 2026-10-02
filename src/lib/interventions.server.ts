// Sprint 3 server-only engine helpers. Never imported by client code.
// All functions take an explicit Supabase client so the caller decides
// whether RLS applies (caller client) or not (service role).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { ResultEntry } from "./assessment-shared";
import {
  computeSubtopicStats,
  rationaleFor,
  ruleFor,
  severityFor,
  type GapSeverity,
} from "./intervention-shared";

type Client = SupabaseClient<Database>;
type GapRow = Database["public"]["Tables"]["learning_gaps"]["Row"];

export type GapDetectionSummary = {
  detected: number;
  refreshed: number;
  reopened: number;
  addressed: number;
  dismissedKept: number;
  recommendationsCreated: number;
  recommendationsUpdated: number;
  outcomes: { subtopic: string; pct: number; severity: GapSeverity | null; outcome: string }[];
};

// Deterministic gap detection for one submitted session. Idempotent: the
// (learner_id, subtopic) uniqueness means re-running refreshes in place.
//   subtopic < 70%  -> open/refresh/reopen gap (dismissed gaps stay dismissed)
//   subtopic >= 70% -> an open gap on that subtopic is marked addressed
export async function applyGapDetection(
  admin: Client,
  params: {
    orgId: string;
    learnerId: string;
    sessionId: string;
    subject: string;
    topic: string;
    breakdown: ResultEntry[];
  },
): Promise<GapDetectionSummary> {
  const stats = computeSubtopicStats(params.breakdown);
  const { data: existingRows, error } = await admin
    .from("learning_gaps")
    .select("*")
    .eq("learner_id", params.learnerId);
  if (error) throw new Error(error.message);
  const bySubtopic = new Map((existingRows ?? []).map((g) => [g.subtopic, g]));

  const summary: GapDetectionSummary = {
    detected: 0,
    refreshed: 0,
    reopened: 0,
    addressed: 0,
    dismissedKept: 0,
    recommendationsCreated: 0,
    recommendationsUpdated: 0,
    outcomes: [],
  };

  const now = new Date().toISOString();

  for (const stat of stats) {
    const severity = severityFor(stat.pct);
    const existing = bySubtopic.get(stat.subtopic);

    if (severity) {
      if (!existing) {
        const { error: insError } = await admin.from("learning_gaps").insert({
          org_id: params.orgId,
          learner_id: params.learnerId,
          session_id: params.sessionId,
          subject: params.subject,
          topic: params.topic,
          subtopic: stat.subtopic,
          items_total: stat.total,
          items_correct: stat.correct,
          gap_score_pct: stat.pct,
          severity,
          status: "open",
          first_detected_at: now,
          detected_at: now,
        });
        if (insError) throw new Error(insError.message);
        summary.detected += 1;
        summary.outcomes.push({ subtopic: stat.subtopic, pct: stat.pct, severity, outcome: "detected" });
      } else if (existing.status === "dismissed") {
        summary.dismissedKept += 1;
        summary.outcomes.push({
          subtopic: stat.subtopic,
          pct: stat.pct,
          severity,
          outcome: "kept-dismissed",
        });
      } else {
        const { error: updError } = await admin
          .from("learning_gaps")
          .update({
            session_id: params.sessionId,
            items_total: stat.total,
            items_correct: stat.correct,
            gap_score_pct: stat.pct,
            severity,
            status: "open",
            resolved_session_id: null,
            detected_at: now,
          })
          .eq("id", existing.id);
        if (updError) throw new Error(updError.message);
        if (existing.status === "addressed") {
          summary.reopened += 1;
          summary.outcomes.push({ subtopic: stat.subtopic, pct: stat.pct, severity, outcome: "reopened" });
        } else {
          summary.refreshed += 1;
          summary.outcomes.push({ subtopic: stat.subtopic, pct: stat.pct, severity, outcome: "refreshed" });
        }
      }
    } else if (existing && existing.status === "open") {
      const { error: resError } = await admin
        .from("learning_gaps")
        .update({ status: "addressed", resolved_session_id: params.sessionId })
        .eq("id", existing.id);
      if (resError) throw new Error(resError.message);
      summary.addressed += 1;
      summary.outcomes.push({ subtopic: stat.subtopic, pct: stat.pct, severity, outcome: "addressed" });
    } else {
      summary.outcomes.push({ subtopic: stat.subtopic, pct: stat.pct, severity, outcome: "no-gap" });
    }
  }

  const recs = await regenerateRecommendations(admin, params.learnerId);
  summary.recommendationsCreated = recs.created;
  summary.recommendationsUpdated = recs.updated;
  return summary;
}

// Deterministic recommendation generation for every open gap of a learner.
// Idempotent: one recommendation per gap (gap_id is unique); content is only
// overwritten while the recommendation is still "suggested" — staff decisions
// (accepted/dismissed) are never clobbered.
export async function regenerateRecommendations(
  admin: Client,
  learnerId: string,
): Promise<{ created: number; updated: number }> {
  const [{ data: gaps, error: gapsError }, { data: recs, error: recsError }] = await Promise.all([
    admin.from("learning_gaps").select("*").eq("learner_id", learnerId).eq("status", "open"),
    admin.from("recommendations").select("*").eq("learner_id", learnerId),
  ]);
  if (gapsError) throw new Error(gapsError.message);
  if (recsError) throw new Error(recsError.message);

  const byGap = new Map((recs ?? []).map((r) => [r.gap_id, r]));
  let created = 0;
  let updated = 0;

  // Sprint 6R: gaps whose subtopic is an outcome code (curriculum pipeline)
  // resolve their recommendation content from the Sprint 6C intervention map
  // instead of the generic rule table. Legacy subtopic gaps keep ruleFor.
  const openGaps = (gaps ?? []) as GapRow[];
  const orgId = openGaps[0]?.org_id;
  const mapBySubtopic = new Map<
    string,
    { outcomeTitle: string; failurePattern: string; intervention: string; priority: number; outcomeId: string }
  >();
  if (orgId && openGaps.length > 0) {
    const { data: outcomeRows } = await admin
      .from("assessment_outcomes")
      .select("id, code, title")
      .eq("org_id", orgId)
      .in("code", openGaps.map((g) => g.subtopic));
    const outcomeIds = (outcomeRows ?? []).map((o) => o.id);
    if (outcomeIds.length > 0) {
      const { data: mapRows } = await admin
        .from("intervention_map")
        .select("assessment_outcome_id, failure_pattern, recommended_intervention, priority")
        .in("assessment_outcome_id", outcomeIds)
        .order("priority");
      const outcomeById = new Map((outcomeRows ?? []).map((o) => [o.id, o]));
      for (const m of mapRows ?? []) {
        const outcome = outcomeById.get(m.assessment_outcome_id);
        if (!outcome || mapBySubtopic.has(outcome.code)) continue; // lowest priority number wins
        mapBySubtopic.set(outcome.code, {
          outcomeTitle: outcome.title,
          failurePattern: m.failure_pattern,
          intervention: m.recommended_intervention,
          priority: m.priority,
          outcomeId: outcome.id,
        });
      }
    }
  }

  for (const gap of openGaps) {
    const mapped = mapBySubtopic.get(gap.subtopic);
    const rule = ruleFor(gap.subtopic, gap.severity as GapSeverity);
    const content = mapped
      ? {
          rule_id: `imap:${mapped.outcomeId}`,
          // recommendations.priority is constrained to 1|2; the intervention
          // map uses a wider 1..n ordering, so clamp instead of failing.
          priority: mapped.priority <= 1 ? 1 : 2,
          title: `Intervention: ${mapped.outcomeTitle}`,
          activity: mapped.intervention,
          rationale: `${mapped.failurePattern} — ${rationaleFor(gap)}`,
        }
      : {
          rule_id: rule.ruleId,
          priority: rule.priority,
          title: rule.title,
          activity: rule.activity,
          rationale: rationaleFor(gap),
        };
    const existing = byGap.get(gap.id);
    if (!existing) {
      const { error: insError } = await admin.from("recommendations").insert({
        org_id: gap.org_id,
        learner_id: learnerId,
        gap_id: gap.id,
        status: "suggested",
        ...content,
      });
      if (insError) throw new Error(insError.message);
      created += 1;
    } else if (existing.status === "suggested") {
      const { error: updError } = await admin
        .from("recommendations")
        .update(content)
        .eq("id", existing.id);
      if (updError) throw new Error(updError.message);
      updated += 1;
    }
  }
  return { created, updated };
}

// Valid intervention lifecycle transitions.
export const INTERVENTION_TRANSITIONS: Record<string, string[]> = {
  planned: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

// Outcome Proof Dashboard — server-only data assembly for the School, Centre
// and Parent executive views. All reads go through the caller's RLS-scoped
// client; all arithmetic lives in ./outcome-dashboard-shared.ts.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  computeOutcomeMetrics,
  type GapRow,
  type OutcomeMetricRow,
  type OutcomeMetrics,
  type SegmentMetrics,
} from "./outcome-dashboard-shared";

type Client = SupabaseClient<Database>;

type LearnerRow = {
  id: string;
  full_name: string;
  educator_id: string | null;
  grade: number;
  subject: string;
  mastery_score: number;
};

async function loadScope(supabase: Client): Promise<{
  learners: LearnerRow[];
  gaps: GapRow[];
  outcomes: OutcomeMetricRow[];
  educatorNames: Map<string, string>;
}> {
  const [learnersRes, gapsRes, outcomesRes] = await Promise.all([
    // Centre/school outcome metrics are centre-managed learners only.
    supabase
      .from("learners")
      .select("id, full_name, educator_id, grade, subject, mastery_score")
      .eq("learner_mode", "centre_managed"),
    supabase.from("learning_gaps").select("id, learner_id, status, first_detected_at, updated_at"),
    (supabase as SupabaseClient)
      .from("learner_outcomes")
      .select("learner_id, status, mastery_lift, post_score, baseline_score, created_at, completed_at"),
  ]);
  if (learnersRes.error) throw new Error(learnersRes.error.message);
  if (gapsRes.error) throw new Error(gapsRes.error.message);
  if (outcomesRes.error) throw new Error(outcomesRes.error.message);

  const learners = (learnersRes.data ?? []) as unknown as LearnerRow[];
  const centreIds = new Set(learners.map((l) => l.id));
  const educatorIds = [...new Set(learners.map((l) => l.educator_id).filter((v): v is string => !!v))];
  const educatorNames = new Map<string, string>();
  if (educatorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", educatorIds);
    for (const p of profiles ?? []) educatorNames.set(p.id, p.full_name);
  }

  return {
    learners,
    gaps: ((gapsRes.data ?? []) as unknown as GapRow[]).filter((g) => centreIds.has(g.learner_id)),
    outcomes: ((outcomesRes.data ?? []) as unknown as OutcomeMetricRow[]).filter((o) =>
      centreIds.has(o.learner_id),
    ),
    educatorNames,
  };
}

export type SchoolView = {
  scope: "school";
  orgName: string;
  generatedAt: string;
  totals: OutcomeMetrics;
  centres: SegmentMetrics[];
};

export async function fetchSchoolView(supabase: Client): Promise<SchoolView> {
  const { learners, gaps, outcomes, educatorNames } = await loadScope(supabase);
  const { data: org } = await supabase.from("organizations").select("name").limit(1).maybeSingle();

  const byEducator = new Map<string, LearnerRow[]>();
  for (const l of learners) {
    const key = l.educator_id ?? "unassigned";
    byEducator.set(key, [...(byEducator.get(key) ?? []), l]);
  }

  const centres: SegmentMetrics[] = [...byEducator.entries()]
    .map(([key, group]) => ({
      id: key,
      name: key === "unassigned" ? "Unassigned learners" : (educatorNames.get(key) ?? "Educator"),
      subtitle: `${group.length} learner${group.length === 1 ? "" : "s"}`,
      metrics: computeOutcomeMetrics({ learnerIds: group.map((l) => l.id), gaps, outcomes }),
    }))
    .sort((a, b) => b.metrics.learners - a.metrics.learners || a.name.localeCompare(b.name));

  return {
    scope: "school",
    orgName: org?.name ?? "Your organization",
    generatedAt: new Date().toISOString(),
    totals: computeOutcomeMetrics({ learnerIds: learners.map((l) => l.id), gaps, outcomes }),
    centres,
  };
}

export type CentreView = {
  scope: "centre";
  centres: { id: string; name: string; learnerCount: number }[];
  selectedCentreId: string | null;
  centreName: string;
  generatedAt: string;
  totals: OutcomeMetrics;
  learners: SegmentMetrics[];
};

export async function fetchCentreView(
  supabase: Client,
  requestedCentreId: string | null,
  fallbackCentreId: string | null,
): Promise<CentreView> {
  const { learners, gaps, outcomes, educatorNames } = await loadScope(supabase);

  const centreKeys = [...new Set(learners.map((l) => l.educator_id ?? "unassigned"))];
  const centres = centreKeys
    .map((key) => ({
      id: key,
      name: key === "unassigned" ? "Unassigned learners" : (educatorNames.get(key) ?? "Educator"),
      learnerCount: learners.filter((l) => (l.educator_id ?? "unassigned") === key).length,
    }))
    .sort((a, b) => b.learnerCount - a.learnerCount || a.name.localeCompare(b.name));

  const selected =
    (requestedCentreId && centreKeys.includes(requestedCentreId) ? requestedCentreId : null) ??
    (fallbackCentreId && centreKeys.includes(fallbackCentreId) ? fallbackCentreId : null) ??
    centres[0]?.id ??
    null;

  const scoped = learners.filter((l) => (l.educator_id ?? "unassigned") === selected);

  return {
    scope: "centre",
    centres,
    selectedCentreId: selected,
    centreName: centres.find((c) => c.id === selected)?.name ?? "No centre",
    generatedAt: new Date().toISOString(),
    totals: computeOutcomeMetrics({ learnerIds: scoped.map((l) => l.id), gaps, outcomes }),
    learners: scoped
      .map((l) => ({
        id: l.id,
        name: l.full_name,
        subtitle: `Grade ${l.grade} · ${l.subject} · mastery ${l.mastery_score}%`,
        metrics: computeOutcomeMetrics({ learnerIds: [l.id], gaps, outcomes }),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export type ParentView = {
  scope: "parent";
  generatedAt: string;
  children: (SegmentMetrics & { educatorName: string | null })[];
  combined: OutcomeMetrics;
};

export async function fetchParentView(supabase: Client, userId: string): Promise<ParentView> {
  const { data: links, error } = await supabase
    .from("parent_learner_links")
    .select("learner_id")
    .eq("parent_user_id", userId);
  if (error) throw new Error(error.message);
  const linked = new Set((links ?? []).map((l) => l.learner_id));

  const { learners, gaps, outcomes, educatorNames } = await loadScope(supabase);
  const children = learners.filter((l) => linked.has(l.id));

  return {
    scope: "parent",
    generatedAt: new Date().toISOString(),
    children: children.map((l) => ({
      id: l.id,
      name: l.full_name,
      subtitle: `Grade ${l.grade} · ${l.subject}`,
      educatorName: l.educator_id ? (educatorNames.get(l.educator_id) ?? null) : null,
      metrics: computeOutcomeMetrics({ learnerIds: [l.id], gaps, outcomes }),
    })),
    combined: computeOutcomeMetrics({ learnerIds: children.map((l) => l.id), gaps, outcomes }),
  };
}

// Everything the signed-in learner has been asked to do: paid diagnostics
// their parent bought, and free learning checks their parent started. Resolved
// from the student's own auth user, so one learner can never see another's run.

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type LearnerRun =
  | {
      kind: "diagnostic";
      accessToken: string;
      subject: string;
      unitTitle: string;
      status: "not_started" | "in_progress" | "submitted";
      answeredCount: number;
      totalQuestions: number;
    }
  | {
      kind: "free_check";
      checkId: string;
      subject: string;
      unitTitle: string;
      status: "not_started" | "in_progress" | "submitted";
      answeredCount: number;
      totalQuestions: number;
    };

export type LearnerRunsView = {
  learnerName: string | null;
  runs: LearnerRun[];
};

export async function loadLearnerRuns(userId: string): Promise<LearnerRunsView> {
  const { data: learner, error } = await supabaseAdmin
    .from("learners")
    .select("id, full_name")
    .eq("student_user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!learner) return { learnerName: null, runs: [] };

  const [{ listLearnerDiagnostics }, { listLearnerFreeChecks }] = await Promise.all([
    import("./parent-diagnostic.server"),
    import("./free-check.server"),
  ]);

  const [diagnostics, freeChecks] = await Promise.all([
    listLearnerDiagnostics(learner.id),
    listLearnerFreeChecks(learner.id),
  ]);

  const runs: LearnerRun[] = [
    ...diagnostics.map((d) => ({ kind: "diagnostic" as const, ...d })),
    ...freeChecks.map((c) => ({
      kind: "free_check" as const,
      checkId: c.checkId,
      subject: c.subject,
      unitTitle: c.unitTitle,
      status: (c.status === "submitted"
        ? "submitted"
        : c.answered > 0
          ? "in_progress"
          : "not_started") as "not_started" | "in_progress" | "submitted",
      answeredCount: c.answered,
      totalQuestions: c.total,
    })),
  ];

  // Unfinished work first — the learner should never have to hunt for it.
  const rank = { in_progress: 0, not_started: 1, submitted: 2 } as const;
  runs.sort((a, b) => rank[a.status] - rank[b.status]);

  return { learnerName: learner.full_name, runs };
}

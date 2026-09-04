import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CircleCheck, CircleX, Clock, Crosshair, Lightbulb, Play } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  acceptRecommendation,
  dismissGap,
  dismissRecommendation,
  updateInterventionStatus,
} from "@/lib/interventions.functions";
import { getInterventionQueue } from "@/lib/educator-board.functions";
import { URGENCY_RULE_TEXT } from "@/lib/educator-board-shared";
import {
  GAP_STATUS_LABELS,
  INTERVENTION_STATUS_LABELS,
  RECOMMENDATION_STATUS_LABELS,
} from "@/lib/intervention-shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";


export const Route = createFileRoute("/_authenticated/interventions")({
  beforeLoad: ({ context }) => {
    if (context.role === "student") throw redirect({ to: "/home" });
  },
  head: () => ({
    meta: [
      { title: "Interventions — EduOS" },
      {
        name: "description",
        content:
          "Detected learning gaps, deterministic recommendations, and the intervention workflow.",
      },
      { property: "og:title", content: "Interventions — EduOS" },
      {
        property: "og:description",
        content:
          "Detected learning gaps, deterministic recommendations, and the intervention workflow.",
      },
    ],
  }),
  component: InterventionsPage,
});

function severityBadge(severity: string) {
  return severity === "high" ? (
    <Badge variant="destructive">High</Badge>
  ) : (
    <Badge className="bg-amber-500/15 text-amber-600 hover:bg-amber-500/15 dark:text-amber-400">
      Medium
    </Badge>
  );
}

function statusBadge(status: string) {
  if (status === "open" || status === "suggested" || status === "planned")
    return <Badge variant="outline">{GAP_STATUS_LABELS[status] ?? RECOMMENDATION_STATUS_LABELS[status] ?? INTERVENTION_STATUS_LABELS[status]}</Badge>;
  if (status === "dismissed" || status === "cancelled")
    return <Badge variant="secondary">{GAP_STATUS_LABELS[status] ?? INTERVENTION_STATUS_LABELS[status]}</Badge>;
  return <Badge>{GAP_STATUS_LABELS[status] ?? RECOMMENDATION_STATUS_LABELS[status] ?? INTERVENTION_STATUS_LABELS[status]}</Badge>;
}

function InterventionsPage() {
  const queryClient = useQueryClient();
  const acceptFn = useServerFn(acceptRecommendation);
  const dismissRecFn = useServerFn(dismissRecommendation);
  const transitionFn = useServerFn(updateInterventionStatus);
  const dismissGapFn = useServerFn(dismissGap);
  const fetchQueue = useServerFn(getInterventionQueue);

  // UX Phase 1 · UX-04: prioritised worklist (server-ranked, deterministic).
  const { data: workQueue, isPending: queuePending } = useQuery({
    queryKey: ["gap-board", "work-queue"],
    queryFn: () => fetchQueue(),
  });



  const { data: gaps, isPending: gapsPending } = useQuery({
    queryKey: ["gap-board", "gaps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learning_gaps")
        .select("*, learners(full_name)")
        .order("status")
        .order("severity")
        .order("detected_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: recommendations } = useQuery({
    queryKey: ["gap-board", "recommendations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recommendations")
        .select("*, learners(full_name), learning_gaps(subtopic, severity)")
        .order("priority")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: interventions } = useQuery({
    queryKey: ["gap-board", "interventions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interventions")
        .select("*, learners(full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: ["gap-board"] });
  };

  const acceptMutation = useMutation({
    mutationFn: (recommendationId: string) => acceptFn({ data: { recommendationId } }),
    onSuccess: () => {
      toast.success("Recommendation accepted — intervention planned.");
      invalidateAll();
    },
    onError: (e) => toast.error(e.message),
  });

  const dismissRecMutation = useMutation({
    mutationFn: (recommendationId: string) => dismissRecFn({ data: { recommendationId } }),
    onSuccess: () => {
      toast.success("Recommendation dismissed.");
      invalidateAll();
    },
    onError: (e) => toast.error(e.message),
  });

  const transitionMutation = useMutation({
    mutationFn: (input: { interventionId: string; status: "in_progress" | "completed" | "cancelled" }) =>
      transitionFn({ data: input }),
    onSuccess: () => {
      toast.success("Intervention updated.");
      invalidateAll();
    },
    onError: (e) => toast.error(e.message),
  });

  const dismissGapMutation = useMutation({
    mutationFn: (gapId: string) => dismissGapFn({ data: { gapId } }),
    onSuccess: () => {
      toast.success("Gap dismissed.");
      invalidateAll();
    },
    onError: (e) => toast.error(e.message),
  });

  const openGaps = (gaps ?? []).filter((g) => g.status === "open");
  const closedGaps = (gaps ?? []).filter((g) => g.status !== "open");
  const queue = (recommendations ?? []).filter((r) => r.status === "suggested");
  const actioned = (recommendations ?? []).filter((r) => r.status !== "suggested");
  const active = (interventions ?? []).filter((i) => i.status === "planned" || i.status === "in_progress");
  const finished = (interventions ?? []).filter((i) => i.status === "completed" || i.status === "cancelled");

  if (gapsPending) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <Crosshair className="h-5 w-5 text-primary" /> Interventions
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Gaps are detected automatically when assessments are scored (subtopic below 70%).
          The deterministic engine proposes one intervention per open gap — you decide what happens.
        </p>
      </div>

      {/* UX-04 · Prioritised intervention queue */}
      <Card data-testid="intervention-queue">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            <Clock className="h-4 w-4 shrink-0 text-primary" /> Priority queue
            <Badge variant={workQueue && workQueue.needAction > 0 ? "destructive" : "secondary"}>
              {workQueue?.needAction ?? 0} need action today
            </Badge>
          </CardTitle>
          <CardDescription>{URGENCY_RULE_TEXT}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {queuePending && <Skeleton className="h-32 w-full" />}
          {!queuePending &&
            (workQueue?.rows ?? []).map((row, index) => (
              <div
                key={row.interventionId}
                className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-start"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to="/learners/$learnerId"
                        params={{ learnerId: row.learnerId }}
                        className="text-sm font-medium hover:underline"
                      >
                        {row.learnerName}
                      </Link>
                      {statusBadge(row.status)}
                      {row.severity ? severityBadge(row.severity) : null}
                      {row.needsActionToday && <Badge variant="destructive">Stalled</Badge>}
                    </div>
                    <p className="text-sm break-words text-muted-foreground">{row.title}</p>
                    <p className="text-xs break-words text-muted-foreground tabular-nums">
                      {row.subtopic ?? "—"}
                      {row.subject ? ` · ${row.subject}` : ""} · {row.daysInPhase}d in phase · mastery{" "}
                      {row.mastery}% · urgency {row.urgency}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">

                  {row.status === "planned" && (
                    <Button
                      size="sm"
                      onClick={() =>
                        transitionMutation.mutate({
                          interventionId: row.interventionId,
                          status: "in_progress",
                        })
                      }
                      disabled={transitionMutation.isPending}
                    >
                      <Play className="h-3.5 w-3.5" /> Start
                    </Button>
                  )}
                  {row.status === "in_progress" && (
                    <Button
                      size="sm"
                      onClick={() =>
                        transitionMutation.mutate({
                          interventionId: row.interventionId,
                          status: "completed",
                        })
                      }
                      disabled={transitionMutation.isPending}
                    >
                      <CircleCheck className="h-3.5 w-3.5" /> Complete
                    </Button>
                  )}
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/learners/$learnerId" params={{ learnerId: row.learnerId }}>
                      Log
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          {!queuePending && (workQueue?.rows.length ?? 0) === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Queue is clear — no planned or in-progress interventions.
            </p>
          )}
        </CardContent>
      </Card>



      {/* Recommendation queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-4 w-4 text-primary" /> Recommendation queue
            <Badge variant="secondary">{queue.length}</Badge>
          </CardTitle>
          <CardDescription>
            Generated by the deterministic rule book — accept to plan an intervention, or dismiss.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {queue.map((rec) => (
            <div key={rec.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{rec.title}</p>
                  {severityBadge(rec.learning_gaps?.severity ?? "medium")}
                  <Badge variant="outline" className="font-mono text-[10px]">{rec.rule_id}</Badge>
                </div>
                <p className="text-sm break-words text-muted-foreground">{rec.activity}</p>
                <p className="text-xs text-muted-foreground">
                  {rec.learners?.full_name ?? "—"} · {rec.learning_gaps?.subtopic ?? "—"} · {rec.rationale}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => acceptMutation.mutate(rec.id)}
                  disabled={acceptMutation.isPending}
                >
                  <CircleCheck className="h-3.5 w-3.5" /> Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => dismissRecMutation.mutate(rec.id)}
                  disabled={dismissRecMutation.isPending}
                >
                  <CircleX className="h-3.5 w-3.5" /> Dismiss
                </Button>
              </div>
            </div>
          ))}
          {queue.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Queue is empty — every open gap has been actioned.
            </p>
          )}
          {actioned.length > 0 && (
            <div className="space-y-2 border-t pt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Actioned
              </p>
              {actioned.map((rec) => (
                <div key={rec.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="min-w-0 flex-1 break-words text-muted-foreground">
                    {rec.title} — {rec.learners?.full_name ?? "—"}
                  </span>
                  {statusBadge(rec.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active interventions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active interventions</CardTitle>
          <CardDescription>Planned and in-progress work with learners.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {active.map((i) => (
            <div key={i.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{i.title}</p>
                  {statusBadge(i.status)}
                </div>
                <p className="text-sm break-words text-muted-foreground">{i.activity}</p>
                <p className="text-xs text-muted-foreground">
                  {i.learners?.full_name ?? "—"}
                  {i.target_date ? ` · target ${i.target_date}` : ""}
                  {i.started_at ? ` · started ${i.started_at.slice(0, 10)}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {i.status === "planned" && (
                  <Button
                    size="sm"
                    onClick={() => transitionMutation.mutate({ interventionId: i.id, status: "in_progress" })}
                    disabled={transitionMutation.isPending}
                  >
                    <Play className="h-3.5 w-3.5" /> Start
                  </Button>
                )}
                {i.status === "in_progress" && (
                  <Button
                    size="sm"
                    onClick={() => transitionMutation.mutate({ interventionId: i.id, status: "completed" })}
                    disabled={transitionMutation.isPending}
                  >
                    <CircleCheck className="h-3.5 w-3.5" /> Complete
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => transitionMutation.mutate({ interventionId: i.id, status: "cancelled" })}
                  disabled={transitionMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ))}
          {active.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">No active interventions.</p>
          )}
          {finished.length > 0 && (
            <div className="space-y-2 border-t pt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Completed / cancelled
              </p>
              {finished.map((i) => (
                <div key={i.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="min-w-0 flex-1 break-words text-muted-foreground">
                    {i.title} — {i.learners?.full_name ?? "—"}
                  </span>
                  {statusBadge(i.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gap registry */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detected gaps</CardTitle>
          <CardDescription>
            One row per learner and subtopic. A gap closes automatically when a later assessment
            scores 70% or more on that subtopic.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {openGaps.map((gap) => (
            <div key={gap.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{gap.subtopic}</p>
                  {severityBadge(gap.severity)}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {gap.learners?.full_name ?? "—"} · {gap.items_correct}/{gap.items_total} correct (
                  {gap.gap_score_pct}%) · detected {gap.detected_at.slice(0, 10)}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => dismissGapMutation.mutate(gap.id)}
                disabled={dismissGapMutation.isPending}
              >
                Dismiss gap
              </Button>
            </div>
          ))}
          {openGaps.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">No open gaps. 🎉</p>
          )}
          {closedGaps.length > 0 && (
            <div className="space-y-2 border-t pt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Closed
              </p>
              {closedGaps.map((gap) => (
                <div key={gap.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="min-w-0 flex-1 break-words text-muted-foreground">
                    {gap.subtopic} — {gap.learners?.full_name ?? "—"} ({gap.gap_score_pct}%)
                  </span>
                  {statusBadge(gap.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

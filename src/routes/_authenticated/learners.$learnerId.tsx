import { createFileRoute, Link, notFound, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, CircleDashed, KeyRound, PlayCircle, Plus, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { resetLearnerPin } from "@/lib/learners.functions";
import { getLearnerOutcomes, getOutcomeReport } from "@/lib/outcomes.functions";
import {
  buildOutcomeTimeline,
  OUTCOME_STATUS_LABELS,
  type OutcomeStatus,
} from "@/lib/outcome-shared";
import {
  GAP_STATUS_LABELS,
  INTERVENTION_STATUS_LABELS,
  RECOMMENDATION_STATUS_LABELS,
} from "@/lib/intervention-shared";
import { statusBadge, liftText } from "./dashboard";
import { MasteryChart } from "@/components/mastery-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/learners/$learnerId")({
  beforeLoad: ({ context }) => {
    if (context.role === "student") throw redirect({ to: "/home" });
  },
  head: () => ({
    meta: [
      { title: "Learner profile — EduOS" },
      { name: "description", content: "Mastery, progress, learning plan, and evidence for this learner." },
      { property: "og:title", content: "Learner profile — EduOS" },
      { property: "og:description", content: "Mastery, progress, learning plan, and evidence for this learner." },
    ],
  }),
  notFoundComponent: LearnerNotFound,
  component: LearnerProfilePage,
});

function LearnerNotFound() {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <h2 className="text-xl font-semibold">Learner not found</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        This learner doesn't exist or isn't assigned to you.
      </p>
      <Button className="mt-6" asChild>
        <Link to="/learners">Back to learners</Link>
      </Button>
    </div>
  );
}

function planStatusBadge(status: string) {
  if (status === "completed") return <Badge variant="secondary">Completed</Badge>;
  if (status === "in_progress") return <Badge>In progress</Badge>;
  return <Badge variant="outline">Not started</Badge>;
}

function LearnerProfilePage() {
  const { learnerId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const resetPinFn = useServerFn(resetLearnerPin);
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  const { data: learner, isPending, isError } = useQuery({
    queryKey: ["learner", learnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learners")
        .select("*")
        .eq("id", learnerId)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

  const { data: history } = useQuery({
    queryKey: ["mastery-history", learnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mastery_history")
        .select("*")
        .eq("learner_id", learnerId)
        .order("recorded_on");
      if (error) throw error;
      return data;
    },
  });

  const { data: assessments } = useQuery({
    queryKey: ["assessments", learnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learner_assessments")
        .select("*")
        .eq("learner_id", learnerId)
        .order("taken_on", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: planItems } = useQuery({
    queryKey: ["plan-items", learnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learning_plan_items")
        .select("*")
        .eq("learner_id", learnerId)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: evidence } = useQuery({
    queryKey: ["evidence", learnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learner_evidence")
        .select("*")
        .eq("learner_id", learnerId)
        .order("recorded_on", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Sprint 3: gaps, recommendations, and interventions for this learner.
  const { data: gaps } = useQuery({
    queryKey: ["learner-gaps", learnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learning_gaps")
        .select("*")
        .eq("learner_id", learnerId)
        .order("detected_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: recommendations } = useQuery({
    queryKey: ["learner-recommendations", learnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recommendations")
        .select("*")
        .eq("learner_id", learnerId)
        .order("priority")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: interventions } = useQuery({
    queryKey: ["learner-interventions", learnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interventions")
        .select("*")
        .eq("learner_id", learnerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Sprint 4: tutor session aggregates. Conversation content is student-only
  // by RLS — staff see concept, counts, and status, never the dialogue.
  const { data: tutorSessions } = useQuery({
    queryKey: ["tutor-sessions", learnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutor_sessions")
        .select("*")
        .eq("learner_id", learnerId)
        .order("last_activity_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Sprint 5: outcomes with full evidence-chain reports.
  const fetchOutcomes = useServerFn(getLearnerOutcomes);
  const fetchOutcomeReport = useServerFn(getOutcomeReport);
  const { data: learnerOutcomes } = useQuery({
    queryKey: ["learner-outcomes", learnerId],
    queryFn: () => fetchOutcomes({ data: { learnerId } }),
  });
  const outcomeIds = (learnerOutcomes ?? []).map((o) => o.id).join(",");
  const { data: outcomeReports } = useQuery({
    queryKey: ["learner-outcome-reports", learnerId, outcomeIds],
    enabled: (learnerOutcomes ?? []).length > 0,
    queryFn: () =>
      Promise.all(
        (learnerOutcomes ?? []).map((o) => fetchOutcomeReport({ data: { outcomeId: o.id } })),
      ),
  });

  const addEvidenceMutation = useMutation({
    mutationFn: async (input: { title: string; kind: string; note: string }) => {
      const { error } = await supabase.from("learner_evidence").insert({
        learner_id: learnerId,
        title: input.title,
        kind: input.kind,
        note: input.note || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Evidence logged.");
      setEvidenceOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["evidence", learnerId] });
    },
    onError: (error) => toast.error(error.message),
  });

  const resetPinMutation = useMutation({
    mutationFn: (pin: string) => resetPinFn({ data: { learnerId, pin } }),
    onSuccess: () => toast.success("PIN reset. Share the new PIN with the student."),
    onError: (error) => toast.error(error.message),
  });

  const updateLearnerMutation = useMutation({
    mutationFn: async (patch: { focus_note?: string; status?: "active" | "needs_attention" | "paused" }) => {
      const { error } = await supabase.from("learners").update(patch).eq("id", learnerId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Learner updated.");
      void queryClient.invalidateQueries({ queryKey: ["learner", learnerId] });
      void queryClient.invalidateQueries({ queryKey: ["learners"] });
    },
    onError: (error) => toast.error(error.message),
  });

  if (isError) throw notFound();

  if (isPending || !learner) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const chartData = (history ?? []).map((h) => ({ date: h.recorded_on.slice(5), score: h.score }));
  const completedPlan = (planItems ?? []).filter((p) => p.status === "completed").length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <button
          onClick={() => void navigate({ to: "/learners" })}
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Learners
        </button>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-sm font-semibold">
            {learner.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
          </div>
          <div className="mr-auto">
            <h2 className="text-2xl font-semibold tracking-tight">{learner.full_name}</h2>
            <p className="text-sm text-muted-foreground">
              @{learner.handle} · Grade {learner.grade} · {learner.subject}
            </p>
          </div>
          {statusBadge(learner.status)}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wide">Mastery</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{learner.mastery_score}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wide">30-day lift</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{liftText(Number(learner.mastery_lift))} pts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wide">Plan progress</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {completedPlan}/{(planItems ?? []).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {learner.focus_note && (
        <Card className="border-l-4 border-l-primary">
          <CardContent className="py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current focus</p>
            <p className="mt-1 text-sm">{learner.focus_note}</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="plan">Learning plan</TabsTrigger>
          <TabsTrigger value="gaps">Gaps</TabsTrigger>
          <TabsTrigger value="tutor">AI Tutor</TabsTrigger>
          <TabsTrigger value="evidence">Evidence</TabsTrigger>
          <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mastery trend</CardTitle>
              <CardDescription>Score over the last 10 weeks</CardDescription>
            </CardHeader>
            <CardContent>
              <MasteryChart data={chartData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mastery history</CardTitle>
            </CardHeader>
            <CardContent>
              <MasteryChart data={chartData} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assessments</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assessment</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(assessments ?? []).map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.title}</TableCell>
                      <TableCell>{a.subject}</TableCell>
                      <TableCell className="text-muted-foreground">{a.taken_on ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {a.score != null ? `${a.score}%` : "—"}
                      </TableCell>
                      <TableCell>
                        {a.status === "scheduled" ? (
                          <Badge variant="outline">Scheduled</Badge>
                        ) : (
                          <Badge variant="secondary">Completed</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(assessments ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                        No assessments yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plan" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Learning plan</CardTitle>
              <CardDescription>
                {completedPlan} of {(planItems ?? []).length} activities completed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(planItems ?? []).map((item) => (
                <div key={item.id} className="flex items-start gap-4 rounded-lg border p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{item.focus}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{item.activity}</p>
                    {item.target_date && (
                      <p className="mt-1 text-xs text-muted-foreground">Target: {item.target_date}</p>
                    )}
                  </div>
                  {planStatusBadge(item.status)}
                </div>
              ))}
              {(planItems ?? []).length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">No plan items yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gaps" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detected gaps</CardTitle>
              <CardDescription>
                Opened automatically when a scored assessment shows a subtopic below 70%. A gap
                closes when a later assessment reaches 70% on that subtopic.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(gaps ?? []).map((gap) => (
                <div key={gap.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{gap.subtopic}</p>
                      {gap.severity === "high" ? (
                        <Badge variant="destructive">High</Badge>
                      ) : (
                        <Badge className="bg-amber-500/15 text-amber-600 hover:bg-amber-500/15 dark:text-amber-400">
                          Medium
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {gap.items_correct}/{gap.items_total} correct ({gap.gap_score_pct}%) · detected{" "}
                      {gap.detected_at.slice(0, 10)}
                    </p>
                  </div>
                  <Badge variant={gap.status === "open" ? "outline" : "secondary"}>
                    {GAP_STATUS_LABELS[gap.status] ?? gap.status}
                  </Badge>
                </div>
              ))}
              {(gaps ?? []).length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No gaps detected for this learner.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recommendations</CardTitle>
              <CardDescription>
                Generated by the deterministic rule book — manage them on the Interventions board.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(recommendations ?? []).map((rec) => (
                <div key={rec.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{rec.title}</p>
                      <Badge variant="outline" className="font-mono text-[10px]">{rec.rule_id}</Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{rec.activity}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{rec.rationale}</p>
                  </div>
                  <Badge variant={rec.status === "suggested" ? "outline" : "secondary"}>
                    {RECOMMENDATION_STATUS_LABELS[rec.status] ?? rec.status}
                  </Badge>
                </div>
              ))}
              {(recommendations ?? []).length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No recommendations yet — they appear when a gap is detected.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Interventions</CardTitle>
              <CardDescription>Accepted work with this learner.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(interventions ?? []).map((i) => (
                <div key={i.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{i.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {i.target_date ? `Target ${i.target_date} · ` : ""}
                      {i.started_at ? `Started ${i.started_at.slice(0, 10)} · ` : ""}
                      {i.completed_at ? `Completed ${i.completed_at.slice(0, 10)}` : ""}
                    </p>
                  </div>
                  <Badge variant={i.status === "completed" ? "secondary" : "outline"}>
                    {INTERVENTION_STATUS_LABELS[i.status] ?? i.status}
                  </Badge>
                </div>
              ))}
              {(interventions ?? []).length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No interventions yet — accept a recommendation to plan one.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tutor" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI Tutor sessions</CardTitle>
              <CardDescription>
                Session aggregates only — what the student asked and said stays private to them.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Concept</TableHead>
                    <TableHead>Topic</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Interactions</TableHead>
                    <TableHead>Concepts accessed</TableHead>
                    <TableHead>Last activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(tutorSessions ?? []).map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.concept}</TableCell>
                      <TableCell>{s.topic}</TableCell>
                      <TableCell>
                        <Badge variant={s.status === "active" ? "default" : "secondary"}>
                          {s.status === "active" ? "Active" : "Ended"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {s.interaction_count}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {s.concepts_accessed.join(", ") || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(s.last_activity_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(tutorSessions ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                        No tutor sessions yet — the student launches the tutor from their focus plan.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outcomes" className="space-y-4 pt-4">
          {(outcomeReports ?? []).map((report) => {
            const o = report.outcome;
            const lift = o.mastery_lift ?? 0;
            const practiceCount = report.tutorSessions.reduce(
              (sum, s) => sum + s.interactionCount,
              0,
            );
            const steps = buildOutcomeTimeline({
              subtopic: o.subtopic,
              baselineAt: report.baselineSession?.submittedAt ?? null,
              baselineScore: o.baseline_score,
              gapAt: report.gap?.firstDetectedAt ?? null,
              interventionTitle: report.intervention?.title ?? o.subtopic,
              interventionStartedAt: report.intervention?.startedAt ?? null,
              interventionCompletedAt: report.intervention?.completedAt ?? null,
              practiceCount,
              practiceLastAt: report.tutorSessions[0]?.lastActivityAt ?? null,
              reassessmentAt: report.reassessmentSession?.submittedAt ?? null,
              postScore: o.post_score,
              lift: o.mastery_lift,
              confidence: o.confidence,
              status: o.status,
              completedAt: o.completed_at,
            });
            return (
              <Card key={o.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      {o.subtopic}
                    </CardTitle>
                    <CardDescription>
                      {o.subject} · {o.topic} — diagnostic vs post-intervention
                    </CardDescription>
                  </div>
                  <Badge variant={o.status === "improvement" ? "secondary" : "outline"}>
                    {OUTCOME_STATUS_LABELS[o.status as OutcomeStatus] ?? o.status}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { label: "Baseline", value: `${o.baseline_score}%` },
                      { label: "Post-intervention", value: o.post_score !== null ? `${o.post_score}%` : "—" },
                      {
                        label: "Mastery lift",
                        value: o.mastery_lift !== null ? `${lift >= 0 ? "+" : ""}${lift} pts` : "—",
                      },
                      {
                        label: "Confidence",
                        value: o.confidence !== null ? `${o.confidence}/100` : "—",
                      },
                    ].map((s) => (
                      <div key={s.label} className="rounded-lg border p-3">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          {s.label}
                        </p>
                        <p className="mt-1 text-lg font-semibold tabular-nums">{s.value}</p>
                      </div>
                    ))}
                  </div>

                  <div>
                    <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Outcome timeline
                    </p>
                    <ol className="space-y-3">
                      {steps.map((step) => (
                        <li key={step.key} className="flex items-start gap-3">
                          {step.state === "done" ? (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          ) : step.state === "current" ? (
                            <PlayCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          ) : (
                            <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-sm ${step.state === "pending" ? "text-muted-foreground" : "font-medium"}`}
                            >
                              {step.label}
                            </p>
                            {step.detail && (
                              <p className="text-xs text-muted-foreground">{step.detail}</p>
                            )}
                          </div>
                          {step.at && (
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {new Date(step.at).toLocaleDateString()}
                            </span>
                          )}
                        </li>
                      ))}
                    </ol>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {(learnerOutcomes ?? []).length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No outcomes yet — complete an intervention to open one, then reassess the learner.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="evidence" className="pt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Evidence</CardTitle>
                <CardDescription>Work samples, quizzes, and observations</CardDescription>
              </div>
              <Dialog open={evidenceOpen} onOpenChange={setEvidenceOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4" /> Log evidence
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Log evidence</DialogTitle>
                    <DialogDescription>Record an observation or work sample.</DialogDescription>
                  </DialogHeader>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = new FormData(e.currentTarget);
                      addEvidenceMutation.mutate({
                        title: String(form.get("title") ?? ""),
                        kind: String(form.get("kind") ?? "observation"),
                        note: String(form.get("note") ?? ""),
                      });
                    }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input id="title" name="title" placeholder="Fractions exit ticket" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="kind">Type</Label>
                      <Select name="kind" defaultValue="observation">
                        <SelectTrigger id="kind">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="observation">Observation</SelectItem>
                          <SelectItem value="worksheet">Worksheet</SelectItem>
                          <SelectItem value="quiz">Quiz</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="note">Note</Label>
                      <Input id="note" name="note" placeholder="Optional note…" />
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={addEvidenceMutation.isPending}>
                        {addEvidenceMutation.isPending ? "Saving…" : "Save"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="space-y-3">
              {(evidence ?? []).map((item) => (
                <div key={item.id} className="flex items-start gap-3 rounded-lg border p-4">
                  <Badge variant="outline" className="mt-0.5 capitalize">{item.kind}</Badge>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.title}</p>
                    {item.note && <p className="mt-0.5 text-sm text-muted-foreground">{item.note}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">{item.recorded_on}</p>
                  </div>
                </div>
              ))}
              {(evidence ?? []).length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">No evidence logged yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Focus note</CardTitle>
              <CardDescription>Shown at the top of this profile and on the student's home.</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = new FormData(e.currentTarget);
                  updateLearnerMutation.mutate({ focus_note: String(form.get("focusNote") ?? "") });
                }}
                className="flex gap-3"
              >
                <Input name="focusNote" defaultValue={learner.focus_note ?? ""} placeholder="What should this learner focus on?" />
                <Button type="submit" disabled={updateLearnerMutation.isPending}>Save</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={learner.status}
                onValueChange={(v) =>
                  updateLearnerMutation.mutate({ status: v as "active" | "needs_attention" | "paused" })
                }
              >
                <SelectTrigger className="w-56" aria-label="Learner status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="needs_attention">Needs attention</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Student sign-in</CardTitle>
              <CardDescription>
                Handle: <span className="font-mono">{learner.handle}</span> — reset the PIN if the student
                can't sign in.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const pin = String(new FormData(e.currentTarget).get("pin") ?? "");
                  if (!/^\d{6}$/.test(pin)) {
                    toast.error("PIN must be exactly 6 digits.");
                    return;
                  }
                  resetPinMutation.mutate(pin);
                }}
                className="flex gap-3"
              >
                <div className="relative flex-1">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input name="pin" inputMode="numeric" maxLength={6} placeholder="New 6-digit PIN" className="pl-9" />
                </div>
                <Button type="submit" variant="secondary" disabled={resetPinMutation.isPending}>
                  Reset PIN
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

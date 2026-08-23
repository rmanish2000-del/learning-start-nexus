import { useRef, useState } from "react";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, BookOpen, CircleCheck, CircleDashed, ClipboardList, Loader, Play, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { getMyAssessmentSessions } from "@/lib/assessments.functions";
import { getMyOutcomes } from "@/lib/outcomes.functions";
import { OUTCOME_STATUS_LABELS, type OutcomeStatus } from "@/lib/outcome-shared";
import { launchTutorSession } from "@/lib/tutor.functions";
import { getLearnerConsent } from "@/lib/consent.functions";
import {
  getOnboardingFlag,
  setOnboardingFlag,
  stepFlagKey,
  type OnboardingStep,
} from "@/lib/onboarding";
import { ContextHelp } from "@/components/context-help";
import { GuidedTour, type TourStep } from "@/components/guided-tour";
import { OnboardingChecklist } from "@/components/onboarding-checklist";
import { Button } from "@/components/ui/button";
import { MasteryChart } from "@/components/mastery-chart";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

const STUDENT_TOUR: TourStep[] = [
  {
    selector: '[data-tour="student-checklist"]',
    title: "Your getting-started checklist",
    body: "Three steps: take your diagnostic, view your plan, then practice with the AI Tutor. It checks itself off as you go.",
  },
  {
    selector: '[data-tour="student-assessments"]',
    title: "Assessments from your educator",
    body: "Diagnostics appear here the moment your educator assigns them. Progress saves automatically — resume anytime.",
  },
  {
    selector: '[data-tour="student-plan"]',
    title: "Your focus plan",
    body: "Extra practice planned just for you. Each item can unlock an AI Tutor session once a parent or guardian has consented.",
  },
  {
    selector: '[data-tour="student-mastery"]',
    title: "Watch your mastery grow",
    body: "Every completed assessment feeds this chart. Reassessments after interventions show your before/after lift.",
  },
  {
    selector: '[data-tour="sidebar-nav"]',
    title: "That's everything",
    body: "Settings and verification pages live in the sidebar. You're all set — happy learning!",
  },
];

export const Route = createFileRoute("/_authenticated/home")({
  beforeLoad: ({ context }) => {
    if (context.role !== "student") throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Home — EduOS" },
      { name: "description", content: "Your learning plan, progress, and what's next." },
      { property: "og:title", content: "Home — EduOS" },
      { property: "og:description", content: "Your learning plan, progress, and what's next." },
    ],
  }),
  component: StudentHomePage,
});

function itemIcon(status: string) {
  if (status === "completed") return <CircleCheck className="h-5 w-5 text-primary" />;
  if (status === "in_progress") return <Loader className="h-5 w-5 text-primary" />;
  return <CircleDashed className="h-5 w-5 text-muted-foreground" />;
}

function StudentHomePage() {
  const { user, profile } = Route.useRouteContext();
  const navigate = useNavigate();
  const launchTutor = useServerFn(launchTutorSession);
  const fetchConsent = useServerFn(getLearnerConsent);

  // Sprint 4: launch (or resume) the AI tutor for an assigned intervention.
  const launchTutorMutation = useMutation({
    mutationFn: (interventionId: string) => launchTutor({ data: { interventionId } }),
    onSuccess: (result) =>
      void navigate({ to: "/tutor/$sessionId", params: { sessionId: result.sessionId } }),
    onError: (error) => toast.error(error.message),
  });

  const { data: learner, isPending: learnerPending } = useQuery({
    queryKey: ["my-learner", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learners")
        .select("*")
        .eq("student_user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Sprint 5A: AI tutor requires guardian consent on file.
  const { data: consent } = useQuery({
    queryKey: ["my-consent", learner?.id],
    enabled: !!learner?.id,
    queryFn: () => fetchConsent({ data: { learnerId: learner!.id } }),
  });
  const tutorConsentMissing = consent !== undefined && !consent.hasConsent;

  const { data: items } = useQuery({
    queryKey: ["my-learning-items", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learning_items")
        .select("*")
        .eq("student_user_id", user.id)
        .order("due", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: history } = useQuery({
    queryKey: ["mastery-history", learner?.id],
    enabled: !!learner?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mastery_history")
        .select("*")
        .eq("learner_id", learner!.id)
        .order("recorded_on");
      if (error) throw error;
      return data;
    },
  });

  const { data: planItems } = useQuery({
    queryKey: ["plan-items", learner?.id],
    enabled: !!learner?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learning_plan_items")
        .select("*")
        .eq("learner_id", learner!.id)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const fetchSessions = useServerFn(getMyAssessmentSessions);
  const fetchOutcomes = useServerFn(getMyOutcomes);
  const { data: assessmentSessions } = useQuery({
    queryKey: ["my-assessment-sessions"],
    queryFn: () => fetchSessions(),
  });

  // Sprint 5: the student's own before/after outcome view.
  const { data: outcomes } = useQuery({
    queryKey: ["my-outcomes"],
    queryFn: () => fetchOutcomes(),
  });
  const completedOutcomes = (outcomes ?? []).filter((o) => o.status !== "pending");

  // Sprint 3: accepted interventions are the student's focus plan. Gaps and
  // recommendations stay staff-only — students never see them.
  const { data: focusPlan } = useQuery({
    queryKey: ["my-interventions", learner?.id],
    enabled: !!learner?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interventions")
        .select("*")
        .eq("learner_id", learner!.id)
        .in("status", ["planned", "in_progress"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";
  const continueItem = (items ?? []).find((i) => i.status === "in_progress") ?? (items ?? []).find((i) => i.status === "not_started");
  const completed = (items ?? []).filter((i) => i.status === "completed").length;
  const chartData = (history ?? []).map((h) => ({ date: h.recorded_on.slice(5), score: h.score }));
  const nextPlanItems = (planItems ?? []).filter((p) => p.status !== "completed").slice(0, 3);

  // Sprint 5B: student onboarding checklist (diagnostic → plan → AI tutor).
  const planRef = useRef<HTMLDivElement>(null);
  const [, forceRender] = useState(0);
  const submittedSession = (assessmentSessions ?? []).some((s) => s.status === "submitted");
  const pendingSession = (assessmentSessions ?? []).find((s) => s.status !== "submitted");
  const firstFocus = (focusPlan ?? [])[0];

  const studentSteps: OnboardingStep[] = [
    {
      key: "diagnostic",
      title: "Take your diagnostic",
      description: "A short check-up from your educator — progress saves automatically, resume anytime.",
      done: submittedSession,
      ...(pendingSession
        ? { action: "take-diagnostic", ctaLabel: pendingSession.status === "in_progress" ? "Resume" : "Start" }
        : submittedSession
          ? {}
          : { blockedHint: "Your educator will assign one soon" }),
    },
    {
      key: "plan",
      title: "View your plan",
      description: "Your focus plan shows exactly what to practice next.",
      done: getOnboardingFlag(stepFlagKey("student", "plan")),
      ...(firstFocus
        ? { action: "scroll-plan", ctaLabel: "View plan" }
        : { blockedHint: "Your educator is building it" }),
    },
    {
      key: "tutor",
      title: "Practice with the AI Tutor",
      description: "A Socratic companion that explains, hints and practices with you — inside your approved plan.",
      done: getOnboardingFlag(stepFlagKey("student", "tutor")),
      ...(tutorConsentMissing
        ? { blockedHint: "Needs guardian consent" }
        : firstFocus
          ? { action: "launch-tutor", ctaLabel: "Open AI Tutor" }
          : { blockedHint: "Waiting for your educator" }),
    },
  ];

  const handleStudentAction = (action: string) => {
    if (action === "take-diagnostic" && pendingSession) {
      void navigate({ to: "/session/$sessionId", params: { sessionId: pendingSession.id } });
    }
    if (action === "scroll-plan") {
      setOnboardingFlag(stepFlagKey("student", "plan"));
      forceRender((n) => n + 1);
      planRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (action === "launch-tutor" && firstFocus) {
      setOnboardingFlag(stepFlagKey("student", "tutor"));
      launchTutorMutation.mutate(firstFocus.id);
    }
  };

  if (learnerPending) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Hi {firstName}</h2>
          <p className="text-sm text-muted-foreground">
            {learner ? `Grade ${learner.grade} · ${learner.subject}` : "Welcome to EduOS"}
          </p>
        </div>
        <ContextHelp page="/home" />
      </div>

      {learner && (
        <div data-tour="student-checklist">
          <OnboardingChecklist
            role="student"
            title="Getting started"
            description="Three steps and you're fully set up on EduOS."
            steps={studentSteps}
            tourId="student-home"
            onAction={handleStudentAction}
          />
        </div>
      )}

      {!learner && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Your educator hasn't linked your learner profile yet — check back soon.
          </CardContent>
        </Card>
      )}

      {learner?.focus_note && (
        <Card className="border-l-4 border-l-primary">
          <CardContent className="flex gap-3 py-4">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Your focus this week
              </p>
              <p className="mt-1 text-sm">{learner.focus_note}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {continueItem && (
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="flex flex-wrap items-center gap-4 py-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-foreground/15">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-primary-foreground/70">
                Continue learning
              </p>
              <p className="truncate text-lg font-semibold">{continueItem.title}</p>
              <div className="mt-2 flex items-center gap-3">
                <Progress
                  value={continueItem.progress_pct}
                  className="h-1.5 max-w-48 bg-primary-foreground/20"
                />
                <span className="text-xs text-primary-foreground/80">{continueItem.progress_pct}%</span>
              </div>
            </div>
            <Badge variant="secondary" className="capitalize">{continueItem.kind}</Badge>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wide">
              Current mastery
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{learner?.mastery_score ?? 0}%</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {Number(learner?.mastery_lift ?? 0) >= 0 ? "+" : ""}
              {learner?.mastery_lift ?? 0} points in the last 30 days
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wide">
              Activities completed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {completed}/{(items ?? []).length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Keep going — you're building momentum</p>
          </CardContent>
        </Card>
      </div>

      {completedOutcomes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">My progress</CardTitle>
            <CardDescription>
              Before and after each completed intervention — proof that the practice worked.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {completedOutcomes.map((o) => {
              const lift = o.mastery_lift ?? 0;
              return (
                <div key={o.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{o.subtopic}</p>
                    <Badge variant={lift >= 10 ? "secondary" : "outline"}>
                      {OUTCOME_STATUS_LABELS[o.status as OutcomeStatus] ?? o.status}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-4">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Before</p>
                      <p className="text-lg font-semibold tabular-nums">{o.baseline_score}%</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">After</p>
                      <p className="text-lg font-semibold tabular-nums">{o.post_score ?? "—"}%</p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Progress</p>
                      <p className={`text-lg font-semibold tabular-nums ${lift >= 0 ? "text-primary" : "text-destructive"}`}>
                        {lift >= 0 ? "+" : ""}{lift} pts
                      </p>
                    </div>
                  </div>
                  <Progress value={o.post_score ?? o.baseline_score} className="mt-3 h-1.5" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {(assessmentSessions ?? []).length > 0 && (
        <Card data-tour="student-assessments">
          <CardHeader>
            <CardTitle className="text-base">My assessments</CardTitle>
            <CardDescription>Diagnostics assigned by your educator — progress saves automatically.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(assessmentSessions ?? []).map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <ClipboardList className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.assessments?.title ?? "Assessment"}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.status === "submitted"
                      ? `Scored ${s.score_pct}%`
                      : s.status === "in_progress"
                        ? "In progress — resume anytime"
                        : "Not started"}
                    {s.due ? ` · due ${s.due}` : ""}
                    {s.assessments?.time_limit_minutes ? ` · ${s.assessments.time_limit_minutes} min` : ""}
                  </p>
                </div>
                <Button asChild size="sm" variant={s.status === "submitted" ? "outline" : "default"}>
                  <Link to="/session/$sessionId" params={{ sessionId: s.id }}>
                    {s.status === "submitted" ? (
                      "Review"
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5" />
                        {s.status === "in_progress" ? "Resume" : "Start"}
                      </>
                    )}
                  </Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

        <Card data-tour="student-mastery">
          <CardHeader>
            <CardTitle className="text-base">My mastery</CardTitle>
          <CardDescription>How your score has grown</CardDescription>
        </CardHeader>
        <CardContent>
          <MasteryChart data={chartData} />
        </CardContent>
      </Card>

      {(focusPlan ?? []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Focus plan</CardTitle>
            <CardDescription>
              Extra practice your educator planned for you — this is what to work on next.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(focusPlan ?? []).map((i) => (
              <div key={i.id} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{i.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {i.activity}
                    {i.target_date ? ` · target ${i.target_date}` : ""}
                  </p>
                </div>
                <Badge variant={i.status === "in_progress" ? "default" : "outline"}>
                  {i.status === "in_progress" ? "In progress" : "Planned"}
                </Badge>
                {tutorConsentMissing ? (
                  <Badge
                    variant="outline"
                    className="border-amber-500/40 text-amber-600 dark:text-amber-400"
                    title="A parent or guardian consent record is required before the AI tutor unlocks. Your educator can record it."
                  >
                    Consent needed for tutor
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    disabled={launchTutorMutation.isPending}
                    onClick={() => launchTutorMutation.mutate(i.id)}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    AI Tutor
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">My activities</CardTitle>
            <CardDescription>Everything assigned to you</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(items ?? []).map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-lg border p-3">
                {itemIcon(item.status)}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.kind}
                    {item.due ? ` · due ${item.due}` : ""}
                  </p>
                </div>
                {item.status !== "completed" && (
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </div>
            ))}
            {(items ?? []).length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No activities assigned yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">What's next</CardTitle>
            <CardDescription>From your learning plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {nextPlanItems.map((item) => (
              <div key={item.id} className="rounded-lg border p-3">
                <p className="text-sm font-medium">{item.focus}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{item.activity}</p>
              </div>
            ))}
            {nextPlanItems.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Your plan is all caught up. Nice work!
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      <GuidedTour tourId="student-home" steps={STUDENT_TOUR} />
    </div>
  );
}

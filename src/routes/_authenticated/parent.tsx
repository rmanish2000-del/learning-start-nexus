import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  CalendarClock,
  ClipboardCheck,
  HeartHandshake,
  LineChart as LineChartIcon,
  ShieldCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { supabase } from "@/integrations/supabase/client";
import {
  getLearnerConsent,
  recordGuardianConsent,
  withdrawGuardianConsent,
} from "@/lib/consent.functions";
import {
  getOnboardingFlag,
  setOnboardingFlag,
  stepFlagKey,
  type OnboardingStep,
} from "@/lib/onboarding";
import { ContextHelp } from "@/components/context-help";
import { QueryError } from "@/components/query-error";
import { EmptyState } from "@/components/empty-state";
import { GuidedTour, type TourStep } from "@/components/guided-tour";
import { OnboardingChecklist } from "@/components/onboarding-checklist";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/parent")({
  head: () => ({
    meta: [
      { title: "Parent Portal — EduOS" },
      { name: "description", content: "Follow your child's learning progress and manage guardian consent." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ParentPortal,
});

const PARENT_TOUR: TourStep[] = [
  {
    selector: '[data-tour="parent-checklist"]',
    title: "Your getting-started checklist",
    body: "Two steps: record guardian consent, then review your child's progress. The checklist tracks itself.",
  },
  {
    selector: '[data-tour="parent-consent"]',
    title: "Guardian consent",
    body: "Consent unlocks the AI Tutor for your child. Assessments and learning plans work either way. Every consent change is kept in a permanent history.",
  },
  {
    selector: '[data-tour="parent-progress"]',
    title: "Progress",
    body: "Live mastery, recent assessment scores and active interventions — everything here is read-only and updated as your child learns.",
  },
];

function ParentPortal() {
  const { profile, user } = Route.useRouteContext();
  const queryClient = useQueryClient();

  const linksQuery = useQuery({
    queryKey: ["parent-links", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parent_learner_links")
        .select("learner_id, learners(id, full_name, grade, mastery_score, mastery_lift)")
        .eq("parent_user_id", user.id);
      if (error) throw error;
      return (data ?? [])
        .map((row) => row.learners)
        .filter((l): l is NonNullable<typeof l> => l !== null);
    },
  });

  const learners = useMemo(() => linksQuery.data ?? [], [linksQuery.data]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const learner = learners.find((l) => l.id === selectedId) ?? learners[0] ?? null;

  const consentQuery = useQuery({
    queryKey: ["parent-consent", learner?.id],
    enabled: !!learner,
    queryFn: () => getLearnerConsent({ data: { learnerId: learner!.id } }),
  });

  const progressQuery = useQuery({
    queryKey: ["parent-progress", learner?.id],
    enabled: !!learner,
    queryFn: async () => {
      const [mastery, outcomes, sessions, interventions] = await Promise.all([
        supabase
          .from("mastery_history")
          .select("score, recorded_on")
          .eq("learner_id", learner!.id)
          .order("recorded_on", { ascending: true }),
        supabase
          .from("learner_outcomes")
          .select("id, status, mastery_lift, baseline_score, post_score, created_at")
          .eq("learner_id", learner!.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("assessment_sessions")
          .select("id, status, score_pct, submitted_at, created_at")
          .eq("learner_id", learner!.id)
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("interventions")
          .select("id, title, status, target_date, created_at")
          .eq("learner_id", learner!.id)
          .order("created_at", { ascending: false }),
      ]);
      return {
        mastery: mastery.data ?? [],
        outcomes: outcomes.data ?? [],
        sessions: sessions.data ?? [],
        interventions: interventions.data ?? [],
      };
    },
  });

  const consent = consentQuery.data;
  const progress = progressQuery.data;

  const consentRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const steps: OnboardingStep[] = [
    {
      key: "consent",
      title: "Review & record consent",
      description: consent?.hasConsent
        ? "Consent is active — the AI Tutor is unlocked."
        : "Consent unlocks the AI Tutor. Assessments and plans work either way.",
      done: !!consent?.hasConsent,
      action: "scroll-consent",
      ctaLabel: "Review consent",
    },
    {
      key: "progress",
      title: "View progress",
      description: "See live mastery, recent assessment scores and active interventions.",
      done: getOnboardingFlag(stepFlagKey("parent", "progress")),
      action: "scroll-progress",
      ctaLabel: "View progress",
    },
  ];

  const [, forceRender] = useState(0);
  const handleAction = (action: string) => {
    if (action === "scroll-consent") consentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (action === "scroll-progress") {
      setOnboardingFlag(stepFlagKey("parent", "progress"));
      forceRender((n) => n + 1);
      progressRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <>
      <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Parent portal</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}. Follow progress and manage consent — everything here is read-only.
            </p>
          </div>
          <ContextHelp page="/parent" />
        </div>

        <div data-tour="parent-checklist">
          <OnboardingChecklist
            role="parent"
            title="Getting started as a parent"
            description="Two quick steps to set up your family's experience."
            steps={steps}
            tourId="parent-portal"
            onAction={handleAction}
          />
        </div>

        {linksQuery.isError ? (
          <QueryError
            title="We couldn't load your children"
            error={linksQuery.error}
            onRetry={() => void linksQuery.refetch()}
          />
        ) : linksQuery.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : learners.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No linked children yet"
            description="Your account isn't linked to a learner. Ask your tutoring center's admin to link your child to this account."
            hint="Once linked, progress and consent controls appear here automatically."
          />
        ) : (
          <>
            {learners.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {learners.map((l) => (
                  <Button
                    key={l.id}
                    variant={learner?.id === l.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedId(l.id)}
                  >
                    {l.full_name}
                  </Button>
                ))}
              </div>
            )}

            {learner && (
              <div className="space-y-6">
                <div ref={consentRef} data-tour="parent-consent" className="scroll-mt-20">
                  <ConsentCard
                    learnerId={learner.id}
                    learnerName={learner.full_name}
                    consent={consent}
                    isLoading={consentQuery.isLoading}
                    defaultName={profile?.full_name ?? ""}
                    defaultEmail={user?.email ?? ""}
                    onRecorded={() => {
                      void queryClient.invalidateQueries({ queryKey: ["parent-consent", learner.id] });
                    }}
                  />
                </div>

                <div ref={progressRef} data-tour="parent-progress" className="scroll-mt-20 space-y-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <LineChartIcon className="h-4 w-4" /> Mastery
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-semibold">{learner.mastery_score ?? 0}%</p>
                        {learner.mastery_lift !== null && learner.mastery_lift !== 0 && (
                          <Badge variant="secondary" className="mt-1">
                            {learner.mastery_lift > 0 ? "+" : ""}
                            {learner.mastery_lift} lift
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <ClipboardCheck className="h-4 w-4" /> Assessments
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-semibold">
                          {progress?.sessions.filter((s) => s.status === "submitted").length ?? 0}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">submitted</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <HeartHandshake className="h-4 w-4" /> Interventions
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-semibold">
                          {progress?.interventions.filter((i) => i.status === "active" || i.status === "approved").length ?? 0}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">active</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Mastery over time</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {!progress || progress.mastery.length === 0 ? (
                        <EmptyState
                          icon={LineChartIcon}
                          title="No mastery data yet"
                          description="Mastery is recorded when your child completes assessments. Check back after their first diagnostic."
                        />
                      ) : (
                        <div className="h-56">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={progress.mastery.map((m) => ({
                              date: format(new Date(m.recorded_on), "MMM d"),
                              mastery: m.score,
                            }))}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                              <Tooltip />
                              <Line type="monotone" dataKey="mastery" stroke="var(--primary)" strokeWidth={2} dot />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Recent assessments</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {!progress || progress.sessions.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No assessments assigned yet.</p>
                        ) : (
                          progress.sessions.map((s) => (
                            <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
                              <div>
                                <p className="text-sm font-medium">
                                  {s.status === "submitted" ? "Assessment submitted" : "Assessment in progress"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(s.submitted_at ?? s.created_at), "MMM d, yyyy")}
                                </p>
                              </div>
                              {s.score_pct !== null && (
                                <Badge variant={s.score_pct >= 70 ? "default" : "secondary"}>{s.score_pct}%</Badge>
                              )}
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Interventions & outcomes</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {!progress || (progress.interventions.length === 0 && progress.outcomes.length === 0) ? (
                          <p className="text-sm text-muted-foreground">
                            No interventions yet — they appear when gap detection finds an area to strengthen.
                          </p>
                        ) : (
                          <>
                            {progress.interventions.map((i) => (
                              <div key={i.id} className="flex items-center justify-between rounded-lg border p-3">
                                <div>
                                  <p className="text-sm font-medium">{i.title}</p>
                                  {i.target_date && (
                                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <CalendarClock className="h-3 w-3" />
                                      Target {format(new Date(i.target_date), "MMM d, yyyy")}
                                    </p>
                                  )}
                                </div>
                                <Badge variant="outline" className="capitalize">{i.status}</Badge>
                              </div>
                            ))}
                            {progress.outcomes.map((o) => (
                              <div key={o.id} className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/[0.03] p-3">
                                <p className="text-sm font-medium">
                                  Outcome: {o.baseline_score ?? "—"}% →{" "}
                                  {o.post_score !== null ? `${o.post_score}%` : "pending"}
                                </p>
                                {o.mastery_lift !== null && (
                                  <Badge variant="secondary">+{o.mastery_lift} lift</Badge>
                                )}
                              </div>
                            ))}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <GuidedTour tourId="parent-portal" steps={PARENT_TOUR} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Consent card
// ---------------------------------------------------------------------------

interface ConsentCardProps {
  learnerId: string;
  learnerName: string;
  consent:
    | {
        hasConsent: boolean;
        history: {
          id: string;
          parentName: string;
          parentEmail: string;
          consentVersion: string;
          recordedAt: string;
          action: "granted" | "withdrawn";
        }[];
      }
    | undefined;
  isLoading: boolean;
  defaultName: string;
  defaultEmail: string;
  onRecorded: () => void;
}

function ConsentCard({
  learnerId,
  learnerName,
  consent,
  isLoading,
  defaultName,
  defaultEmail,
  onRecorded,
}: ConsentCardProps) {
  const [mobile, setMobile] = useState("");
  const mutation = useMutation({
    mutationFn: () =>
      recordGuardianConsent({
        data: {
          learnerId,
          parentName: defaultName || "Parent / Guardian",
          parentEmail: defaultEmail,
          parentMobile: mobile,
          consentDate: format(new Date(), "yyyy-MM-dd"),
          consentVersion: "v1.0",
        },
      }),
    onSuccess: () => {
      toast.success("Consent recorded — AI Tutor unlocked");
      setMobile("");
      onRecorded();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not record consent"),
  });

  // Withdrawal appends a new event; nothing in the history is removed.
  const withdrawMutation = useMutation({
    mutationFn: () => withdrawGuardianConsent({ data: { learnerId } }),
    onSuccess: () => {
      toast.success("Consent withdrawn — AI Tutor is now locked");
      onRecorded();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not withdraw consent"),
  });

  return (
    <Card className={consent?.hasConsent ? "border-primary/25" : "border-amber-500/40"}>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Guardian consent for {learnerName}
          </CardTitle>
          {consent && (
            <Badge variant={consent.hasConsent ? "default" : "secondary"}>
              {consent.hasConsent ? "Consent active" : "Consent needed"}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Consent unlocks the AI Tutor. Assessments and learning plans are available regardless. Consent history is append-only and never deleted.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <>
            {!consent?.hasConsent && (
              <div className="flex flex-wrap items-end gap-3 rounded-lg border border-dashed p-4">
                <div className="min-w-48 flex-1 space-y-1.5">
                  <Label htmlFor="guardian-mobile" className="text-xs">
                    Your mobile number
                  </Label>
                  <Input
                    id="guardian-mobile"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="+1 555 010 2030"
                  />
                </div>
                <Button
                  disabled={mobile.trim().length < 7 || mutation.isPending}
                  onClick={() => mutation.mutate()}
                >
                  {mutation.isPending ? "Recording…" : "Record consent"}
                </Button>
              </div>
            )}
            {consent?.hasConsent && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
                <p className="min-w-48 flex-1 text-sm text-muted-foreground">
                  You can withdraw consent at any time. The AI Tutor locks immediately; assessments
                  and learning plans keep working, and the consent history is preserved.
                </p>
                <Button
                  variant="outline"
                  disabled={withdrawMutation.isPending}
                  onClick={() => withdrawMutation.mutate()}
                >
                  {withdrawMutation.isPending ? "Withdrawing…" : "Withdraw consent"}
                </Button>
              </div>
            )}
            {consent && consent.history.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Consent history</p>
                {consent.history.map((h) => (
                  <div key={h.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2.5 text-xs">
                    <span className="flex items-center gap-2">
                      <Badge variant={h.action === "withdrawn" ? "secondary" : "outline"}>
                        {h.action === "withdrawn" ? "Withdrawn" : "Granted"}
                      </Badge>
                      {h.parentName} · {h.parentEmail}
                    </span>
                    <span className="text-muted-foreground">
                      {h.consentVersion} · {format(new Date(h.recordedAt), "MMM d, yyyy")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

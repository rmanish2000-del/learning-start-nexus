// Class 10 Diagnostic-to-Conversion — the student's diagnostic journey card.
// Three screen states: before the diagnostic, during it, and the generated
// plan afterwards. Educator wording never appears unless one is assigned.

import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Compass, Play, Sparkles, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { StudyPlanView } from "@/lib/study-plan-shared";

export function StudyPlanCard({
  plan,
  isPending,
  onStart,
  starting,
  onPractise,
  practising,
  tutorConsentMissing,
}: {
  plan: StudyPlanView | undefined;
  isPending: boolean;
  onStart: () => void;
  starting: boolean;
  onPractise: (interventionId: string) => void;
  practising: boolean;
  tutorConsentMissing: boolean;
}) {
  if (isPending) return <Skeleton className="h-44 w-full" />;
  if (!plan || plan.state === "no-learner") return null;

  if (plan.state !== "submitted") {
    const resuming = plan.state === "in-progress" && plan.activeSessionId;
    return (
      <Card className="border-primary/40" data-tour="student-plan">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Compass className="h-4 w-4 text-primary" /> Your diagnostic
          </CardTitle>
          <CardDescription>
            Complete your diagnostic to generate your personalized study plan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            It takes about 20 minutes, progress saves automatically, and your plan — strengths,
            focus areas and the topics to take next — appears here the moment you finish.
          </p>
          {resuming ? (
            <Button asChild>
              <Link to="/session/$sessionId" params={{ sessionId: plan.activeSessionId! }}>
                <Play className="h-4 w-4" /> Resume diagnostic
              </Link>
            </Button>
          ) : (
            <Button onClick={onStart} disabled={starting}>
              <Play className="h-4 w-4" /> {starting ? "Preparing…" : "Start Diagnostic"}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-tour="student-plan">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />{" "}
              {plan.planStatus === "awaiting_educator"
                ? "Awaiting educator assignment"
                : "Your verified study plan is ready."}
            </CardTitle>
            <CardDescription>
              {plan.planStatus === "awaiting_educator"
                ? "Your centre still has to assign an educator. A centre admin has been notified — your gaps and evidence are already saved."
                : "Generated automatically from your diagnostic results, gap analysis and verified CBSE curriculum outcomes."}
            </CardDescription>
          </div>
          {plan.scorePct !== null ? (
            <Badge variant="secondary">Diagnostic score {plan.scorePct}%</Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Strength areas
          </h3>
          {plan.strengths.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No outcome cleared 70% this time — your plan starts from the focus areas below.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {plan.strengths.map((s) => (
                <div key={s.code} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{s.label}</span>
                    <span className="tabular-nums text-muted-foreground">{s.pct}%</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {s.correct} of {s.total} correct
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <Target className="h-4 w-4 text-destructive" /> Focus areas
          </h3>
          {plan.focusAreas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing below 70% — keep practising to hold your mastery.
            </p>
          ) : (
            <div className="space-y-3">
              {plan.focusAreas.map((f) => (
                <div key={f.code} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{f.label}</span>
                    <Badge variant="outline" className="capitalize">
                      {f.severity}
                    </Badge>
                    <span className="ml-auto text-xs tabular-nums text-muted-foreground">{f.pct}%</span>
                  </div>
                  <Progress value={f.pct} className="mt-2 h-1.5" />
                  <p className="mt-2 text-sm text-muted-foreground">{f.activity}</p>
                  {f.gapId ? (
                    <Button size="sm" variant="ghost" className="mt-2 mr-2" asChild>
                      <Link to="/gaps/$gapId" params={{ gapId: f.gapId }}>
                        Open gap detail <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  ) : null}
                  {f.interventionId ? (
                    tutorConsentMissing ? (
                      <Badge
                        variant="outline"
                        className="mt-2 border-amber-500/40 text-amber-600 dark:text-amber-400"
                      >
                        Guardian consent needed for the AI Tutor
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        disabled={practising}
                        onClick={() => onPractise(f.interventionId!)}
                      >
                        Practise this gap with the AI Tutor <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    )
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>

        {plan.nextTopics.length > 0 ? (
          <section className="space-y-2">
            <h3 className="text-sm font-medium">Recommended next topics</h3>
            <ul className="space-y-2">
              {plan.nextTopics.map((n) => (
                <li key={n.code} className="rounded-lg border p-3 text-sm">
                  <p className="font-medium">{n.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{n.reason}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}

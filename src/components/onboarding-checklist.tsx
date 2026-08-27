import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Circle, Compass, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Celebration } from "@/components/celebration";
import {
  celebratedKey,
  celebrationDismissed,
  claimOnboardingModal,
  dismissCelebrationForever,
  getOnboardingFlag,

  releaseOnboardingModal,
  requestTour,
  setOnboardingFlag,
  type OnboardingStep,
} from "@/lib/onboarding";

interface OnboardingChecklistProps {
  role: string;
  title: string;
  description: string;
  steps: OnboardingStep[];
  tourId?: string;
  onAction?: (action: string) => void;
}

export function OnboardingChecklist({
  role,
  title,
  description,
  steps,
  tourId,
  onAction,
}: OnboardingChecklistProps) {
  const doneCount = steps.filter((s) => s.done).length;
  const allDone = steps.length > 0 && doneCount === steps.length;
  const pct = Math.round((doneCount / Math.max(steps.length, 1)) * 100);
  const [celebrating, setCelebrating] = useState(false);

  // The celebration is a *transition* event, not a state. If the checklist is
  // already complete when the page mounts (every return visit and every login),
  // there is nothing to celebrate — this is what made "Onboarding complete!"
  // reappear on each sign-in when the stored flag was missing or cleared.
  const wasCompleteOnMount = useRef<boolean | null>(null);
  if (wasCompleteOnMount.current === null && steps.length > 0) {
    wasCompleteOnMount.current = allDone;
    if (allDone) setOnboardingFlag(celebratedKey(role));
  }

  // Fire the celebration once per role when the final step completes. The
  // completion flag is persisted immediately so a refresh or re-login while
  // the modal is open can never re-trigger it. The modal claim keeps the
  // celebration from stacking on top of the first-login intro — if the
  // intro is showing, we retry until it's dismissed (claim released).
  useEffect(() => {
    if (!allDone || wasCompleteOnMount.current !== false) return;
    if (celebrationDismissed() || getOnboardingFlag(celebratedKey(role))) return;
    setOnboardingFlag(celebratedKey(role));
    let cancelled = false;
    let timer: number | undefined;
    const attempt = () => {
      if (cancelled) return;
      if (!claimOnboardingModal("celebration")) {
        timer = window.setTimeout(attempt, 2500);
        return;
      }
      setCelebrating(true);
    };
    attempt();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [allDone, role]);


  // Every dismiss path (Keep going, X, backdrop, Escape) lands here. The
  // celebration is a one-time event: dismissing it records a permanent
  // `dismissed_at` so it can never reappear on a later login.
  const handleClose = () => {
    setOnboardingFlag(celebratedKey(role));
    dismissCelebrationForever();
    releaseOnboardingModal("celebration");
    setCelebrating(false);
  };


  return (
    <Card className="border-primary/25 bg-primary/[0.03]">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Compass className="h-4 w-4 text-primary" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            {tourId && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => requestTour(tourId)}>
                Replay tour
              </Button>
            )}
            <Badge variant={allDone ? "default" : "secondary"}>
              {doneCount}/{steps.length} complete
            </Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
        <Progress value={pct} className="mt-2 h-1.5" />
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.map((step, i) => (
          <div
            key={step.key}
            className={`flex items-start gap-3 rounded-lg border p-3 ${
              step.done ? "border-primary/20 bg-background" : "border-border bg-background"
            }`}
          >
            {step.done ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            ) : (
              <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground/50" />
            )}
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${step.done ? "text-muted-foreground line-through" : ""}`}>
                {i + 1}. {step.title}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
            </div>
            {!step.done && (
              <div className="shrink-0">
                {step.to ? (
                  <Button asChild size="sm" variant="outline">
                    <Link to={step.to}>{step.ctaLabel ?? "Go"}</Link>
                  </Button>
                ) : step.action ? (
                  <Button size="sm" variant="outline" onClick={() => onAction?.(step.action!)}>
                    {step.ctaLabel ?? "Go"}
                  </Button>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Lock className="h-3 w-3" />
                    {step.blockedHint ?? "Waiting"}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </CardContent>
      <Celebration
        show={celebrating}
        title="Onboarding complete!"
        message="You've finished every getting-started step. This is the only time you'll see this — close it and carry on."

        onClose={handleClose}
      />
    </Card>
  );
}

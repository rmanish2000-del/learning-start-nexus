import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Circle, FlaskConical, Lock, PartyPopper, Rocket } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryError } from "@/components/query-error";
import {
  createSampleWorkspaceFn,
  getCentreSetupFn,
  markReportReviewedFn,
} from "@/lib/centre-setup.functions";

export const CENTRE_SETUP_QUERY_KEY = ["centre-setup"] as const;

/**
 * First-login setup checklist for centre admins. Step state is computed on the
 * server from live organization data; this component never stores progress
 * in the browser.
 */
export function CentreSetupChecklist() {
  const queryClient = useQueryClient();
  const fetchSetup = useServerFn(getCentreSetupFn);
  const createSample = useServerFn(createSampleWorkspaceFn);
  const markReviewed = useServerFn(markReportReviewedFn);

  const query = useQuery({ queryKey: CENTRE_SETUP_QUERY_KEY, queryFn: () => fetchSetup() });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: CENTRE_SETUP_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: ["learners"] });
    void queryClient.invalidateQueries({ queryKey: ["session-count"] });
  };

  const sampleMutation = useMutation({
    mutationFn: () => createSample(),
    onSuccess: (r) => {
      toast.success(`Sample workspace loaded — ${r.learners} learners, ${r.assessments} assessments. Everything is labelled SAMPLE.`);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reviewedMutation = useMutation({
    mutationFn: () => markReviewed(),
    onSuccess: () => {
      toast.success("First report reviewed — setup step complete.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (query.isPending) {
    return (
      <Card aria-busy="true" aria-label="Loading setup checklist">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="mt-2 h-4 w-72" />
          <Skeleton className="mt-3 h-1.5 w-full" />
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (query.isError) {
    return (
      <QueryError
        title="Setup checklist couldn't load"
        error={query.error}
        onRetry={() => query.refetch()}
      />
    );
  }

  const state = query.data;
  const pct = Math.round((state.doneCount / Math.max(state.steps.length, 1)) * 100);

  if (state.complete) {
    return (
      <Card className="border-primary/25 bg-primary/[0.03]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <PartyPopper className="h-4 w-4 text-primary" /> Setup complete
          </CardTitle>
          <CardDescription>
            Every first-login step is done. Quick Start has left your main navigation; you can
            always come back here from Support.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link to="/dashboard">Open dashboard</Link>
          </Button>
          {state.sampleActive && (
            <Button asChild size="sm" variant="outline">
              <Link to="/settings">Remove sample workspace</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/25 bg-primary/[0.03]">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Rocket className="h-4 w-4 text-primary" /> Welcome to EduOS — your centre is approved
          </CardTitle>
          <Badge variant="secondary">
            {state.doneCount}/{state.steps.length} complete
          </Badge>
        </div>
        <CardDescription>
          Six steps from approval to your first report. Progress is saved on the server, so it
          follows you across devices.
        </CardDescription>
        <Progress value={pct} className="mt-2 h-1.5" aria-label={`${pct}% of setup complete`} />
      </CardHeader>
      <CardContent className="space-y-2">
        {state.sampleActive && (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
            <span className="font-semibold">SAMPLE workspace active</span> — {state.sampleLearnerCount} generated
            learners are labelled SAMPLE on every screen and are excluded from reports, billing and
            evidence. Remove them any time from Settings.
          </p>
        )}
        {state.steps.map((step) => (
          <div
            key={step.key}
            className="flex items-start gap-3 rounded-lg border border-border bg-background p-3"
          >
            {step.done ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            ) : (
              <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground/50" aria-hidden="true" />
            )}
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${step.done ? "text-muted-foreground line-through" : ""}`}>
                {step.n}. {step.title}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
              {!step.done && step.sampleOption && !state.sampleActive && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <Link to={step.to}>{step.ctaLabel}</Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={sampleMutation.isPending}
                    onClick={() => sampleMutation.mutate()}
                  >
                    <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
                    {sampleMutation.isPending ? "Loading sample…" : "Explore with sample workspace"}
                  </Button>
                </div>
              )}
              {!step.done && step.key === "review-report" && !step.blockedHint && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <Link to={step.to}>{step.ctaLabel}</Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={reviewedMutation.isPending}
                    onClick={() => reviewedMutation.mutate()}
                  >
                    {reviewedMutation.isPending ? "Saving…" : "Mark as reviewed"}
                  </Button>
                </div>
              )}
            </div>
            {!step.done && !step.sampleOption && step.key !== "review-report" && (
              <div className="shrink-0">
                {step.blockedHint ? (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Lock className="h-3 w-3" aria-hidden="true" />
                    {step.blockedHint}
                  </span>
                ) : (
                  <Button asChild size="sm" variant="outline">
                    <Link to={step.to}>{step.ctaLabel}</Link>
                  </Button>
                )}
              </div>
            )}
            {!step.done && step.key === "review-report" && step.blockedHint && (
              <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" aria-hidden="true" />
                {step.blockedHint}
              </span>
            )}
            {!step.done && step.sampleOption && state.sampleActive && (
              <Button asChild size="sm" variant="outline" className="shrink-0">
                <Link to={step.to}>{step.ctaLabel}</Link>
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// Gap-Closure Loop — the gap detail view every "Open" action lands on.
// Shows outcome, diagnostic evidence, learner answer, expected answer,
// explanation, severity, mastery, source diagnostic, recommendation,
// next action and lifecycle stage, scoped by the caller's role.

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, GraduationCap, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { QueryError } from "@/components/query-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getGapDetail } from "@/lib/gap-detail.functions";
import { STAGE_LABELS } from "@/lib/learner-mode";
import { startTutorSession } from "@/lib/tutor.functions";
import { useI18n } from "@/lib/i18n/context";

export const Route = createFileRoute("/_authenticated/gaps/$gapId")({
  head: () => ({
    meta: [
      { title: "Gap detail — EduOS" },
      { name: "description", content: "Evidence, recommended intervention and next action for a detected learning gap." },
      { property: "og:title", content: "Gap detail — EduOS" },
      { property: "og:description", content: "Evidence, recommended intervention and next action for a detected learning gap." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GapDetailPage,
});

function GapDetailPage() {
  const { gapId } = Route.useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const fetchDetail = useServerFn(getGapDetail);
  const launchTutor = useServerFn(startTutorSession);

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["gap-detail", gapId],
    queryFn: () => fetchDetail({ data: { gapId } }),
    retry: false,
  });

  const tutorMutation = useMutation({
    mutationFn: (interventionId: string) => launchTutor({ data: { interventionId } }),
    onSuccess: (result: { sessionId: string }) =>
      void navigate({ to: "/tutor/$sessionId", params: { sessionId: result.sessionId } }),
    onError: (e: Error) => toast.error(e.message),
  });

  if (isPending) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-3xl">
        <QueryError
          title={t("gap.detail.blocked", "We can't open this gap")}
          error={error as Error}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  const learnerFacing = data.viewerRole === "learner" || data.viewerRole === "parent";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="..">
          <ArrowLeft className="mr-1 h-4 w-4" />
          {t("common.back", "Back")}
        </Link>
      </Button>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={data.severity === "high" ? "destructive" : "secondary"}>
            {data.severity === "high"
              ? t("gap.severity.high", "High priority")
              : t("gap.severity.medium", "Medium priority")}
          </Badge>
          <Badge variant="outline">{STAGE_LABELS[data.stage]}</Badge>
          <Badge variant="outline">
            {data.learnerMode === "direct_parent"
              ? t("learner.mode.direct", "Direct learner")
              : t("learner.mode.centre", "Centre learner")}
          </Badge>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{data.concept}</h1>
        <p className="text-sm text-muted-foreground">
          {data.learnerName} · {data.masteryPct}% ({data.itemsCorrect}/{data.itemsTotal}) ·{" "}
          <span className="font-mono text-xs">{data.outcomeCode}</span>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("gap.next", "Next action")}</CardTitle>
          <CardDescription>{data.nextAction.hint}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {data.nextAction.kind === "wait" ? (
            <Badge variant="secondary">{data.nextAction.label}</Badge>
          ) : data.intervention && data.viewerRole === "learner" ? (
            <Button
              onClick={() => tutorMutation.mutate(data.intervention!.id)}
              disabled={tutorMutation.isPending}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {t("gap.tutor.practise", "Practise this gap with the AI Tutor")}
            </Button>
          ) : (
            <Badge variant="outline">{data.nextAction.label}</Badge>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("gap.evidence", "Diagnostic evidence")}</CardTitle>
          <CardDescription>
            {data.sourceAssessmentTitle ?? t("gap.evidence.source", "Source diagnostic")}
            {data.detectedAt ? ` · ${data.detectedAt.slice(0, 10)}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.evidence.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t("gap.evidence.none", "No item-level evidence was stored for this gap.")}
            </p>
          )}
          {data.evidence.map((item, index) => (
            <div key={`${item.itemId}-${index}`} className="rounded-lg border p-4 text-sm">
              {item.prompt && <p className="font-medium">{item.prompt}</p>}
              <dl className="mt-2 grid gap-1 text-muted-foreground sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-wide">{t("gap.answer.learner", "Learner answer")}</dt>
                  <dd className="text-foreground">{item.learnerAnswer}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide">{t("gap.answer.expected", "Expected answer")}</dt>
                  <dd className="text-foreground">{item.expectedAnswer}</dd>
                </div>
              </dl>
              {item.explanation && <p className="mt-2 text-muted-foreground">{item.explanation}</p>}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("gap.intervention", "Recommended intervention")}
          </CardTitle>
          <CardDescription>
            {learnerFacing
              ? t("gap.intervention.learner", "What to work on to close this gap.")
              : t("gap.intervention.staff", "Deterministic recommendation from the rule book.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="font-medium">
            {data.intervention?.title ??
              data.recommendation?.title ??
              t("gap.intervention.pending", "Being prepared")}
          </p>
          <p className="text-muted-foreground">
            {data.intervention?.activity ??
              data.recommendation?.activity ??
              t(
                "gap.intervention.pendingBody",
                "Your study plan is being prepared — this fills in as soon as it is generated.",
              )}
          </p>
          {data.recommendation?.rationale && !learnerFacing && (
            <p className="text-xs text-muted-foreground">{data.recommendation.rationale}</p>
          )}
          {!learnerFacing && (
            <p className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
              <GraduationCap className="h-3.5 w-3.5" />
              {data.learnerMode === "direct_parent"
                ? t("gap.mode.directNote", "Direct learner — no educator approval is required.")
                : t("gap.mode.centreNote", "Centre learner — educator review applies before release.")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

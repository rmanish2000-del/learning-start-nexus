import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, ArrowRight, CheckCircle2, Printer, Share2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { BandPill, DiagnosticShell } from "@/components/diagnostic-shell";
import { QueryError } from "@/components/query-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchDiagnosticReport } from "@/lib/parent-diagnostic.functions";
import {
  BAND_LABELS,
  BAND_ORDER,
  CHAPTER_GROUP_MARKS,
  closureProjection,
  formatInr,
  upgradeTrigger,
  type MasteryBand,
} from "@/lib/parent-diagnostic-shared";

const TITLE = "Diagnostic report | EduOS";
const DESCRIPTION =
  "Outcome-level mastery bands, the ranked gaps with marks at risk, and the intervention mapped to each one.";

export const Route = createFileRoute("/diagnostic/report/$token")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DiagnosticReportPage,
});

function DiagnosticReportPage() {
  const { token } = Route.useParams();
  const reportFn = useServerFn(fetchDiagnosticReport);
  const query = useQuery({
    queryKey: ["diagnostic-report", token],
    queryFn: () => reportFn({ data: { token } }),
  });

  const view = query.data;

  if (query.isLoading) {
    return (
      <DiagnosticShell wide>
        <Skeleton className="h-80 w-full" />
      </DiagnosticShell>
    );
  }
  if (query.isError || !view) {
    return (
      <DiagnosticShell wide>
        <QueryError title="This report link is not valid" error={query.error} onRetry={() => void query.refetch()} />
      </DiagnosticShell>
    );
  }

  if (!view.submitted || !view.report) {
    return (
      <DiagnosticShell wide>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">The diagnostic is not finished yet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>Progress is saved. Pick up where {view.childFirstName} left off and the report appears here.</p>
            <Button asChild>
              <Link to="/diagnostic/session/$token" params={{ token }}>
                Resume the diagnostic <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </DiagnosticShell>
    );
  }

  const report = view.report;
  const trigger = upgradeTrigger(report);
  const projection = closureProjection();
  const secureCount = report.secureOutcomes.length;

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: "EduOS diagnostic report", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Report link copied.");
    } catch {
      toast.error("Could not share the link.");
    }
  }

  return (
    <DiagnosticShell wide footerNote={`${view.subject} · ${view.unitTitle}`}>
      <section className="space-y-3">
        <Badge variant="secondary">
          {view.order.board ?? "CBSE"} Class {view.order.grade ?? 10} · {view.subject} · {view.unitTitle}
        </Badge>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {view.childFirstName} is Secure or better on {secureCount} of {report.outcomes.length} outcomes in{" "}
          {view.unitTitle}.
        </h1>
        <p className="text-sm text-muted-foreground">
          Scored server-side against {report.outcomes.length} CBSE learning outcomes across {report.totalQuestions}{" "}
          questions. {report.correctQuestions} correct.
        </p>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Download / print
          </Button>
          <Button variant="outline" size="sm" onClick={share}>
            <Share2 className="mr-2 h-4 w-4" /> Share report
          </Button>
        </div>
      </section>

      <section className="mt-8 grid gap-3 sm:grid-cols-4">
        {BAND_ORDER.map((band) => (
          <Card key={band}>
            <CardContent className="space-y-1 pt-6">
              <p className="text-2xl font-semibold tracking-tight">{report.bandCounts[band as MasteryBand]}</p>
              <BandPill band={band} suffix="outcomes" />
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mt-10 space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <h2 className="text-xl font-semibold tracking-tight">
            The gaps, ranked ({report.gaps.length})
          </h2>
        </div>
        {report.gaps.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No outcome fell below 70%. Nothing in this chapter group needs remediation right now.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Ranked by board weight × severity. Roughly {report.marksAtRiskTotal} of the ~{CHAPTER_GROUP_MARKS} marks
              this chapter group typically carries sit behind these outcomes — an estimate from blueprint weights, not a
              prediction.
            </p>
            <div className="space-y-3">
              {report.gaps.map((gap, i) => (
                <Card key={gap.outcomeId}>
                  <CardHeader className="space-y-2 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">#{i + 1}</Badge>
                      <span className="text-xs font-medium text-muted-foreground">{gap.code}</span>
                      <BandPill band={gap.band} suffix={`${gap.pct}%`} />
                      <span className="ml-auto text-xs text-muted-foreground">
                        ~{gap.marksAtRisk} marks at risk
                      </span>
                    </div>
                    <CardTitle className="text-base leading-relaxed">{gap.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <p className="text-muted-foreground">
                      Missed {gap.questionsMissed} of {gap.questionsTotal} questions on this outcome. Severity:{" "}
                      {gap.severity}.
                    </p>
                    <Progress value={gap.pct} />
                    <div className="rounded-md border bg-muted/40 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Where to start
                      </p>
                      <p className="mt-1">{gap.intervention}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="mt-10 space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <h2 className="text-xl font-semibold tracking-tight">What good already looks like</h2>
        </div>
        {report.secureOutcomes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No outcome cleared 70% in this attempt. The plan starts from the highest-weight gap above.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {report.secureOutcomes.map((o) => (
              <div key={o.outcomeId} className="flex items-start gap-3 rounded-md border p-3 text-sm">
                <BandPill band={o.band} suffix={`${o.pct}%`} />
                <span className="text-muted-foreground">
                  <span className="font-medium text-foreground">{o.code}</span> — {o.title}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" /> The {projection.weeks}-week closure projection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              For the gaps above, the loop runs: targeted intervention → AI Tutor practice scoped to that outcome →
              reassessment on <em>fresh</em> items the diagnostic never showed.
            </p>
            <p>
              Cohorts in our pilot typically move {projection.liftLow}–{projection.liftHigh} points of mastery on the
              outcomes they work through in {projection.weeks} weeks. This is a projection based on pilot medians, not a
              promise about {view.childFirstName}.
            </p>
          </CardContent>
        </Card>
      </section>

      {trigger.show ? (
        <section className="mt-10 print:hidden">
          <Card className="border-primary/40">
            <CardHeader>
              <CardTitle className="text-lg">{trigger.headline}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-baseline gap-3">
                {view.offer.creditApplied ? (
                  <>
                    <span className="text-sm text-muted-foreground line-through">
                      {formatInr(view.offer.listPaise)}
                    </span>
                    <span className="text-3xl font-semibold tracking-tight">
                      {formatInr(view.offer.firstInvoicePaise)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      for year one · {formatInr(view.offer.creditPaise)} diagnostic credit applied ·{" "}
                      {view.offer.daysLeft} days left
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-3xl font-semibold tracking-tight">{formatInr(view.offer.listPaise)}</span>
                    <span className="text-sm text-muted-foreground">per year</span>
                  </>
                )}
              </div>
              <Separator />
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Unlimited diagnostics and reassessments on fresh items, all subjects for the grade.</li>
                <li>AI Tutor, unlimited, scoped to the approved interventions for these outcomes.</li>
                <li>Fortnightly parent report — gaps detected, gaps closed, mastery lift, tutor minutes.</li>
              </ul>
              {view.planPurchased ? (
                <Badge variant="secondary">Board Success Plan active — {view.planOrderRef}</Badge>
              ) : (
                <Button size="lg" asChild>
                  <Link to="/upgrade/$token" params={{ token }}>
                    {report.gaps.length > 0
                      ? `Close these ${report.gaps.length} gaps — ${formatInr(view.offer.firstInvoicePaise)}`
                      : `See the Board Success Plan — ${formatInr(view.offer.firstInvoicePaise)}`}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                This report stays available on your link whether or not you upgrade.
              </p>
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section className="mt-10 space-y-2 text-xs text-muted-foreground">
        <p>
          Bands: {BAND_ORDER.map((b) => `${BAND_LABELS[b]}`).join(" · ")}. Weak below 40%, Developing 40–59%, Secure
          60–79%, Strong 80%+. An outcome under 70% is treated as a gap — the same threshold our centres use, so these
          numbers match the ones inside the platform.
        </p>
      </section>
    </DiagnosticShell>
  );
}

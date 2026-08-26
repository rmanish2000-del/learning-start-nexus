import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { Building2, HeartHandshake, Printer, School, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { QueryError } from "@/components/query-error";
import {
  METRIC_FORMULAS,
  fmtDays,
  fmtLift,
  fmtPct,
  type OutcomeMetrics,
  type SegmentMetrics,
} from "@/lib/outcome-dashboard-shared";
import {
  getCentreOutcomeView,
  getParentOutcomeView,
  getSchoolOutcomeView,
} from "@/lib/outcome-dashboard.functions";

export const Route = createFileRoute("/_authenticated/outcome-proof")({
  head: () => ({
    meta: [
      { title: "Outcome Proof Dashboard — EduOS" },
      {
        name: "description",
        content:
          "Executive outcome proof for school leaders, centre educators and parents: gap closure rate, mastery lift, reassessment success and time to close.",
      },
      { property: "og:title", content: "Outcome Proof Dashboard — EduOS" },
      {
        property: "og:description",
        content:
          "Gap closure rate, mastery lift, reassessment success and time to close across school, centre and parent views.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OutcomeProofPage,
});

const authRoute = getRouteApi("/_authenticated");

function MetricCards({ metrics }: { metrics: OutcomeMetrics }) {
  const cards = [
    {
      label: "Gap Closure Rate",
      value: fmtPct(metrics.gapClosureRatePct),
      detail: `${metrics.gapsClosed} of ${metrics.gapsTotal} detected gaps resolved`,
      progress: metrics.gapClosureRatePct,
    },
    {
      label: "Mastery Lift",
      value: fmtLift(metrics.masteryLiftAvg),
      detail: `Average across ${metrics.masteryLiftLearners} learner${metrics.masteryLiftLearners === 1 ? "" : "s"} with a measured outcome`,
      progress: metrics.masteryLiftAvg === null ? null : Math.max(0, Math.min(100, metrics.masteryLiftAvg)),
    },
    {
      label: "Reassessment Success",
      value: fmtPct(metrics.reassessmentSuccessRatePct),
      detail: `${metrics.reassessmentsSuccessful} of ${metrics.reassessmentsMeasured} reassessments showed improvement`,
      progress: metrics.reassessmentSuccessRatePct,
    },
    {
      label: "Time To Close",
      value: fmtDays(metrics.timeToCloseAvgDays),
      detail:
        metrics.timeToCloseSamples === 0
          ? "No closed outcomes yet"
          : `Median ${fmtDays(metrics.timeToCloseMedianDays)} · ${metrics.timeToCloseSamples} closed outcome${metrics.timeToCloseSamples === 1 ? "" : "s"}`,
      progress: null,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader className="pb-2">
            <CardDescription className="text-[11px] font-medium uppercase tracking-wide">
              {card.label}
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums">{card.value}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {card.progress !== null ? <Progress value={card.progress} className="h-1.5" /> : null}
            <p className="text-xs text-muted-foreground">{card.detail}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SegmentTable({
  segments,
  firstColumn,
}: {
  segments: SegmentMetrics[];
  firstColumn: string;
}) {
  if (segments.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing to report yet.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{firstColumn}</TableHead>
          <TableHead className="text-right">Gap closure</TableHead>
          <TableHead className="text-right">Mastery lift</TableHead>
          <TableHead className="text-right">Reassessment success</TableHead>
          <TableHead className="text-right">Time to close</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {segments.map((segment) => (
          <TableRow key={segment.id}>
            <TableCell>
              <span className="font-medium">{segment.name}</span>
              {segment.subtitle ? (
                <span className="block text-xs text-muted-foreground">{segment.subtitle}</span>
              ) : null}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {fmtPct(segment.metrics.gapClosureRatePct)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {fmtLift(segment.metrics.masteryLiftAvg)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {fmtPct(segment.metrics.reassessmentSuccessRatePct)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {fmtDays(segment.metrics.timeToCloseAvgDays)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function SchoolView() {
  const fetchSchool = useServerFn(getSchoolOutcomeView);
  const query = useQuery({
    queryKey: ["outcome-proof", "school"],
    queryFn: () => fetchSchool(),
    throwOnError: false,
  });

  if (query.isError) {
    return <QueryError title="School view didn't load" error={query.error} onRetry={() => query.refetch()} />;
  }
  if (!query.data) return <p className="text-sm text-muted-foreground">Loading school outcomes…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="secondary">{query.data.orgName}</Badge>
        <span>
          {query.data.totals.learners} learner{query.data.totals.learners === 1 ? "" : "s"} · {query.data.totals.outcomesPending} outcomes awaiting
          reassessment
        </span>
      </div>
      <MetricCards metrics={query.data.totals} />
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Performance by centre</CardTitle>
          <CardDescription>
            Each centre is an educator cohort. Compare closure and lift to spot where support is
            working and where it isn't.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SegmentTable segments={query.data.centres} firstColumn="Centre" />
        </CardContent>
      </Card>
    </div>
  );
}

function CentreView() {
  const [centreId, setCentreId] = useState<string | null>(null);
  const fetchCentre = useServerFn(getCentreOutcomeView);
  const query = useQuery({
    queryKey: ["outcome-proof", "centre", centreId],
    queryFn: () => fetchCentre({ data: { centreId } }),
    throwOnError: false,
  });

  if (query.isError) {
    return <QueryError title="Centre view didn't load" error={query.error} onRetry={() => query.refetch()} />;
  }
  if (!query.data) return <p className="text-sm text-muted-foreground">Loading centre outcomes…</p>;

  const data = query.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          {...(data.selectedCentreId ? { value: data.selectedCentreId } : {})}
          onValueChange={(value) => setCentreId(value)}
        >
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Select a centre" />
          </SelectTrigger>
          <SelectContent>
            {data.centres.map((centre) => (
              <SelectItem key={centre.id} value={centre.id}>
                {centre.name} ({centre.learnerCount})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {data.totals.learners} learner{data.totals.learners === 1 ? "" : "s"} · {data.totals.outcomesPending} awaiting reassessment
        </span>
      </div>
      <MetricCards metrics={data.totals} />
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Learners in {data.centreName}</CardTitle>
          <CardDescription>
            Learner-level proof behind the centre totals — every figure traces back to a diagnostic,
            an intervention and a reassessment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SegmentTable segments={data.learners} firstColumn="Learner" />
        </CardContent>
      </Card>
    </div>
  );
}

function ParentView() {
  const fetchParent = useServerFn(getParentOutcomeView);
  const query = useQuery({
    queryKey: ["outcome-proof", "parent"],
    queryFn: () => fetchParent(),
    throwOnError: false,
  });

  if (query.isError) {
    return <QueryError title="Parent view didn't load" error={query.error} onRetry={() => query.refetch()} />;
  }
  if (!query.data) return <p className="text-sm text-muted-foreground">Loading your child's progress…</p>;

  if (query.data.children.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">No child linked yet</CardTitle>
          <CardDescription>
            Once your centre links your account to your child, their progress proof appears here.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {query.data.children.map((child) => (
        <div key={child.id} className="space-y-3">
          <div className="flex flex-wrap items-baseline gap-2">
            <h3 className="text-base font-semibold tracking-tight">{child.name}</h3>
            <span className="text-xs text-muted-foreground">
              {child.subtitle}
              {child.educatorName ? ` · Educator: ${child.educatorName}` : ""}
            </span>
          </div>
          <MetricCards metrics={child.metrics} />
          <p className="text-xs text-muted-foreground">
            {child.metrics.gapsClosed} of {child.metrics.gapsTotal} learning gaps closed
            {child.metrics.outcomesPending > 0
              ? ` · ${child.metrics.outcomesPending} reassessment${child.metrics.outcomesPending === 1 ? "" : "s"} still to come`
              : ""}
            .
          </p>
        </div>
      ))}
    </div>
  );
}

function OutcomeProofPage() {
  const { role } = authRoute.useRouteContext();
  const canSeeSchool = role === "admin" || role === "reviewer";
  const canSeeCentre = role === "admin" || role === "educator" || role === "reviewer";
  const canSeeParent = role === "parent" || role === "admin";
  const defaultTab = canSeeSchool ? "school" : canSeeCentre ? "centre" : "parent";

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <TrendingUp className="h-5 w-5 text-primary" /> Outcome Proof Dashboard
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Executive proof that the learning loop works: gap closure rate, mastery lift,
            reassessment success and time to close — read live from your organization's data.
          </p>
        </div>
        <Button className="print:hidden" size="sm" variant="outline" onClick={() => window.print()}>
          <Printer /> Print / Save PDF
        </Button>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="print:hidden">
          {canSeeSchool ? (
            <TabsTrigger value="school">
              <School className="mr-1.5 h-4 w-4" /> School
            </TabsTrigger>
          ) : null}
          {canSeeCentre ? (
            <TabsTrigger value="centre">
              <Building2 className="mr-1.5 h-4 w-4" /> Centre
            </TabsTrigger>
          ) : null}
          {canSeeParent ? (
            <TabsTrigger value="parent">
              <HeartHandshake className="mr-1.5 h-4 w-4" /> Parent
            </TabsTrigger>
          ) : null}
        </TabsList>

        {canSeeSchool ? (
          <TabsContent value="school" className="mt-4">
            <SchoolView />
          </TabsContent>
        ) : null}
        {canSeeCentre ? (
          <TabsContent value="centre" className="mt-4">
            <CentreView />
          </TabsContent>
        ) : null}
        {canSeeParent ? (
          <TabsContent value="parent" className="mt-4">
            <ParentView />
          </TabsContent>
        ) : null}
      </Tabs>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">How each metric is calculated</CardTitle>
          <CardDescription>
            Same formulas across every view, so school, centre and parent numbers reconcile.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {METRIC_FORMULAS.map((row) => (
            <div key={row.metric} className="flex flex-wrap gap-x-2 text-sm">
              <span className="font-medium">{row.metric}:</span>
              <span className="text-muted-foreground">{row.formula}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

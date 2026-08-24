import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  GitBranch,
  Heart,
  ListOrdered,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Mono, fmt } from "@/components/audit-shared";
import { getGapAnalysisFn, getGapBooksFn, getGapSessionsFn } from "@/lib/gap.functions";
import {
  CATEGORY_RULES,
  GAP_CATEGORY_LABELS,
  LEARNER_VIEW_COPY,
  RISK_LABELS,
  RISK_RULES,
  SCORING_RULES,
  type GapAnalysis,
  type GapCategory,
  type OutcomeAnalysis,
  type RiskLevel,
} from "@/lib/gap-shared";
import { BLOOM_LABELS } from "@/lib/blueprint-shared";

export const Route = createFileRoute("/_authenticated/gap-analysis")({
  head: () => ({
    meta: [
      { title: "Gap Analysis — EduOS" },
      {
        name: "description",
        content:
          "Curriculum-aware gap detection: submitted diagnostics scored per assessment outcome, mapped to mastery bands, risk levels, and intervention recommendations — fully deterministic.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: GapAnalysisPage,
});

const CATEGORY_BADGE: Record<GapCategory, string> = {
  weak: "border-destructive/40 bg-destructive/10 text-destructive",
  medium: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  strong: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

const RISK_BADGE: Record<RiskLevel, string> = {
  high: "border-destructive/40 bg-destructive/10 text-destructive",
  medium: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  low: "",
};

function CategoryBadge({ category }: { category: GapCategory }) {
  return (
    <Badge variant="outline" className={CATEGORY_BADGE[category]}>
      {GAP_CATEGORY_LABELS[category]}
    </Badge>
  );
}

function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <Badge variant="outline" className={RISK_BADGE[level]}>
      {RISK_LABELS[level]} risk
    </Badge>
  );
}

function BandBadge({ label, color }: { label: string | null; color: string | null }) {
  if (!label) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <Badge
      variant="outline"
      style={color ? { borderColor: color, color } : undefined}
    >
      {label}
    </Badge>
  );
}

function OutcomeRow({ row }: { row: OutcomeAnalysis }) {
  return (
    <TableRow>
      <TableCell>
        <p className="font-mono text-xs">{row.code}</p>
        <p className="max-w-56 text-xs text-muted-foreground">{row.title}</p>
      </TableCell>
      <TableCell className="text-xs tabular-nums">
        {row.questionsCorrect}/{row.questionsTotal}
        <span className="block text-[10px] text-muted-foreground">
          {row.pointsEarned}/{row.pointsTotal} pts
        </span>
      </TableCell>
      <TableCell className="text-xs font-medium tabular-nums">
        {row.pct === null ? "—" : `${row.pct}%`}
      </TableCell>
      <TableCell>
        <BandBadge label={row.bandLabel} color={row.bandColor} />
      </TableCell>
      <TableCell>
        <CategoryBadge category={row.gapCategory} />
      </TableCell>
      <TableCell>
        <RiskBadge level={row.riskLevel} />
        <span className="block text-[10px] text-muted-foreground">
          score {row.riskScore} ({row.weight} × d{row.difficulty})
        </span>
      </TableCell>
      <TableCell className="max-w-64">
        {row.interventions.length === 0 ? (
          <span className="text-xs text-muted-foreground">No mapping</span>
        ) : (
          <div className="space-y-1">
            {row.interventions.slice(0, 2).map((iv, i) => (
              <p key={i} className="text-xs">
                <span className="text-muted-foreground">{iv.failurePattern} → </span>
                {iv.recommendedIntervention}
              </p>
            ))}
            {row.interventions.length > 2 && (
              <p className="text-[10px] text-muted-foreground">
                +{row.interventions.length - 2} more mappings
              </p>
            )}
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

function AnalysisDashboard({ analysis }: { analysis: GapAnalysis }) {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" />
            {analysis.learner.fullName} — {analysis.session.assessmentTitle}
          </CardTitle>
          <CardDescription>
            Submitted {analysis.session.submittedAt ? fmt(analysis.session.submittedAt) : "—"} ·{" "}
            {analysis.book.title}
            {analysis.book.board ? ` (${analysis.book.board})` : ""} · Grade {analysis.book.grade}{" "}
            {analysis.book.subject}
            {analysis.unit ? ` · Unit: ${analysis.unit.title}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-sm tabular-nums">
              Overall {analysis.totals.correct}/{analysis.totals.questions} ·{" "}
              {analysis.totals.scorePct}%
            </Badge>
            <BandBadge label={analysis.totals.bandLabel} color={analysis.totals.bandColor} />
            <Badge variant="outline" className={CATEGORY_BADGE.weak}>
              {analysis.counts.weak} weak
            </Badge>
            <Badge variant="outline" className={CATEGORY_BADGE.medium}>
              {analysis.counts.medium} medium
            </Badge>
            <Badge variant="outline" className={CATEGORY_BADGE.strong}>
              {analysis.counts.strong} strong
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Read-only analysis — no interventions are assigned and no mastery is changed here. To
            act on a recommendation, use the{" "}
            <Link to="/interventions" className="underline">
              Interventions board
            </Link>
            .
          </p>
        </CardContent>
      </Card>

      {/* Outcome table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-primary" />
            Outcome-level scoring
          </CardTitle>
          <CardDescription>
            Each mapped assessment outcome scored from the submitted answers, ordered weak first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Outcome</TableHead>
                <TableHead>Raw score</TableHead>
                <TableHead>%</TableHead>
                <TableHead>Mastery level</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Intervention recommendation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analysis.rows.map((row) => (
                <OutcomeRow key={row.outcomeId} row={row} />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Curriculum traceability */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GitBranch className="h-4 w-4 text-primary" />
            Curriculum traceability
          </CardTitle>
          <CardDescription>
            Every gap traces back through the curriculum: Gap → Outcome → Learning Outcome → Topic
            → Chapter → Unit.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {analysis.rows.map((row) => (
            <div key={row.outcomeId} className="rounded-lg border p-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <Mono>{row.code}</Mono>
                <CategoryBadge category={row.gapCategory} />
                <RiskBadge level={row.riskLevel} />
              </div>
              {row.traces.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  No curriculum mapping recorded for this outcome.
                </p>
              ) : (
                <div className="mt-2 space-y-1.5">
                  {row.traces.map((t) => (
                    <p key={t.learningOutcomeId} className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{t.unitTitle}</span>
                      {" › "}
                      {t.chapterTitle}
                      {" › "}
                      {t.topicTitle}
                      {" › "}
                      <span className="italic">{t.learningOutcomeText}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Learner view */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Learner view — {analysis.learner.fullName.split(" ")[0]}'s summary
          </CardTitle>
          <CardDescription>
            The same analysis in student-friendly language, ready to share.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              {LEARNER_VIEW_COPY.strengthsTitle}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{LEARNER_VIEW_COPY.strengthsHint}</p>
            <ul className="mt-2 space-y-1">
              {analysis.learnerView.strengths.length === 0 ? (
                <li className="text-xs text-muted-foreground">Nothing here yet — that's okay!</li>
              ) : (
                analysis.learnerView.strengths.map((s) => (
                  <li key={s} className="text-xs">
                    {s}
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              {LEARNER_VIEW_COPY.growthTitle}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{LEARNER_VIEW_COPY.growthHint}</p>
            <ul className="mt-2 space-y-1">
              {analysis.learnerView.growthAreas.length === 0 ? (
                <li className="text-xs text-muted-foreground">No growth areas in this diagnostic.</li>
              ) : (
                analysis.learnerView.growthAreas.map((s) => (
                  <li key={s} className="text-xs">
                    {s}
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Heart className="h-4 w-4 text-destructive" />
              {LEARNER_VIEW_COPY.priorityTitle}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{LEARNER_VIEW_COPY.priorityHint}</p>
            <ul className="mt-2 space-y-1">
              {analysis.learnerView.priorityAreas.length === 0 ? (
                <li className="text-xs text-muted-foreground">No priority areas — great work!</li>
              ) : (
                analysis.learnerView.priorityAreas.map((s) => (
                  <li key={s} className="text-xs">
                    {s}
                  </li>
                ))
              )}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Deterministic rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListOrdered className="h-4 w-4 text-primary" />
            How this analysis is computed
          </CardTitle>
          <CardDescription>
            Fully deterministic — no AI, no randomness. The audit center re-runs these exact rules.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Scoring
            </p>
            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
              {SCORING_RULES.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Weak / Medium / Strong
            </p>
            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
              {CATEGORY_RULES.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Risk levels
            </p>
            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
              {RISK_RULES.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function GapAnalysisPage() {
  const [bookId, setBookId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const booksQuery = useQuery({ queryKey: ["gap-books"], queryFn: () => getGapBooksFn() });
  const books = booksQuery.data ?? [];
  const activeBookId = bookId ?? books[0]?.id ?? null;

  const sessionsQuery = useQuery({
    queryKey: ["gap-sessions", activeBookId],
    queryFn: () => getGapSessionsFn({ data: { bookId: activeBookId! } }),
    enabled: activeBookId !== null,
  });
  const sessions = sessionsQuery.data?.sessions ?? [];

  const analysisQuery = useQuery({
    queryKey: ["gap-analysis", sessionId],
    queryFn: () => getGapAnalysisFn({ data: { sessionId: sessionId! } }),
    enabled: sessionId !== null,
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Gap Analysis</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Curriculum-aware gap detection: pick a book, choose a submitted diagnostic, and see
          outcome-level scoring, mastery bands, risk levels, and intervention recommendations —
          with full curriculum traceability. Independent verification:{" "}
          <Link to="/gap-analysis-audit" className="underline">
            Gap Analysis Audit Center
          </Link>
          .
        </p>
      </div>

      {/* Step 1: book */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-primary" />
            Step 1 — Choose a book
          </CardTitle>
        </CardHeader>
        <CardContent>
          {booksQuery.isPending ? (
            <Skeleton className="h-10 w-full" />
          ) : books.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No books yet — upload one in the{" "}
              <Link to="/curriculum" className="underline">
                Curriculum workspace
              </Link>
              .
            </p>
          ) : (
            <Select
              value={activeBookId ?? undefined}
              onValueChange={(v) => {
                setBookId(v);
                setSessionId(null);
              }}
            >
              <SelectTrigger className="w-full sm:w-96">
                <SelectValue placeholder="Select a book" />
              </SelectTrigger>
              <SelectContent>
                {books.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.title} — {b.board ?? "No board"} · Grade {b.grade} {b.subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Step 2: submitted diagnostics */}
      {activeBookId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowRight className="h-4 w-4 text-primary" />
              Step 2 — Choose a submitted diagnostic
            </CardTitle>
            <CardDescription>
              Submitted sessions for assessments built from this book.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sessionsQuery.isPending ? (
              <Skeleton className="h-24 w-full" />
            ) : sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No submitted diagnostics for this book yet. Assign one from{" "}
                <Link to="/assessments" className="underline">
                  Assessments
                </Link>{" "}
                and have the learner complete it.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Learner</TableHead>
                    <TableHead>Assessment</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((s) => (
                    <TableRow key={s.id} data-state={sessionId === s.id ? "selected" : undefined}>
                      <TableCell className="text-sm font-medium">{s.learnerName}</TableCell>
                      <TableCell className="text-xs">
                        {s.assessmentTitle}
                        <Badge variant="outline" className="ml-2 text-[10px]">
                          {s.assessmentKind}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {s.submittedAt ? fmt(s.submittedAt) : "—"}
                      </TableCell>
                      <TableCell className="text-xs tabular-nums">
                        {s.correctCount}/{s.totalCount} · {s.scorePct}%
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={sessionId === s.id ? "default" : "outline"}
                          onClick={() => setSessionId(s.id)}
                        >
                          Analyze
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: analysis */}
      {sessionId && (
        <>
          {analysisQuery.isPending ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : analysisQuery.error ? (
            <Card>
              <CardContent className="flex items-center gap-2 p-4 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" />
                {analysisQuery.error.message}
              </CardContent>
            </Card>
          ) : analysisQuery.data ? (
            <AnalysisDashboard analysis={analysisQuery.data} />
          ) : null}
        </>
      )}
    </div>
  );
}

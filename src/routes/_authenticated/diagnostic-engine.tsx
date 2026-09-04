import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Crosshair,
  Gauge,
  ListChecks,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { publishAssessment } from "@/lib/assessments.functions";
import {
  generateDiagnosticFn,
  getDiagnosticBooksFn,
  getDiagnosticWorkspaceFn,
} from "@/lib/diagnostic.functions";
import {
  buildDiagnosticPlan,
  DIAGNOSTIC_TEMPLATE_DESCRIPTIONS,
  DIAGNOSTIC_TEMPLATE_LABELS,
  ENGINE_RULES,
  RISK_BAND_LABELS,
  type DiagnosticTemplateKind,
} from "@/lib/diagnostic-shared";
import { KIND_LABELS, type QuestionKind } from "@/lib/question-bank-shared";
import { fmt } from "@/components/audit-shared";
import { friendlyErrorMessage } from "@/lib/user-errors";

export const Route = createFileRoute("/_authenticated/diagnostic-engine")({
  head: () => ({
    meta: [
      { title: "Diagnostic Engine — EduOS" },
      {
        name: "description",
        content:
          "Generate curriculum-driven diagnostics and reassessments from approved outcomes and approved questions, allocated by blueprint weight.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DiagnosticEnginePage,
});

const authRoute = getRouteApi("/_authenticated");

function DifficultyMixBadges({ mix }: { mix: Record<number, number> }) {
  const entries = Object.entries(mix).sort(([a], [b]) => Number(a) - Number(b));
  if (entries.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {entries.map(([d, n]) => (
        <Badge key={d} variant="outline" className="text-[10px] tabular-nums">
          D{d}×{n}
        </Badge>
      ))}
    </span>
  );
}

function DiagnosticEnginePage() {
  const { role } = authRoute.useRouteContext();
  const canGenerate = role === "admin" || role === "educator";
  const queryClient = useQueryClient();
  const generate = useServerFn(generateDiagnosticFn);

  const [board, setBoard] = useState<string | null>(null);
  const [grade, setGrade] = useState<number | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [bookId, setBookId] = useState<string | null>(null);
  const [unitId, setUnitId] = useState<string | null>(null);
  const [template, setTemplate] = useState<DiagnosticTemplateKind>("diagnostic");
  const [totalQuestions, setTotalQuestions] = useState(9);
  const [baselineId, setBaselineId] = useState<string | null>(null);
  const [publishNow, setPublishNow] = useState(true);
  const [generating, setGenerating] = useState(false);

  const { data: books } = useQuery({
    queryKey: ["diagnostic-books"],
    queryFn: () => getDiagnosticBooksFn(),
  });

  // Board → Grade → Subject → Book cascade.
  const boards = useMemo(
    () => [...new Set((books ?? []).map((b) => b.board ?? "(no board)"))].sort(),
    [books],
  );
  const grades = useMemo(
    () =>
      [...new Set((books ?? []).filter((b) => (b.board ?? "(no board)") === board).map((b) => b.grade))].sort(
        (a, b) => a - b,
      ),
    [books, board],
  );
  const subjects = useMemo(
    () =>
      [
        ...new Set(
          (books ?? [])
            .filter((b) => (b.board ?? "(no board)") === board && b.grade === grade)
            .map((b) => b.subject),
        ),
      ].sort(),
    [books, board, grade],
  );
  const bookChoices = useMemo(
    () =>
      (books ?? []).filter(
        (b) => (b.board ?? "(no board)") === board && b.grade === grade && b.subject === subject,
      ),
    [books, board, grade, subject],
  );

  const { data: ws, isPending: wsPending } = useQuery({
    queryKey: ["diagnostic-workspace", bookId, unitId],
    enabled: !!bookId,
    queryFn: () => getDiagnosticWorkspaceFn({ data: { bookId: bookId!, unitId: unitId ?? undefined } }),
  });

  const selectedUnitId = ws?.selectedUnitId ?? null;
  const unitDiagnostics = useMemo(
    () => (ws?.diagnostics ?? []).filter((d) => d.unitId === selectedUnitId),
    [ws, selectedUnitId],
  );
  const activeBaseline = unitDiagnostics.find((d) => d.id === baselineId) ?? unitDiagnostics[0] ?? null;

  const plan = useMemo(() => {
    if (!ws || !selectedUnitId) return null;
    return buildDiagnosticPlan({
      template,
      outcomes: ws.outcomes,
      totalQuestions,
      excludeQuestionIds:
        template === "reassessment" ? new Set(activeBaseline?.questionIds ?? []) : new Set(),
      usedQuestionIds: new Set(ws.usedQuestionIds),
    });
  }, [ws, selectedUnitId, template, totalQuestions, activeBaseline]);

  const handleGenerate = async () => {
    if (!ws || !selectedUnitId || !plan) return;
    setGenerating(true);
    try {
      const result = await generate({
        data: {
          bookId: ws.book.id,
          unitId: selectedUnitId,
          template,
          totalQuestions,
          baselineAssessmentId: template === "reassessment" ? (activeBaseline?.id ?? undefined) : undefined,
          publishNow,
        },
      });
      if (publishNow) {
        // Publication runs through the shared server-gated lifecycle.
        const published = await publish({ data: { assessmentId: result.assessmentId } });
        if (published.ok) {
          toast.success(
            `${DIAGNOSTIC_TEMPLATE_LABELS[template]} published — ${result.questionCount} questions mapped. Nothing was assigned.`,
          );
        } else {
          toast.error(
            `Saved as draft — publish blocked: ${published.blockers.map((b) => b.message).join(" ")}`,
          );
        }
      } else {
        toast.success(
          `${DIAGNOSTIC_TEMPLATE_LABELS[template]} saved as draft — ${result.questionCount} questions mapped. Nothing was assigned.`,
        );
      }
      await queryClient.invalidateQueries({ queryKey: ["diagnostic-workspace"] });
    } catch (error) {
      toast.error(friendlyErrorMessage(error, "Generation failed."));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Diagnostic Engine</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Generate diagnostics and reassessments straight from the curriculum blueprint —
            questions are allocated across outcomes by diagnostic weight. Generation never
            assigns learners, creates interventions, or changes mastery.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/diagnostic-engine-audit">
            <ListChecks className="h-4 w-4" />
            Audit center
          </Link>
        </Button>
      </div>

      {/* Step 1: curriculum path */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge className="h-4 w-4 text-primary" />
            1 · Curriculum path
          </CardTitle>
          <CardDescription>Board → Grade → Subject → Book, then pick the unit.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label>Board</Label>
            <Select
              value={board ?? ""}
              onValueChange={(v) => {
                setBoard(v);
                setGrade(null);
                setSubject(null);
                setBookId(null);
                setUnitId(null);
              }}
            >
              <SelectTrigger><SelectValue placeholder="Board" /></SelectTrigger>
              <SelectContent>
                {boards.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Grade</Label>
            <Select
              value={grade === null ? "" : String(grade)}
              disabled={!board}
              onValueChange={(v) => {
                setGrade(Number(v));
                setSubject(null);
                setBookId(null);
                setUnitId(null);
              }}
            >
              <SelectTrigger><SelectValue placeholder="Grade" /></SelectTrigger>
              <SelectContent>
                {grades.map((g) => (
                  <SelectItem key={g} value={String(g)}>Grade {g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Select
              value={subject ?? ""}
              disabled={grade === null}
              onValueChange={(v) => {
                setSubject(v);
                setBookId(null);
                setUnitId(null);
              }}
            >
              <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Book</Label>
            <Select
              value={bookId ?? ""}
              disabled={!subject}
              onValueChange={(v) => {
                setBookId(v);
                setUnitId(null);
              }}
            >
              <SelectTrigger><SelectValue placeholder="Book" /></SelectTrigger>
              <SelectContent>
                {bookChoices.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Unit</Label>
            <Select
              value={selectedUnitId ?? ""}
              disabled={!ws}
              onValueChange={(v) => setUnitId(v)}
            >
              <SelectTrigger><SelectValue placeholder="Unit" /></SelectTrigger>
              <SelectContent>
                {(ws?.units ?? []).map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {bookId && wsPending && (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      )}

      {ws && selectedUnitId && plan && (
        <>
          {/* Step 2: template + sizing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Crosshair className="h-4 w-4 text-primary" />
                2 · Template and size
              </CardTitle>
              <CardDescription>{DIAGNOSTIC_TEMPLATE_DESCRIPTIONS[template]}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-3">
                <Label>Template</Label>
                <RadioGroup
                  value={template}
                  onValueChange={(v) => setTemplate(v as DiagnosticTemplateKind)}
                  className="gap-2"
                >
                  {(["diagnostic", "reassessment"] as const).map((t) => (
                    <label
                      key={t}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                    >
                      <RadioGroupItem value={t} />
                      {DIAGNOSTIC_TEMPLATE_LABELS[t]}
                    </label>
                  ))}
                </RadioGroup>
                {template === "reassessment" && (
                  <div className="space-y-1.5">
                    <Label>Baseline diagnostic (excluded questions)</Label>
                    {unitDiagnostics.length === 0 ? (
                      <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        No diagnostic exists for this unit yet — generate one first.
                      </p>
                    ) : (
                      <Select value={activeBaseline?.id ?? ""} onValueChange={setBaselineId}>
                        <SelectTrigger><SelectValue placeholder="Baseline" /></SelectTrigger>
                        <SelectContent>
                          {unitDiagnostics.map((d) => (
                            <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <Label>
                  Total questions — <span className="font-semibold tabular-nums">{totalQuestions}</span>
                </Label>
                <Slider
                  value={[totalQuestions]}
                  min={3}
                  max={18}
                  step={1}
                  onValueChange={([v]) => setTotalQuestions(v ?? 9)}
                />
                <p className="text-xs text-muted-foreground">
                  Allocation follows blueprint weights (largest remainder).
                </p>
              </div>
              <div className="space-y-3">
                <Label>Publish</Label>
                <div className="flex items-center gap-2 rounded-lg border p-3">
                  <Switch checked={publishNow} onCheckedChange={setPublishNow} />
                  <span className="text-sm">{publishNow ? "Published (still unassigned)" : "Save as draft"}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Assignment stays manual on the Assessments page.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Step 3: preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">3 · Diagnostic preview</CardTitle>
              <CardDescription>
                Per-outcome allocation before creation — outcome, weight, question count, and
                difficulty mix.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Outcome</TableHead>
                      <TableHead className="w-16">Weight</TableHead>
                      <TableHead className="w-20">Target</TableHead>
                      <TableHead className="w-20">Planned</TableHead>
                      <TableHead>Difficulty mix</TableHead>
                      <TableHead>Questions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plan.outcomes.map((o) => (
                      <TableRow key={o.outcomeId}>
                        <TableCell>
                          <p className="font-mono text-xs">{o.code}</p>
                          <p className="max-w-56 truncate text-xs text-muted-foreground">{o.title}</p>
                        </TableCell>
                        <TableCell className="text-xs tabular-nums">{o.weight}%</TableCell>
                        <TableCell className="text-xs tabular-nums">{o.targetQuestions}</TableCell>
                        <TableCell className="text-xs tabular-nums">
                          {o.actualQuestions}
                          {o.shortfall > 0 && (
                            <span className="ml-1 text-amber-600 dark:text-amber-400">
                              (−{o.shortfall})
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <DifficultyMixBadges mix={o.difficultyMix} />
                        </TableCell>
                        <TableCell className="max-w-64">
                          <div className="space-y-0.5">
                            {o.questions.map((q) => (
                              <p key={q.id} className="truncate text-[11px] text-muted-foreground">
                                {KIND_LABELS[q.kind as QuestionKind] ?? q.kind} · D{q.difficulty} ·{" "}
                                {q.prompt}
                                {q.reused && (
                                  <span className="ml-1 font-medium text-amber-600 dark:text-amber-400">
                                    (reused)
                                  </span>
                                )}
                              </p>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {plan.uncovered.map((u) => (
                      <TableRow key={u.outcomeId} className="bg-muted/40">
                        <TableCell>
                          <p className="font-mono text-xs">{u.code}</p>
                          <p className="max-w-56 truncate text-xs text-muted-foreground">{u.title}</p>
                        </TableCell>
                        <TableCell className="text-xs tabular-nums">{u.weight}%</TableCell>
                        <TableCell colSpan={4} className="text-xs text-amber-600 dark:text-amber-400">
                          No approved questions in the bank — cannot be measured yet.
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {plan.reusedCount > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {plan.reusedCount} question(s) had to be reused — the unused alternatives for those
                  outcomes are exhausted.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Step 4: compliance + risk */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">4 · Blueprint compliance</CardTitle>
                <CardDescription>
                  Target coverage vs actual coverage, by diagnostic weight.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "Target coverage", value: plan.compliance.targetCoveragePct },
                  { label: "Actual coverage", value: plan.compliance.actualCoveragePct },
                  { label: "Coverage gap", value: plan.compliance.coverageGapPct },
                ].map((row) => (
                  <div key={row.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className="font-medium tabular-nums">{row.value}%</span>
                    </div>
                    <Progress value={row.value} className="h-2" />
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  Measured weight {plan.compliance.weightMeasured} of {plan.compliance.weightTotal} ·{" "}
                  {plan.compliance.outcomesMeasured}/{plan.compliance.outcomesTargeted} coverable
                  outcomes measured.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">5 · Gap prediction preview</CardTitle>
                <CardDescription>
                  Potential high-risk outcomes from curriculum weighting only — risk score =
                  diagnostic weight × outcome difficulty, banded against the unit mean. No learner
                  data, no AI.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {plan.risks.map((r) => (
                  <div
                    key={r.outcomeId}
                    className="flex items-center justify-between gap-2 rounded-lg border p-2.5"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-xs">{r.code}</p>
                      <p className="truncate text-xs text-muted-foreground">{r.title}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {r.weight}% × D{r.difficulty} = {r.riskScore}
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          r.band === "high"
                            ? "border-destructive/40 bg-destructive/10 text-destructive"
                            : r.band === "watch"
                              ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : ""
                        }
                      >
                        {RISK_BAND_LABELS[r.band]}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Generate */}
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {DIAGNOSTIC_TEMPLATE_LABELS[template]} · {plan.plannedQuestionIds.length} questions
                  across {plan.compliance.outcomesMeasured} outcomes
                </p>
                <p className="text-xs text-muted-foreground">
                  Writes only the assessment, its question map, and a book event. Reviewers can
                  preview but not generate.
                </p>
              </div>
              <Button
                onClick={() => void handleGenerate()}
                disabled={
                  !canGenerate ||
                  generating ||
                  plan.plannedQuestionIds.length === 0 ||
                  (template === "reassessment" && !activeBaseline)
                }
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {generating ? "Generating…" : `Generate ${DIAGNOSTIC_TEMPLATE_LABELS[template].toLowerCase()}`}
              </Button>
            </CardContent>
          </Card>

          {/* Generated list */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Generated assessments for this book</CardTitle>
              <CardDescription>
                Diagnostics and reassessments built from this book — assign them manually from the
                Assessments page when ready.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {ws.generated.length === 0 && (
                <p className="text-sm text-muted-foreground">Nothing generated for this book yet.</p>
              )}
              {ws.generated.map((g) => (
                <div
                  key={g.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{g.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {g.questionCount} questions · created {fmt(g.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline">{g.kind}</Badge>
                    <Badge variant={g.status === "published" ? "default" : "secondary"}>
                      {g.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}

      {/* Engine rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Engine rules — what generation guarantees</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {ENGINE_RULES.map((rule) => (
            <p key={rule} className="flex items-start gap-2 text-xs text-muted-foreground">
              <ListChecks className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              {rule}
            </p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

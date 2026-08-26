import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Crosshair,
  Layers,
  ListChecks,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  TEMPLATE_DESCRIPTIONS,
  TEMPLATE_LABELS,
  computeCoverage,
  type AssessmentTemplate,
  type BuilderOutcomeDto,
} from "@/lib/builder-shared";
import {
  buildAssessmentFn,
  getAssessmentCoverageFn,
  getBuilderBooksFn,
  getBuilderWorkspaceFn,
} from "@/lib/builder.functions";
import { KIND_LABELS, QB_DIFFICULTY_LABELS, type QuestionKind } from "@/lib/question-bank-shared";
import { cn } from "@/lib/utils";

type Search = { book?: string | undefined; unit?: string | undefined; built?: string | undefined };

export const Route = createFileRoute("/_authenticated/assessment-builder")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    book: typeof search["book"] === "string" ? (search["book"] as string) : undefined,
    unit: typeof search["unit"] === "string" ? (search["unit"] as string) : undefined,
    built: typeof search["built"] === "string" ? (search["built"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Assessment Builder — EduOS" },
      {
        name: "description",
        content:
          "Build curriculum-driven assessments: Board → Grade → Subject → Unit → Outcome, with live coverage, blueprint alignment, and gap preview.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AssessmentBuilderPage,
});

const authRoute = getRouteApi("/_authenticated");

const ALL_KINDS: QuestionKind[] = [
  "mcq",
  "true_false",
  "fill_blank",
  "short_answer",
  "case_study",
  "assertion_reason",
  "data_interpretation",
  "applied_mcq",
];
const ALL_DIFFICULTIES = [1, 2, 3, 4, 5];

function ChainChip({ children, last }: { children: React.ReactNode; last?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="rounded-full border bg-card px-2.5 py-1 text-[11px] font-medium">{children}</span>
      {!last && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
    </div>
  );
}

function AssessmentBuilderPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { role } = authRoute.useRouteContext();
  const isStaff = role === "admin" || role === "educator";

  // ---- Book cascade: Board → Grade → Subject → book -----------------------
  const booksQuery = useQuery({ queryKey: ["builder-books"], queryFn: () => getBuilderBooksFn() });
  const books = useMemo(() => booksQuery.data ?? [], [booksQuery.data]);

  const boards = useMemo(
    () => [...new Set(books.map((b) => b.board ?? "No board"))],
    [books],
  );
  const [board, setBoard] = useState<string | null>(null);
  const activeBoard = board ?? boards[0] ?? null;

  const grades = useMemo(
    () => [...new Set(books.filter((b) => (b.board ?? "No board") === activeBoard).map((b) => b.grade))].sort((a, b) => a - b),
    [books, activeBoard],
  );
  const [grade, setGrade] = useState<number | null>(null);
  const activeGrade = grade ?? grades[0] ?? null;

  const subjects = useMemo(
    () =>
      [...new Set(
        books
          .filter((b) => (b.board ?? "No board") === activeBoard && b.grade === activeGrade)
          .map((b) => b.subject),
      )].sort(),
    [books, activeBoard, activeGrade],
  );
  const [subject, setSubject] = useState<string | null>(null);
  const activeSubject = subject ?? subjects[0] ?? null;

  const cascadeBook = useMemo(
    () =>
      books.find(
        (b) =>
          (b.board ?? "No board") === activeBoard &&
          b.grade === activeGrade &&
          b.subject === activeSubject,
      ) ?? null,
    [books, activeBoard, activeGrade, activeSubject],
  );

  // The URL wins when it names a book; otherwise follow the cascade.
  const urlBook = search.book && books.some((b) => b.id === search.book) ? search.book : null;
  const bookId = urlBook ?? cascadeBook?.id ?? null;

  // Keep cascade selectors in sync when arriving with a book in the URL.
  useEffect(() => {
    if (!urlBook) return;
    const b = books.find((x) => x.id === urlBook);
    if (!b) return;
    setBoard(b.board ?? "No board");
    setGrade(b.grade);
    setSubject(b.subject);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlBook, books.length]);

  // ---- Workspace (units, outcomes, bank questions, built assessments) -----
  const workspaceQuery = useQuery({
    queryKey: ["builder-workspace", bookId, search.unit],
    enabled: !!bookId,
    queryFn: () => getBuilderWorkspaceFn({ data: { bookId: bookId!, unitId: search.unit } }),
  });
  const workspace = workspaceQuery.data ?? null;
  const outcomes = workspace?.outcomes ?? [];

  // ---- Selection state ----------------------------------------------------
  const [selectedOutcomes, setSelectedOutcomes] = useState<Set<string>>(new Set());
  const [checkedQuestions, setCheckedQuestions] = useState<Set<string>>(new Set());
  const [difficultyMix, setDifficultyMix] = useState<Set<number>>(new Set(ALL_DIFFICULTIES));
  const [kindFilter, setKindFilter] = useState<Set<string>>(new Set(ALL_KINDS));

  // Reset selection when the unit changes.
  const unitKey = workspace?.selectedUnitId ?? null;
  useEffect(() => {
    setSelectedOutcomes(new Set());
    setCheckedQuestions(new Set());
  }, [unitKey]);

  const outcomeById = useMemo(() => new Map(outcomes.map((o) => [o.id, o])), [outcomes]);

  const visibleQuestions = (o: BuilderOutcomeDto) =>
    o.questions.filter(
      (q) => difficultyMix.has(q.difficulty) && kindFilter.has(q.kind),
    );

  const toggleOutcome = (o: BuilderOutcomeDto, on: boolean) => {
    const nextOutcomes = new Set(selectedOutcomes);
    const nextQuestions = new Set(checkedQuestions);
    if (on) {
      nextOutcomes.add(o.id);
      for (const q of visibleQuestions(o)) {
        if (q.status === "approved") nextQuestions.add(q.id);
      }
    } else {
      nextOutcomes.delete(o.id);
      for (const q of o.questions) nextQuestions.delete(q.id);
    }
    setSelectedOutcomes(nextOutcomes);
    setCheckedQuestions(nextQuestions);
  };

  const toggleQuestion = (o: BuilderOutcomeDto, questionId: string, on: boolean) => {
    const nextQuestions = new Set(checkedQuestions);
    if (on) nextQuestions.add(questionId);
    else nextQuestions.delete(questionId);
    setCheckedQuestions(nextQuestions);
    const nextOutcomes = new Set(selectedOutcomes);
    if ([...o.questions].some((q) => nextQuestions.has(q.id))) nextOutcomes.add(o.id);
    else nextOutcomes.delete(o.id);
    setSelectedOutcomes(nextOutcomes);
  };

  // ---- Live coverage + gap preview ---------------------------------------
  const coverage = useMemo(() => {
    const selected = [...checkedQuestions].flatMap((id) => {
      for (const o of outcomes) {
        const q = o.questions.find((x) => x.id === id);
        if (q) return [{ outcomeId: q.outcomeId, difficulty: q.difficulty }];
      }
      return [];
    });
    return computeCoverage(
      selected,
      outcomes.map((o) => ({ id: o.id, diagnosticWeight: o.diagnosticWeight })),
    );
  }, [checkedQuestions, outcomes]);

  const gapPreview = useMemo(
    () =>
      outcomes
        .filter((o) => selectedOutcomes.has(o.id))
        .flatMap((o) =>
          o.interventions.map((m) => ({
            outcomeCode: o.code,
            outcomeTitle: o.title,
            ...m,
          })),
        )
        .sort((a, b) => a.priority - b.priority),
    [outcomes, selectedOutcomes],
  );

  // ---- Build form ----------------------------------------------------------
  const [template, setTemplate] = useState<AssessmentTemplate>("diagnostic");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeLimit, setTimeLimit] = useState("15");
  const [publishNow, setPublishNow] = useState(false);
  const [building, setBuilding] = useState(false);

  const unitTitle = workspace?.units.find((u) => u.id === workspace.selectedUnitId)?.title ?? "";

  const handleBuild = async () => {
    if (!bookId || !workspace?.selectedUnitId) return;
    setBuilding(true);
    try {
      const minutes = Number(timeLimit);
      const result = await buildAssessmentFn({
        data: {
          bookId,
          unitId: workspace.selectedUnitId,
          title: title.trim() || `${unitTitle} — ${TEMPLATE_LABELS[template]}`,
          description: description.trim() || undefined,
          template,
          timeLimitMinutes: Number.isFinite(minutes) && minutes > 0 ? minutes : undefined,
          questionIds: [...checkedQuestions],
          publishNow,
        },
      });
      toast.success("Assessment built — nothing assigned yet.");
      setSelectedOutcomes(new Set());
      setCheckedQuestions(new Set());
      setTitle("");
      setDescription("");
      await workspaceQuery.refetch();
      navigate({ search: { book: bookId, unit: workspace.selectedUnitId, built: result.assessmentId } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Build failed.");
    } finally {
      setBuilding(false);
    }
  };

  // ---- Built assessment coverage view --------------------------------------
  const coverageQuery = useQuery({
    queryKey: ["built-coverage", search.built],
    enabled: !!search.built,
    queryFn: () => getAssessmentCoverageFn({ data: { assessmentId: search.built! } }),
  });
  const built = coverageQuery.data ?? null;

  if (booksQuery.isPending) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className="mx-auto max-w-6xl">
        <Card>
          <CardHeader>
            <CardTitle>No books yet</CardTitle>
            <CardDescription>
              Import a book on the Curriculum page before building assessments from it.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Assessment Builder</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Build an assessment straight from the curriculum: pick the path, choose outcomes and a
          difficulty mix, then confirm bank questions. Construction only — nothing is assigned or
          graded here.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border bg-muted/30 p-2.5">
        <ChainChip>Board</ChainChip>
        <ChainChip>Grade</ChainChip>
        <ChainChip>Subject</ChainChip>
        <ChainChip>Unit</ChainChip>
        <ChainChip last>Outcome</ChainChip>
        <span className="ml-auto text-[11px] text-muted-foreground">
          No auto-assign · no auto-generation · no auto-grading
        </span>
      </div>

      {/* 1 · Curriculum path */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-primary" />
            1 · Curriculum path
          </CardTitle>
          <CardDescription>Board, grade, and subject resolve to a book; then pick a unit.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Board</Label>
            <Select
              value={activeBoard ?? ""}
              onValueChange={(v) => {
                setBoard(v);
                setGrade(null);
                setSubject(null);
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
              value={activeGrade === null ? "" : String(activeGrade)}
              onValueChange={(v) => {
                setGrade(Number(v));
                setSubject(null);
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
            <Select value={activeSubject ?? ""} onValueChange={setSubject}>
              <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Unit</Label>
            <Select
              value={workspace?.selectedUnitId ?? ""}
              onValueChange={(v) => bookId && navigate({ search: { book: bookId, unit: v } })}
              disabled={!workspace}
            >
              <SelectTrigger><SelectValue placeholder="Unit" /></SelectTrigger>
              <SelectContent>
                {(workspace?.units ?? []).map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.position}. {u.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {workspace && (
            <p className="text-xs text-muted-foreground md:col-span-4">
              Book: <span className="font-medium text-foreground">{workspace.book.title}</span>
              {workspace.book.board ? ` · ${workspace.book.board}` : ""} · Grade {workspace.book.grade} ·{" "}
              {workspace.book.subject}
            </p>
          )}
        </CardContent>
      </Card>

      {workspaceQuery.isPending && bookId && <Skeleton className="h-64 w-full" />}

      {workspace && (
        <>
          {/* 2 · Outcome selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Crosshair className="h-4 w-4 text-primary" />
                2 · Choose outcomes
              </CardTitle>
              <CardDescription>
                {outcomes.length} outcomes in “{unitTitle}”. Checking an outcome pre-selects its
                approved questions (matching the filters below); adjust individually in step 4.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Outcome</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Question coverage</TableHead>
                    <TableHead>Difficulty coverage</TableHead>
                    <TableHead>Types</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outcomes.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedOutcomes.has(o.id)}
                          onCheckedChange={(v) => toggleOutcome(o, v === true)}
                          aria-label={`Select ${o.code}`}
                        />
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs">{o.code}</span>
                        <span className="block max-w-72 truncate text-xs text-muted-foreground">
                          {o.title}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs tabular-nums">{o.diagnosticWeight}%</TableCell>
                      <TableCell className="text-xs tabular-nums">
                        {o.counts.approved}/{o.counts.total} approved
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {ALL_DIFFICULTIES.map((d) =>
                            o.counts.byDifficulty[d] ? (
                              <Badge key={d} variant="outline" className="px-1.5 text-[10px]">
                                D{d}·{o.counts.byDifficulty[d]}
                              </Badge>
                            ) : null,
                          )}
                          {o.counts.total === 0 && (
                            <span className="text-[11px] text-muted-foreground">no questions yet</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(o.counts.byKind).map(([k, n]) => (
                            <Badge key={k} variant="secondary" className="px-1.5 text-[10px]">
                              {KIND_LABELS[k as QuestionKind] ?? k}·{n}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* 3 · Difficulty mix + question types */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="h-4 w-4 text-primary" />
                3 · Difficulty mix & question types
              </CardTitle>
              <CardDescription>
                These filters decide which bank questions an outcome check pre-selects and which
                rows the picker shows.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Difficulty mix
                </p>
                <div className="flex flex-wrap gap-3">
                  {ALL_DIFFICULTIES.map((d) => (
                    <label key={d} className="flex items-center gap-1.5 text-sm">
                      <Checkbox
                        checked={difficultyMix.has(d)}
                        onCheckedChange={(v) => {
                          const next = new Set(difficultyMix);
                          if (v === true) next.add(d);
                          else next.delete(d);
                          setDifficultyMix(next);
                        }}
                      />
                      D{d} · {QB_DIFFICULTY_LABELS[d]}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Question types
                </p>
                <div className="flex flex-wrap gap-3">
                  {ALL_KINDS.map((k) => (
                    <label key={k} className="flex items-center gap-1.5 text-sm">
                      <Checkbox
                        checked={kindFilter.has(k)}
                        onCheckedChange={(v) => {
                          const next = new Set(kindFilter);
                          if (v === true) next.add(k);
                          else next.delete(k);
                          setKindFilter(next);
                        }}
                      />
                      {KIND_LABELS[k]}
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4 · Question picker */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">4 · Confirm questions</CardTitle>
              <CardDescription>
                Only approved questions can be built into an assessment — drafts appear disabled.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {outcomes.filter((o) => selectedOutcomes.has(o.id)).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Select at least one outcome above to see its questions.
                </p>
              )}
              {outcomes
                .filter((o) => selectedOutcomes.has(o.id))
                .map((o) => {
                  const visible = visibleQuestions(o);
                  return (
                    <div key={o.id} className="rounded-lg border">
                      <div className="border-b bg-muted/40 px-3 py-2 text-xs font-medium">
                        <span className="font-mono">{o.code}</span> — {o.title}
                      </div>
                      <div className="divide-y">
                        {visible.length === 0 && (
                          <p className="px-3 py-2.5 text-xs text-muted-foreground">
                            No bank questions match the current filters.
                          </p>
                        )}
                        {visible.map((q) => {
                          const approved = q.status === "approved";
                          return (
                            <label
                              key={q.id}
                              className={cn(
                                "flex items-start gap-3 px-3 py-2.5",
                                approved ? "cursor-pointer" : "opacity-55",
                              )}
                            >
                              <Checkbox
                                className="mt-0.5"
                                disabled={!approved}
                                checked={checkedQuestions.has(q.id)}
                                onCheckedChange={(v) => toggleQuestion(o, q.id, v === true)}
                                aria-label={`Include question ${q.prompt.slice(0, 40)}`}
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm">{q.prompt}</span>
                                <span className="mt-1 flex flex-wrap gap-1">
                                  <Badge variant="outline" className="px-1.5 text-[10px]">
                                    {KIND_LABELS[q.kind]}
                                  </Badge>
                                  <Badge variant="outline" className="px-1.5 text-[10px]">
                                    D{q.difficulty} · {QB_DIFFICULTY_LABELS[q.difficulty]}
                                  </Badge>
                                  {!approved && (
                                    <Badge variant="secondary" className="px-1.5 text-[10px]">
                                      {q.status} — needs approval
                                    </Badge>
                                  )}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </CardContent>
          </Card>

          {/* 5 · Coverage view */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ListChecks className="h-4 w-4 text-primary" />
                5 · Assessment coverage
              </CardTitle>
              <CardDescription>Live, computed from the checked questions.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-muted-foreground">Outcome coverage</span>
                  <span className="font-medium tabular-nums">
                    {coverage.outcomesMeasured}/{coverage.outcomesTotal} · {coverage.outcomeCoveragePct}%
                  </span>
                </div>
                <Progress value={coverage.outcomeCoveragePct} className="h-2" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-muted-foreground">Blueprint alignment</span>
                  <span className="font-medium tabular-nums">
                    {coverage.weightMeasured}/{coverage.weightTotal} weight · {coverage.blueprintAlignmentPct}%
                  </span>
                </div>
                <Progress value={coverage.blueprintAlignmentPct} className="h-2" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-muted-foreground">Questions</span>
                  <span className="font-medium tabular-nums">{coverage.questionCount}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {ALL_DIFFICULTIES.map((d) =>
                    coverage.difficultyMix[d] ? (
                      <Badge key={d} variant="outline" className="px-1.5 text-[10px]">
                        D{d}·{coverage.difficultyMix[d]}
                      </Badge>
                    ) : null,
                  )}
                  {coverage.questionCount === 0 && (
                    <span className="text-[11px] text-muted-foreground">none selected</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 6 · Gap coverage preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldAlert className="h-4 w-4 text-primary" />
                6 · Gap coverage preview
              </CardTitle>
              <CardDescription>
                Assessment → outcomes measured → potential gap areas (from the intervention map). If
                a learner misses these questions, these are the gaps the system can detect.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {gapPreview.length === 0 ? (
                <p className="px-6 pb-5 text-sm text-muted-foreground">
                  Select outcomes to preview the gap areas this assessment can surface.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Outcome measured</TableHead>
                      <TableHead>Failure pattern</TableHead>
                      <TableHead>Potential gap intervention</TableHead>
                      <TableHead>Priority</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gapPreview.map((g, i) => (
                      <TableRow key={`${g.outcomeCode}-${i}`}>
                        <TableCell>
                          <span className="font-mono text-xs">{g.outcomeCode}</span>
                          <span className="block max-w-56 truncate text-[11px] text-muted-foreground">
                            {g.outcomeTitle}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-64 text-xs">{g.failurePattern}</TableCell>
                        <TableCell className="max-w-64 text-xs">{g.recommendedIntervention}</TableCell>
                        <TableCell className="text-xs tabular-nums">P{g.priority}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* 7 · Details + build */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                7 · Template & build
              </CardTitle>
              <CardDescription>
                Saved assessments appear below and on the Assessments page. Nothing is assigned to
                learners by building.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup
                value={template}
                onValueChange={(v) => setTemplate(v as AssessmentTemplate)}
                className="grid gap-2 md:grid-cols-3"
                disabled={!isStaff}
              >
                {(Object.keys(TEMPLATE_LABELS) as AssessmentTemplate[]).map((t) => (
                  <label
                    key={t}
                    className={cn(
                      "flex cursor-pointer items-start gap-2.5 rounded-lg border p-3",
                      template === t && "border-primary bg-primary/5",
                      !isStaff && "cursor-not-allowed opacity-60",
                    )}
                  >
                    <RadioGroupItem value={t} className="mt-0.5" />
                    <span>
                      <span className="block text-sm font-medium">{TEMPLATE_LABELS[t]}</span>
                      <span className="block text-xs text-muted-foreground">
                        {TEMPLATE_DESCRIPTIONS[t]}
                      </span>
                    </span>
                  </label>
                ))}
              </RadioGroup>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="build-title">Title</Label>
                  <Input
                    id="build-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={`${unitTitle || "Unit"} — ${TEMPLATE_LABELS[template]}`}
                    disabled={!isStaff}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="build-time">Time limit (minutes)</Label>
                  <Input
                    id="build-time"
                    type="number"
                    min={1}
                    max={180}
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(e.target.value)}
                    disabled={!isStaff}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="build-desc">Description (optional)</Label>
                <Textarea
                  id="build-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  disabled={!isStaff}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={publishNow} onCheckedChange={setPublishNow} disabled={!isStaff} />
                  Publish immediately (otherwise saved as draft)
                </label>
                {isStaff ? (
                  <Button
                    onClick={() => void handleBuild()}
                    disabled={building || checkedQuestions.size === 0}
                  >
                    {building
                      ? "Building…"
                      : `Build assessment (${checkedQuestions.size} question${checkedQuestions.size === 1 ? "" : "s"})`}
                  </Button>
                ) : (
                  <Badge variant="secondary">Reviewers are read-only</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Built assessments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Built from this book</CardTitle>
              <CardDescription>
                Curriculum-built assessments — open one to see its full coverage view.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {workspace.builtAssessments.length === 0 && (
                <p className="text-sm text-muted-foreground">Nothing built from this book yet.</p>
              )}
              {workspace.builtAssessments.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{a.title}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {TEMPLATE_LABELS[a.template] ?? a.template}
                    </Badge>
                    <Badge variant={a.status === "published" ? "default" : "secondary"} className="text-[10px]">
                      {a.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{a.questionCount} questions</span>
                  </div>
                  <Button
                    size="sm"
                    variant={search.built === a.id ? "secondary" : "outline"}
                    onClick={() => {
                      const next: Search = { book: bookId! };
                      if (workspace.selectedUnitId) next.unit = workspace.selectedUnitId;
                      if (search.built !== a.id) next.built = a.id;
                      navigate({ search: next });
                    }}
                  >
                    {search.built === a.id ? "Hide coverage" : "View coverage"}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Coverage detail */}
          {search.built && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Coverage view{built ? ` — ${built.assessment.title}` : ""}
                </CardTitle>
                {built && (
                  <CardDescription>
                    {TEMPLATE_LABELS[built.assessment.template]} · {built.assessment.status} · Grade{" "}
                    {built.assessment.grade} {built.assessment.subject} · {built.assessment.topic}
                    {built.assessment.timeLimitMinutes
                      ? ` · ${built.assessment.timeLimitMinutes} min`
                      : ""}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {coverageQuery.isPending && <Skeleton className="h-40 w-full" />}
                {built && (
                  <>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-1.5">
                        <div className="flex items-baseline justify-between text-sm">
                          <span className="text-muted-foreground">Outcome coverage</span>
                          <span className="font-medium tabular-nums">
                            {built.coverage.outcomesMeasured}/{built.coverage.outcomesTotal} ·{" "}
                            {built.coverage.outcomeCoveragePct}%
                          </span>
                        </div>
                        <Progress value={built.coverage.outcomeCoveragePct} className="h-2" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-baseline justify-between text-sm">
                          <span className="text-muted-foreground">Blueprint alignment</span>
                          <span className="font-medium tabular-nums">
                            {built.coverage.blueprintAlignmentPct}%
                          </span>
                        </div>
                        <Progress value={built.coverage.blueprintAlignmentPct} className="h-2" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-baseline justify-between text-sm">
                          <span className="text-muted-foreground">Questions</span>
                          <span className="font-medium tabular-nums">
                            {built.coverage.questionCount}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(built.coverage.difficultyMix).map(([d, n]) => (
                            <Badge key={d} variant="outline" className="px-1.5 text-[10px]">
                              D{d}·{n}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10">#</TableHead>
                            <TableHead>Question</TableHead>
                            <TableHead>Outcome</TableHead>
                            <TableHead>Kind</TableHead>
                            <TableHead>Difficulty</TableHead>
                            <TableHead>Points</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {built.questions.map((q) => (
                            <TableRow key={q.id}>
                              <TableCell className="text-xs tabular-nums">{q.sortOrder}</TableCell>
                              <TableCell className="max-w-72 truncate text-xs">{q.prompt}</TableCell>
                              <TableCell className="font-mono text-xs">{q.outcomeCode}</TableCell>
                              <TableCell className="text-xs">
                                {KIND_LABELS[q.kind as QuestionKind] ?? q.kind}
                              </TableCell>
                              <TableCell className="text-xs tabular-nums">D{q.difficulty}</TableCell>
                              <TableCell className="text-xs tabular-nums">{q.points}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {built.gaps.length > 0 && (
                      <div className="rounded-lg border">
                        <div className="border-b bg-muted/40 px-3 py-2 text-xs font-medium">
                          Potential gap areas if learners miss these
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Outcome</TableHead>
                              <TableHead>Failure pattern</TableHead>
                              <TableHead>Intervention</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {built.gaps.map((g, i) => (
                              <TableRow key={`${g.outcomeCode}-${i}`}>
                                <TableCell className="font-mono text-xs">{g.outcomeCode}</TableCell>
                                <TableCell className="max-w-64 text-xs">{g.failurePattern}</TableCell>
                                <TableCell className="max-w-64 text-xs">
                                  {g.recommendedIntervention}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

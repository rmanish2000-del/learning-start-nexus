import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  FileQuestion,
  KeyRound,
  Layers,
  Pencil,
  Plus,
  AlertTriangle,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Mono } from "@/components/audit-shared";
import { BLOOM_LABELS } from "@/lib/blueprint-shared";
import { getCurriculumLibrary } from "@/lib/curriculum.functions";
import {
  GENERATION_CONTRACT,
  KIND_LABELS,
  QB_DIFFICULTY_LABELS,
  STATUS_LABELS,
  type BatchGenerationReport,
  type OutcomeBankDto,
  type QuestionDto,
  type QuestionKind,
} from "@/lib/question-bank-shared";
import {
  batchGenerateQuestionsFn,
  createQuestionFn,
  deleteQuestionFn,
  generateQuestionsFn,
  getQuestionBankWorkspace,
  setQuestionStatusFn,
  updateQuestionFn,
} from "@/lib/question-bank.functions";
import {
  ASSERTION_REASON_OPTIONS,
  CBSE_KIND_LABELS,
  CBSE_KIND_RULES,
  CBSE_KINDS,
  isOptionKind,
  requiresStimulus,
  VERIFICATION_LABELS,
  type CbseKind,
} from "@/lib/pilot-evidence-shared";
import { friendlyErrorMessage } from "@/lib/user-errors";

export const Route = createFileRoute("/_authenticated/question-bank")({
  validateSearch: (search: Record<string, unknown>) => ({
    book: typeof search["book"] === "string" ? search["book"] : undefined,
    outcome: typeof search["outcome"] === "string" ? search["outcome"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Question Bank — EduOS" },
      {
        name: "description",
        content:
          "Question bank engine: assessment outcomes feed a reviewed bank of questions, each with difficulty, an answer key, and an explanation.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: QuestionBankPage,
});

const authRoute = getRouteApi("/_authenticated");

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  approved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  retired: "bg-muted text-muted-foreground",
};

function DifficultyBadge({ level }: { level: number }) {
  return (
    <Badge variant="outline" className="tabular-nums">
      D{level} · {QB_DIFFICULTY_LABELS[level] ?? `Level ${level}`}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Question form dialog (create + edit)
// ---------------------------------------------------------------------------

type QuestionFormState = {
  kind: QuestionKind;
  difficulty: number;
  prompt: string;
  stimulus: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
};

function emptyForm(): QuestionFormState {
  return { kind: "mcq", difficulty: 2, prompt: "", stimulus: "", options: ["", "", "", ""], correctAnswer: "", explanation: "" };
}

function formFromQuestion(q: QuestionDto): QuestionFormState {
  return {
    kind: q.kind,
    difficulty: q.difficulty,
    prompt: q.prompt,
    stimulus: q.stimulus ?? "",
    options: q.options ?? ["", "", "", ""],
    correctAnswer: q.correctAnswer,
    explanation: q.explanation,
  };
}

function QuestionFormDialog({
  open,
  onOpenChange,
  outcomeId,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outcomeId: string;
  editing: QuestionDto | null;
  onSaved: () => void;
}) {
  const createQuestion = useServerFn(createQuestionFn);
  const updateQuestion = useServerFn(updateQuestionFn);
  const [form, setForm] = useState<QuestionFormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(editing ? formFromQuestion(editing) : emptyForm());
  }, [open, editing]);

  const needsOptions = isOptionKind(form.kind);
  const needsStimulus = requiresStimulus(form.kind);

  const handleSave = async () => {
    const options = form.kind === "true_false"
      ? ["True", "False"]
      : form.kind === "assertion_reason"
        ? ASSERTION_REASON_OPTIONS
        : needsOptions
          ? form.options.map((o) => o.trim()).filter(Boolean)
          : null;
    if (needsOptions && form.kind !== "true_false" && options && options.length < 2) {
      toast.error("This question type needs at least 2 options.");
      return;
    }
    if (
      needsOptions &&
      options &&
      !options.some((o) => o.trim().toLowerCase() === form.correctAnswer.trim().toLowerCase())
    ) {
      toast.error("The answer key must match one of the options exactly.");
      return;
    }
    if (needsStimulus && !form.stimulus.trim()) {
      toast.error("This CBSE question type needs a stimulus (passage, data or assertion/reason).");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        kind: form.kind,
        difficulty: form.difficulty,
        prompt: form.prompt,
        stimulus: needsStimulus ? form.stimulus.trim() : null,
        options,
        correctAnswer: form.correctAnswer,
        explanation: form.explanation,
      };
      if (editing) {
        await updateQuestion({ data: { questionId: editing.id, ...payload } });
        toast.success("Question updated.");
      } else {
        await createQuestion({ data: { outcomeId, ...payload } });
        toast.success("Question added as a draft.");
      }
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(friendlyErrorMessage(error, "Save failed."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit question" : "Add question"}</DialogTitle>
          <DialogDescription>
            Every question carries a difficulty, an answer key, and an explanation. New questions
            start as drafts.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Kind</Label>
              <Select
                value={form.kind}
                onValueChange={(v) => setForm((f) => ({ ...f, kind: v as QuestionKind }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(KIND_LABELS) as QuestionKind[]).map((k) => (
                    <SelectItem key={k} value={k}>{KIND_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Difficulty</Label>
              <Select
                value={String(form.difficulty)}
                onValueChange={(v) => setForm((f) => ({ ...f, difficulty: Number(v) }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      D{d} · {QB_DIFFICULTY_LABELS[d]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {needsStimulus && (
            <div className="space-y-1.5">
              <Label>Stimulus</Label>
              <Textarea
                value={form.stimulus}
                onChange={(e) => setForm((f) => ({ ...f, stimulus: e.target.value }))}
                placeholder={CBSE_KIND_RULES[form.kind as CbseKind]}
                rows={4}
              />
              <p className="text-muted-foreground text-xs">
                {CBSE_KIND_RULES[form.kind as CbseKind]}
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Prompt</Label>
            <Textarea
              value={form.prompt}
              onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
              placeholder={form.kind === "fill_blank" ? "Use ______ for the blank" : "Question prompt"}
              rows={2}
            />
          </div>

          {form.kind === "assertion_reason" && (
            <div className="space-y-1.5">
              <Label>Options (fixed CBSE set)</Label>
              <ul className="text-muted-foreground space-y-1 text-xs">
                {ASSERTION_REASON_OPTIONS.map((o) => (
                  <li key={o} className="rounded-md border px-2 py-1">{o}</li>
                ))}
              </ul>
            </div>
          )}

          {needsOptions && form.kind !== "true_false" && form.kind !== "assertion_reason" && (
            <div className="space-y-1.5">
              <Label>Options</Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {form.options.map((opt, i) => (
                  <Input
                    key={i}
                    value={opt}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        options: f.options.map((o, j) => (j === i ? e.target.value : o)),
                      }))
                    }
                    placeholder={`Option ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5" /> Answer key
            </Label>
            {form.kind === "true_false" ? (
              <Select
                value={form.correctAnswer}
                onValueChange={(v) => setForm((f) => ({ ...f, correctAnswer: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Pick True or False" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="True">True</SelectItem>
                  <SelectItem value="False">False</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={form.correctAnswer}
                onChange={(e) => setForm((f) => ({ ...f, correctAnswer: e.target.value }))}
                placeholder={
                  needsOptions
                    ? "Must match one option exactly"
                    : form.kind === "short_answer"
                      ? "Model answer or 'Any one of: …'"
                      : "Correct answer"
                }
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Explanation</Label>
            <Textarea
              value={form.explanation}
              onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))}
              placeholder="1–2 sentences teaching why the answer key is correct"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Saving…" : editing ? "Save changes" : "Add as draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Question card
// ---------------------------------------------------------------------------

function QuestionCard({
  question,
  canWrite,
  onChanged,
  onEdit,
}: {
  question: QuestionDto;
  canWrite: boolean;
  onChanged: () => void;
  onEdit: () => void;
}) {
  const setStatus = useServerFn(setQuestionStatusFn);
  const deleteQuestion = useServerFn(deleteQuestionFn);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(done);
      onChanged();
    } catch (error) {
      toast.error(friendlyErrorMessage(error, "Action failed."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border p-3.5">
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <Badge variant="secondary">{KIND_LABELS[question.kind]}</Badge>
        <DifficultyBadge level={question.difficulty} />
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${STATUS_STYLES[question.status] ?? ""}`}>
          {STATUS_LABELS[question.status]}
        </span>
        <Badge variant="outline" className="font-normal">
          {question.source === "ai" ? "AI-generated" : "Manual"}
        </Badge>
        <Badge
          variant={
            question.verificationState === "verified"
              ? "default"
              : question.verificationState === "rejected"
                ? "destructive"
                : "outline"
          }
          className="font-normal"
        >
          {VERIFICATION_LABELS[question.verificationState]}
        </Badge>
      </div>

      {question.stimulus && (
        <p className="bg-muted/50 text-muted-foreground mt-2 rounded-md p-2 text-xs whitespace-pre-line">
          {question.stimulus}
        </p>
      )}

      <p className="mt-2 text-sm font-medium">{question.prompt}</p>

      {question.options && question.options.length > 0 && (
        <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
          {question.options.map((opt) => {
            const isCorrect = opt.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
            return (
              <li
                key={opt}
                className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${
                  isCorrect ? "border-emerald-500/40 bg-emerald-500/5" : ""
                }`}
              >
                {isCorrect && <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />}
                {opt}
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-2.5 grid gap-2 text-xs sm:grid-cols-2">
        <div className="rounded-md bg-muted/50 p-2">
          <p className="mb-0.5 flex items-center gap-1 font-medium text-muted-foreground">
            <KeyRound className="h-3 w-3" /> Answer key
          </p>
          <p>{question.correctAnswer}</p>
        </div>
        <div className="rounded-md bg-muted/50 p-2">
          <p className="mb-0.5 font-medium text-muted-foreground">Explanation</p>
          <p>{question.explanation}</p>
        </div>
      </div>

      {canWrite && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Button size="sm" variant="outline" disabled={busy} onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
          {question.status !== "approved" && (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() =>
                void run(
                  () => setStatus({ data: { questionId: question.id, status: "approved" } }),
                  "Question approved.",
                )
              }
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Approve
            </Button>
          )}
          {question.status === "approved" && (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() =>
                void run(
                  () => setStatus({ data: { questionId: question.id, status: "retired" } }),
                  "Question retired.",
                )
              }
            >
              Retire
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            disabled={busy}
            onClick={() =>
              void run(() => deleteQuestion({ data: { questionId: question.id } }), "Question deleted.")
            }
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Batch generation: every outcome in the book (or one unit) in one action
// ---------------------------------------------------------------------------

function BatchGenerationCard({
  bookId,
  units,
  onChanged,
}: {
  bookId: string;
  units: { id: string; title: string; outcomes: OutcomeBankDto[] }[];
  onChanged: () => void;
}) {
  const batchGenerate = useServerFn(batchGenerateQuestionsFn);
  const [scope, setScope] = useState("all");
  const [perOutcome, setPerOutcome] = useState("3");
  const [style, setStyle] = useState<"auto" | CbseKind>("auto");
  const [skipCovered, setSkipCovered] = useState(true);
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<BatchGenerationReport | null>(null);

  const scopedOutcomes =
    scope === "all"
      ? units.flatMap((u) => u.outcomes)
      : (units.find((u) => u.id === scope)?.outcomes ?? []);
  const pending = skipCovered
    ? scopedOutcomes.filter((o) => o.counts.total === 0).length
    : scopedOutcomes.length;

  const run = async () => {
    setRunning(true);
    setReport(null);
    try {
      const result = await batchGenerate({
        data: {
          bookId,
          unitId: scope === "all" ? null : scope,
          perOutcome: Number(perOutcome),
          style,
          skipIfAtLeast: skipCovered ? 1 : 0,
        },
      });
      setReport(result);
      if (result.totals.failed > 0) {
        toast.warning(
          `${result.totals.questionsInserted} questions added · ${result.totals.failed} outcome${result.totals.failed === 1 ? "" : "s"} failed — see the report.`,
        );
      } else {
        toast.success(
          `${result.totals.questionsInserted} draft questions added across ${result.totals.generated} outcomes.`,
        );
      }
      onChanged();
    } catch (error) {
      toast.error(friendlyErrorMessage(error, "Batch generation failed."));
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wand2 className="h-4 w-4 text-primary" />
          Batch generation
        </CardTitle>
        <CardDescription>
          Generate questions for every outcome in the book or one unit in a single run. Outcomes are
          processed one at a time — a failure on one outcome never stops the rest.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Scope</Label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All units in this book</SelectItem>
                {units.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Questions per outcome</Label>
            <Select value={perOutcome} onValueChange={setPerOutcome}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Question style</Label>
            <Select value={style} onValueChange={(v) => setStyle(v as "auto" | CbseKind)}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto (outcome question types)</SelectItem>
                {CBSE_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>{CBSE_KIND_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 pb-2">
            <Switch id="skip-covered" checked={skipCovered} onCheckedChange={setSkipCovered} />
            <Label htmlFor="skip-covered" className="text-xs">Skip outcomes that already have questions</Label>
          </div>
          <Button className="mb-0.5" disabled={running || pending === 0} onClick={() => void run()}>
            <Sparkles className="h-3.5 w-3.5" />
            {running
              ? `Generating for ${pending} outcomes…`
              : `Generate for ${pending} outcome${pending === 1 ? "" : "s"}`}
          </Button>
        </div>
        {running && (
          <p className="text-xs text-muted-foreground">
            Running sequentially — roughly {Math.max(1, Math.round((pending * 12) / 60))} min for{" "}
            {pending} outcomes. Keep this tab open.
          </p>
        )}

        {report && (
          <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <Badge variant="outline">
                Coverage {report.coverage.coveragePctBefore}% → {report.coverage.coveragePctAfter}%
              </Badge>
              <Badge variant="outline">
                {report.coverage.outcomesWithQuestionsAfter}/{report.totals.outcomes} outcomes covered
              </Badge>
              <Badge variant="outline">+{report.totals.questionsInserted} questions</Badge>
              <Badge variant="outline">
                {report.coverage.questionsBefore} → {report.coverage.questionsAfter} in bank
              </Badge>
              <Badge variant="outline">{report.totals.skipped} skipped</Badge>
              <Badge
                variant="outline"
                className={report.totals.failed > 0 ? "text-destructive" : undefined}
              >
                {report.totals.failed} failed
              </Badge>
              <Badge variant="outline">{Math.round(report.durationMs / 1000)}s</Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-1 text-left font-medium">Outcome</th>
                    <th className="py-1 text-left font-medium">Unit</th>
                    <th className="py-1 text-right font-medium">Before</th>
                    <th className="py-1 text-right font-medium">Added</th>
                    <th className="py-1 text-left font-medium">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {report.results.map((r) => (
                    <tr key={r.outcomeId} className="border-b last:border-0 align-top">
                      <td className="py-1 pr-2">
                        <Mono>{r.code}</Mono>
                        <span className="block text-muted-foreground">{r.title}</span>
                      </td>
                      <td className="py-1 pr-2 text-muted-foreground">{r.unitTitle}</td>
                      <td className="py-1 pr-2 text-right tabular-nums">{r.before}</td>
                      <td className="py-1 pr-2 text-right tabular-nums">{r.inserted}</td>
                      <td className="py-1">
                        {r.status === "generated" && (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" /> Generated
                          </span>
                        )}
                        {r.status === "skipped" && (
                          <span className="text-muted-foreground">Skipped (already covered)</span>
                        )}
                        {r.status === "failed" && (
                          <span className="flex items-start gap-1 text-destructive">
                            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                            <span>{r.error}</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Every generated question lands as a draft for staff review — nothing is approved or
              assembled into an assessment automatically.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Outcome detail panel
// ---------------------------------------------------------------------------

function OutcomePanel({
  outcome,
  canWrite,
  onChanged,
}: {
  outcome: OutcomeBankDto;
  canWrite: boolean;
  onChanged: () => void;
}) {
  const generate = useServerFn(generateQuestionsFn);
  const [generating, setGenerating] = useState(false);
  const [genCount, setGenCount] = useState("3");
  const [genStyle, setGenStyle] = useState<"auto" | CbseKind>("auto");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<QuestionDto | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await generate({
        data: { outcomeId: outcome.id, count: Number(genCount), style: genStyle },
      });
      toast.success(
        `Generated ${result.inserted} draft question${result.inserted === 1 ? "" : "s"} in ${(result.latencyMs ?? 0) / 1000}s — review and approve them below.`,
      );
      onChanged();
    } catch (error) {
      toast.error(friendlyErrorMessage(error, "Generation failed."));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Mono>{outcome.code}</Mono>
          <span className="text-sm font-medium">{outcome.title}</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
          <Badge variant="outline">{BLOOM_LABELS[outcome.bloomLevel] ?? outcome.bloomLevel}</Badge>
          <DifficultyBadge level={outcome.difficulty} />
          <Badge variant="secondary">Weight {outcome.diagnosticWeight}%</Badge>
          {outcome.questionTypes.map((qt) => (
            <Badge key={qt} variant="outline" className="font-normal">{qt}</Badge>
          ))}
        </div>

        {canWrite && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Select value={genCount} onValueChange={setGenCount}>
              <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={genStyle} onValueChange={(v) => setGenStyle(v as "auto" | CbseKind)}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto (outcome question types)</SelectItem>
                {CBSE_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>{CBSE_KIND_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => void handleGenerate()} disabled={generating}>
              <Sparkles className="h-3.5 w-3.5" />
              {generating ? "Generating…" : "Generate with AI"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" /> Add manually
            </Button>
          </div>
        )}
      </div>

      {outcome.questions.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <FileQuestion className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium">No questions yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {canWrite
              ? "Generate with AI or add a question manually — every question lands as a draft for review."
              : "Questions will appear here once staff add them."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {outcome.questions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              canWrite={canWrite}
              onChanged={onChanged}
              onEdit={() => {
                setEditing(q);
                setFormOpen(true);
              }}
            />
          ))}
        </div>
      )}

      <QuestionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        outcomeId={outcome.id}
        editing={editing}
        onSaved={onChanged}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const CHAIN_STEPS = ["Outcome", "Question Bank", "Difficulty", "Answer Key", "Explanation"];

function QuestionBankPage() {
  const { role } = authRoute.useRouteContext();
  const canWrite = role === "admin" || role === "educator";
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();

  const { data: library } = useQuery({
    queryKey: ["curriculum-library"],
    queryFn: () => getCurriculumLibrary(),
  });

  const bookId = search.book ?? library?.[0]?.id;

  const { data: workspace, isPending } = useQuery({
    queryKey: ["question-bank", bookId],
    enabled: !!bookId,
    queryFn: () => getQuestionBankWorkspace({ data: { bookId: bookId! } }),
  });

  const allOutcomes = workspace?.units.flatMap((u) => u.outcomes) ?? [];
  const selectedOutcome =
    allOutcomes.find((o) => o.id === search.outcome) ??
    allOutcomes.find((o) => o.counts.total > 0) ??
    allOutcomes[0];

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["question-bank", bookId] });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Question Bank</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Each assessment outcome feeds a reviewed bank of questions. AI generates drafts; staff
            review and approve before anything is used.
          </p>
        </div>
        <div className="w-full sm:w-72">
          <Select
            value={bookId ?? ""}
            onValueChange={(v) => navigate({ search: { book: v, outcome: undefined } })}
          >
            <SelectTrigger><SelectValue placeholder="Pick a book" /></SelectTrigger>
            <SelectContent>
              {(library ?? []).map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.title} · Grade {b.grade} {b.subject}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Chain visual */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border bg-muted/30 px-3 py-2 text-xs">
        {CHAIN_STEPS.map((step, i) => (
          <span key={step} className="flex items-center gap-1.5">
            {i > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
            <span className="rounded-full border bg-background px-2 py-0.5 font-medium">{step}</span>
          </span>
        ))}
        <span className="ml-auto text-muted-foreground">No automatic assessment assembly in this sprint.</span>
      </div>

      {isPending || !workspace ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5 text-xs">
            <Badge variant="outline">{workspace.totals.outcomes} outcomes</Badge>
            <Badge variant="outline">{workspace.totals.outcomesWithQuestions} with questions</Badge>
            <Badge variant="outline">{workspace.totals.questions} questions</Badge>
            <Badge variant="outline">{workspace.totals.approved} approved</Badge>
          </div>

          {canWrite && bookId && (
            <BatchGenerationCard bookId={bookId} units={workspace.units} onChanged={refresh} />
          )}

          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            {/* Outcome list */}
            <Card className="h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Layers className="h-4 w-4 text-primary" />
                  Outcomes
                </CardTitle>
                <CardDescription>
                  {workspace.book.title} — pick an outcome to see its questions.
                </CardDescription>
              </CardHeader>
              <CardContent className="max-h-[70vh] space-y-3 overflow-y-auto">
                {workspace.units.map((unit) => (
                  <div key={unit.id}>
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {unit.title}
                    </p>
                    <div className="space-y-1">
                      {unit.outcomes.map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => navigate({ search: { book: bookId, outcome: o.id } })}
                          className={`flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors ${
                            selectedOutcome?.id === o.id
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted/50"
                          }`}
                        >
                          <span className="min-w-0">
                            <Mono>{o.code}</Mono>
                            <span className="block truncate text-muted-foreground">{o.title}</span>
                          </span>
                          <span
                            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums ${
                              o.counts.total > 0
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {o.counts.total}
                          </span>
                        </button>
                      ))}
                      {unit.outcomes.length === 0 && (
                        <p className="px-1 text-[11px] text-muted-foreground">No outcomes in this unit.</p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Selected outcome */}
            <div>
              {selectedOutcome ? (
                <OutcomePanel
                  key={selectedOutcome.id}
                  outcome={selectedOutcome}
                  canWrite={canWrite}
                  onChanged={refresh}
                />
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  This book has no assessment outcomes yet — build them in the blueprint first.
                </div>
              )}
            </div>
          </div>

          {/* Generation contract */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                Generation contract
              </CardTitle>
              <CardDescription>
                What the AI receives and what it must return — printed here so the output shape is
                verifiable.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal space-y-0.5 pl-4 text-xs text-muted-foreground">
                {GENERATION_CONTRACT.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleX,
  CloudUpload,
  History,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";

import { QueryError } from "@/components/query-error";
import { getStudentSession, saveSessionProgress, submitAssessment } from "@/lib/assessments.functions";

import {
  DIFFICULTY_LABELS,
  normalizeResultEntries,
  summarizeResultEntries,
  type RunnerQuestion,
  type ResultEntry,
} from "@/lib/assessment-shared";
import { friendlyErrorMessage } from "@/lib/user-errors";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/session/$sessionId")({
  beforeLoad: ({ context }) => {
    if (context.role !== "student") throw redirect({ to: "/assessments" });
  },
  head: () => ({
    meta: [
      { title: "Assessment — EduOS" },
      { name: "description", content: "Complete your assigned assessment." },
      { property: "og:title", content: "Assessment — EduOS" },
      { property: "og:description", content: "Complete your assigned assessment." },
    ],
  }),
  component: TakeAssessmentPage,
});

function TakeAssessmentPage() {
  const { sessionId } = Route.useParams();
  const queryClient = useQueryClient();
  const getSession = useServerFn(getStudentSession);
  const saveFn = useServerFn(saveSessionProgress);
  const submitFn = useServerFn(submitAssessment);

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["student-session", sessionId],
    queryFn: () => getSession({ data: { sessionId } }),
    staleTime: Infinity,
    retry: false,
    throwOnError: false,
  });


  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPayload = useRef<{ answers: Record<string, string>; currentPosition: number } | null>(null);

  // Hydrate local state once from the stored session (resume support).
  useEffect(() => {
    if (data && !hydrated) {
      setAnswers((data.session.answers as Record<string, string>) ?? {});
      setIndex(Math.min(data.session.current_position ?? 0, data.questions.length - 1));
      setHydrated(true);
    }
  }, [data, hydrated]);

  const saveMutation = useMutation({
    mutationFn: (payload: { answers: Record<string, string>; currentPosition: number }) =>
      saveFn({ data: { sessionId, ...payload } }),
    onSuccess: () => setSaveState("saved"),
    onError: (e) => {
      setSaveState("idle");
      toast.error(e instanceof Error ? e.message : "Could not save progress.");
    },
  });

  const flushSave = (nextAnswers: Record<string, string>, nextIndex: number) => {
    pendingPayload.current = { answers: nextAnswers, currentPosition: nextIndex };
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (pendingPayload.current) saveMutation.mutate(pendingPayload.current);
    }, 700);
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      // Persist latest answers first; the server scores the stored answers.
      if (pendingPayload.current) {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        await saveFn({ data: { sessionId, ...pendingPayload.current } });
        pendingPayload.current = null;
      }
      return submitFn({ data: { sessionId } });
    },
    onSuccess: (result) => {
      toast.success(`Submitted — you scored ${result.scorePct}%`);
      queryClient.invalidateQueries({ queryKey: ["student-session", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["my-assessment-sessions"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Submission failed."),
  });

  const questions = useMemo(() => data?.questions ?? [], [data]);
  const question = questions[index] as RunnerQuestion | undefined;
  const answeredCount = useMemo(
    () => questions.filter((q) => (answers[q.id] ?? "").trim() !== "").length,
    [questions, answers],
  );

  if (isPending || !hydrated) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-6 w-72" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  // A session whose assessment row was archived/deleted must not crash the
  // runner on `data.assessment.title`.
  if (error || !data || !data.assessment) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 py-8">
        <QueryError
          title="This assessment didn't load"
          error={error ?? new Error("Could not load this assessment.")}
          onRetry={() => void refetch()}
        />
        <Button asChild variant="outline">
          <Link to="/home">Back to My Learning</Link>
        </Button>
      </div>
    );
  }


  // ---- Submitted: result view ----
  // `result` may hold a diagnostic report object rather than a review
  // breakdown (parent-diagnostic pipeline) — normalise before rendering.
  if (data.session.status === "submitted") {
    const entries = normalizeResultEntries(
      data.session.result,
      questions as RunnerQuestion[],
      (data.session.answers as Record<string, string>) ?? {},
    );
    const totals = summarizeResultEntries(entries, {
      scorePct: data.session.score_pct,
      correct: data.session.correct_count,
      total: data.session.total_count,
    });
    return (
      <ResultView
        questions={questions as RunnerQuestion[]}
        result={entries}
        scorePct={totals.scorePct}
        correct={totals.correct}
        total={totals.total}
        title={data.assessment.title}
      />
    );
  }

  const resumed = data.session.status === "in_progress" && Object.keys(data.session.answers ?? {}).length > 0;

  const pickAnswer = (itemId: string, value: string) => {
    const next = { ...answers, [itemId]: value };
    setAnswers(next);
    flushSave(next, index);
  };

  const goTo = (nextIndex: number) => {
    const clamped = Math.max(0, Math.min(nextIndex, questions.length - 1));
    setIndex(clamped);
    if (Object.keys(answers).length > 0) flushSave(answers, clamped);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{data.assessment.title}</h2>
          <p className="text-sm text-muted-foreground">
            Grade {data.assessment.grade} · {data.assessment.topic}
            {data.assessment.time_limit_minutes ? ` · Suggested time ${data.assessment.time_limit_minutes} min` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CloudUpload className={cn("h-3.5 w-3.5", saveState === "saving" && "animate-pulse text-primary")} />
          {saveState === "saving" ? "Saving…" : saveState === "saved" ? "All answers saved" : "Answers save automatically"}
        </div>
      </div>

      {resumed && (
        <Card className="border-l-4 border-l-primary">
          <CardContent className="flex items-center gap-3 py-3">
            <History className="h-4 w-4 shrink-0 text-primary" />
            <p className="text-sm">
              Resuming where you left off — {Object.keys(data.session.answers ?? {}).length} answer
              {Object.keys(data.session.answers ?? {}).length === 1 ? "" : "s"} restored.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Question {index + 1} of {questions.length}
          </span>
          <span>
            {answeredCount}/{questions.length} answered
          </span>
        </div>
        <Progress value={questions.length ? (answeredCount / questions.length) * 100 : 0} className="h-1.5" />
        <div className="flex flex-wrap gap-1.5 pt-1">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => goTo(i)}
              aria-label={`Question ${i + 1}`}
              className={cn(
                "h-7 w-7 rounded-md border text-xs font-medium tabular-nums transition-colors",
                i === index
                  ? "border-primary bg-primary text-primary-foreground"
                  : (answers[q.id] ?? "").trim()
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted",
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      {question && (
        <Card>
          <CardContent className="space-y-5 py-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{question.subtopic}</Badge>
              <Badge variant="outline">{DIFFICULTY_LABELS[question.difficulty] ?? "Core"}</Badge>
              {(question.kind === "numeric" ||
                question.kind === "fill_blank" ||
                question.kind === "short_answer") && <Badge variant="outline">Type your answer</Badge>}
            </div>
            <p className="text-lg font-medium leading-relaxed">{question.prompt}</p>

            {(question.kind === "mcq" || question.kind === "true_false") &&
            (question.options ?? []).length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {(question.options ?? []).map((option) => {
                  const selected = answers[question.id] === option;
                  return (
                    <button
                      key={option}
                      onClick={() => pickAnswer(question.id, option)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                        selected
                          ? "border-primary bg-primary/10 font-medium"
                          : "hover:border-primary/40 hover:bg-muted/60",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                          selected && "border-primary bg-primary",
                        )}
                      >
                        {selected && <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
                      </span>
                      {option}
                    </button>
                  );
                })}
              </div>
            ) : question.kind === "short_answer" ? (
              <Textarea
                value={answers[question.id] ?? ""}
                onChange={(e) => pickAnswer(question.id, e.target.value)}
                placeholder="Type your answer in a sentence or two"
                className="min-h-24 text-base"
                maxLength={1000}
              />
            ) : (
              <Input
                value={answers[question.id] ?? ""}
                onChange={(e) => pickAnswer(question.id, e.target.value)}
                placeholder={
                  question.kind === "fill_blank" ? "Fill in the blank" : "Type your answer"
                }
                className="max-w-xs text-base"
                inputMode={question.kind === "numeric" ? "decimal" : undefined}
              />
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => goTo(index - 1)} disabled={index === 0}>
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>
        {index < questions.length - 1 ? (
          <Button onClick={() => goTo(index + 1)}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={() => setConfirmOpen(true)} disabled={submitMutation.isPending}>
            <CheckCircle2 className="h-4 w-4" />
            {submitMutation.isPending ? "Submitting…" : "Submit assessment"}
          </Button>
        )}
      </div>

      {index < questions.length - 1 && (
        <div className="text-center">
          <button
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => setConfirmOpen(true)}
          >
            Finish and submit now
          </button>
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit your assessment?</AlertDialogTitle>
            <AlertDialogDescription>
              {answeredCount < questions.length
                ? `You have ${questions.length - answeredCount} unanswered question${questions.length - answeredCount === 1 ? "" : "s"}. `
                : "All questions answered. "}
              You can't change your answers after submitting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep working</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                submitMutation.mutate();
              }}
            >
              Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ResultView({
  questions,
  result,
  scorePct,
  correct,
  total,
  title,
}: {
  questions: RunnerQuestion[];
  result: ResultEntry[];
  scorePct: number;
  correct: number;
  total: number;
  title: string;
}) {
  const byId = new Map(questions.map((q) => [q.id, q]));
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="flex flex-wrap items-center gap-4 py-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-foreground/15">
            <Trophy className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-primary-foreground/70">
              {title} — submitted
            </p>
            <p className="text-2xl font-semibold tabular-nums">
              {scorePct}% <span className="text-sm font-normal text-primary-foreground/80">({correct}/{total} correct)</span>
            </p>
          </div>
          <Button asChild variant="secondary" size="sm">
            <Link to="/home">Back to My Learning</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Review your answers</h3>
        {result.map((entry, i) => {
          const q = byId.get(entry.item_id);
          return (
            <Card key={entry.item_id}>
              <CardContent className="space-y-2 py-4">
                <div className="flex items-start gap-3">
                  {entry.correct ? (
                    <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                  ) : (
                    <CircleX className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                  )}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="text-sm font-medium">
                      {i + 1}. {q?.prompt ?? "Question"}
                    </p>
                    <p className="text-sm">
                      Your answer:{" "}
                      <span className={cn("font-medium", entry.correct ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                        {entry.given || "—"}
                      </span>
                      {!entry.correct && (
                        <>
                          {" · "}Correct answer: <span className="font-medium">{entry.correct_answer}</span>
                        </>
                      )}
                    </p>
                    {!entry.correct && q?.explanation && (
                      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                        {q.explanation}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="shrink-0">{entry.subtopic}</Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

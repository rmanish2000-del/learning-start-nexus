import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { DiagnosticShell } from "@/components/diagnostic-shell";
import { QueryError } from "@/components/query-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchDiagnosticRun,
  saveDiagnosticAnswer,
  submitDiagnosticRun,
} from "@/lib/parent-diagnostic.functions";

const TITLE = "Diagnostic in progress | EduOS";
const DESCRIPTION = "Answer one question at a time. Progress is saved after every answer and can be resumed later.";

export const Route = createFileRoute("/diagnostic/session/$token")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DiagnosticSessionPage,
});

function DiagnosticSessionPage() {
  const { token } = Route.useParams();
  const runFn = useServerFn(fetchDiagnosticRun);
  const saveFn = useServerFn(saveDiagnosticAnswer);
  const submitFn = useServerFn(submitDiagnosticRun);
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ["diagnostic-run", token],
    queryFn: () => runFn({ data: { token } }),
  });

  const run = query.data;
  const questions = run?.questions ?? [];

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!run || hydrated) return;
    setAnswers(run.answers);
    setIndex(Math.min(run.currentPosition, Math.max(0, run.questions.length - 1)));
    setHydrated(true);
  }, [run, hydrated]);

  // A submitted diagnostic goes straight to the report.
  useEffect(() => {
    if (run?.status === "submitted") {
      void navigate({ to: "/diagnostic/report/$token", params: { token } });
    }
  }, [run?.status, navigate, token]);

  const question = questions[index];
  const answeredCount = useMemo(
    () => questions.filter((q) => (answers[q.id] ?? "") !== "").length,
    [questions, answers],
  );

  async function persist(value: string, nextIndex: number) {
    if (!question) return;
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
    setSaving(true);
    try {
      await saveFn({ data: { token, questionId: question.id, answer: value, position: nextIndex } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That answer could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function goNext() {
    if (!question) return;
    const value = answers[question.id] ?? "";
    const next = Math.min(index + 1, questions.length - 1);
    await persist(value, next);
    setIndex(next);
  }

  async function submit() {
    if (!question) return;
    setSubmitting(true);
    try {
      await persist(answers[question.id] ?? "", index);
      await submitFn({ data: { token } });
      await navigate({ to: "/diagnostic/report/$token", params: { token } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The diagnostic could not be submitted.");
      setSubmitting(false);
    }
  }

  if (query.isLoading) {
    return (
      <DiagnosticShell>
        <Skeleton className="h-72 w-full" />
      </DiagnosticShell>
    );
  }
  if (query.isError || !run) {
    return (
      <DiagnosticShell>
        <QueryError title="This diagnostic link is not valid" error={query.error} onRetry={() => void query.refetch()} />
      </DiagnosticShell>
    );
  }

  const isLast = index === questions.length - 1;
  const options = question?.options ?? null;

  return (
    <DiagnosticShell footerNote={`${run.subject} · ${run.unitTitle}`}>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold tracking-tight">
            {run.childFirstName}'s diagnostic · {run.subject}
          </h1>
          <Badge variant="secondary">
            {answeredCount} of {questions.length} answered
          </Badge>
        </div>
        <Progress value={questions.length === 0 ? 0 : (answeredCount / questions.length) * 100} />
        <p className="text-xs text-muted-foreground">
          Every answer is saved as you go — you can close this page and return to the same link.
        </p>
      </div>

      {question ? (
        <Card className="mt-6">
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-muted-foreground">
                Question {index + 1} of {questions.length} · Outcome {question.outcomeCode}
              </span>
              {saving ? (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Save className="h-3.5 w-3.5" /> Saving…
                </span>
              ) : null}
            </div>
            {question.stimulus ? (
              <p className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">{question.stimulus}</p>
            ) : null}
            <CardTitle className="text-base leading-relaxed">{question.prompt}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {options && options.length > 0 ? (
              <RadioGroup
                value={answers[question.id] ?? ""}
                onValueChange={(value) => void persist(value, index)}
                className="space-y-2"
              >
                {options.map((option, i) => {
                  const id = `${question.id}-${i}`;
                  return (
                    <div key={id} className="flex items-start gap-3 rounded-md border p-3">
                      <RadioGroupItem value={option} id={id} className="mt-0.5" />
                      <Label htmlFor={id} className="cursor-pointer text-sm font-normal leading-relaxed">
                        {option}
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="free-answer">Your answer</Label>
                <Textarea
                  id="free-answer"
                  rows={4}
                  value={answers[question.id] ?? ""}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))}
                  onBlur={(e) => void persist(e.target.value, index)}
                  placeholder="Type the answer"
                />
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <Button variant="outline" onClick={() => setIndex(Math.max(0, index - 1))} disabled={index === 0}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              {isLast ? (
                <Button onClick={submit} disabled={submitting}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Submit and score
                </Button>
              ) : (
                <Button onClick={goNext}>
                  Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">This diagnostic has no questions assigned.</p>
      )}
    </DiagnosticShell>
  );
}

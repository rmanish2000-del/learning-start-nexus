import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, GraduationCap, Loader2, LogIn, Save } from "lucide-react";
import { toast } from "sonner";

import { DiagnosticShell } from "@/components/diagnostic-shell";
import { QueryError } from "@/components/query-error";
import { useSupabaseUser } from "@/lib/use-supabase-user";
import {
  getFreeCheckRun,
  saveFreeCheckResponse,
  submitFreeLearningCheck,
} from "@/lib/free-check.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n/context";
import { friendlyErrorMessage } from "@/lib/user-errors";

const TITLE = "Free learning check | EduOS";
const DESCRIPTION = "A short five-question check. Answers save as you go.";

export const Route = createFileRoute("/free-check/$checkId")({
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
  component: FreeCheckPage,
});

function FreeCheckPage() {
  const { data: user, isLoading } = useSupabaseUser();
  if (isLoading) {
    return (
      <DiagnosticShell variant="learner">
        <Skeleton className="h-64 w-full" />
      </DiagnosticShell>
    );
  }
  if (!user) {
    return (
      <DiagnosticShell variant="learner">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sign in as a student</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>This learning check belongs to a student. Sign in with your handle and 6-digit PIN.</p>
            <Button asChild>
              <Link to="/auth">
                <LogIn className="mr-2 h-4 w-4" /> Student sign-in
              </Link>
            </Button>
          </CardContent>
        </Card>
      </DiagnosticShell>
    );
  }
  return <FreeCheckBody />;
}

/** Answering is learner-only; the server refuses a parent session outright. */
function FreeCheckBody() {
  const { t } = useI18n();
  const { checkId } = Route.useParams();
  const runFn = useServerFn(getFreeCheckRun);
  const saveFn = useServerFn(saveFreeCheckResponse);
  const submitFn = useServerFn(submitFreeLearningCheck);
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ["free-check-run", checkId],
    queryFn: () => runFn({ data: { checkId } }),
  });

  const run = query.data;
  const questions = useMemo(() => run?.questions ?? [], [run]);

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
      await saveFn({ data: { checkId, questionId: question.id, answer: value, position: nextIndex } });
    } catch (error) {
      toast.error(friendlyErrorMessage(error, "That answer could not be saved."));
    } finally {
      setSaving(false);
    }
  }

  async function submit() {
    if (!question) return;
    setSubmitting(true);
    try {
      await persist(answers[question.id] ?? "", index);
      await submitFn({ data: { checkId } });
      await query.refetch();
    } catch (error) {
      toast.error(friendlyErrorMessage(error, "The check could not be submitted."));
    } finally {
      setSubmitting(false);
    }
  }

  if (query.isLoading) {
    return (
      <DiagnosticShell variant="learner">
        <Skeleton className="h-72 w-full" />
      </DiagnosticShell>
    );
  }
  if (query.isError || !run) {
    return (
      <DiagnosticShell variant="learner">
        <QueryError
          title="This learning check is not available"
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      </DiagnosticShell>
    );
  }

  if (run.status === "submitted") {
    return (
      <DiagnosticShell variant="learner" learnerName={run.learnerName} footerNote={`${run.subject} · ${run.unitTitle}`}>
        <Card>
          <CardHeader className="items-center text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <CardTitle className="mt-2 text-xl">{t("freeCheck.complete", "Learning check complete")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center text-sm text-muted-foreground">
            <p>
              {t(
                "runs.done.body",
                "Nice work. Your parent can now see which skills were checked and what to focus on next.",
              )}
            </p>
            <Button asChild onClick={() => void navigate({ to: "/home" })}>
              <Link to="/home">
                <GraduationCap className="mr-2 h-4 w-4" /> {t("runs.backToLearning", "Back to My Learning")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </DiagnosticShell>
    );
  }

  const isLast = index === questions.length - 1;
  const options = question?.options ?? null;

  return (
    <DiagnosticShell variant="learner" learnerName={run.learnerName} footerNote={`${run.subject} · ${run.unitTitle}`}>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold tracking-tight">
            Free learning check · {run.subject}
          </h1>
          <Badge variant="secondary">
            {answeredCount} of {questions.length} answered
          </Badge>
        </div>
        <Progress value={questions.length === 0 ? 0 : (answeredCount / questions.length) * 100} />
        <p className="text-xs text-muted-foreground">
          {run.unitTitle} · Every answer is saved as you go.
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
              <p className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                {question.stimulus}
              </p>
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
                  {t("freeCheck.finish", "Finish check")}
                </Button>
              ) : (
                <Button
                  onClick={async () => {
                    const next = Math.min(index + 1, questions.length - 1);
                    await persist(answers[question.id] ?? "", next);
                    setIndex(next);
                  }}
                >
                  Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </DiagnosticShell>
  );
}

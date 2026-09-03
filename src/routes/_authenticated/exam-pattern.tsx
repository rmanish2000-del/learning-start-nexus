// Learner exam-pattern practice: EduOS-verified questions sequenced by the mark
// weights observed in the official 2023-2026 CBSE Class 10 papers.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BarChart3, Clock, ShieldCheck, Target } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { QueryError } from "@/components/query-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { friendlyErrorMessage } from "@/lib/user-errors";
import {
  getPyqWorkspaceFn,
  startPyqSessionFn,
  submitPyqSessionFn,
} from "@/lib/pyq.functions";
import { PYQ_TIMED_MINUTES, type PyqMode, type PyqPracticeItem } from "@/lib/pyq-shared";

export const Route = createFileRoute("/_authenticated/exam-pattern")({
  component: ExamPatternPage,
  head: () => ({
    meta: [
      { title: "Exam Pattern Practice — CBSE Class 10 | EduOS" },
      {
        name: "description",
        content:
          "Practise EduOS-verified Class 10 questions weighted by the chapter and mark pattern of the official 2023-2026 CBSE Mathematics and Science papers.",
      },
      { property: "og:title", content: "Exam Pattern Practice | EduOS" },
      {
        property: "og:description",
        content:
          "Chapter weights, competency mix and timed papers derived from official CBSE Class 10 question papers, 2023-2026.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type SessionState = {
  sessionId: string;
  items: PyqPracticeItem[];
  durationMinutes: number | null;
};

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function ExamPatternPage() {
  const queryClient = useQueryClient();
  const load = useServerFn(getPyqWorkspaceFn);
  const start = useServerFn(startPyqSessionFn);
  const submit = useServerFn(submitPyqSessionFn);

  const [session, setSession] = useState<SessionState | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Awaited<ReturnType<typeof submitPyqSessionFn>> | null>(null);

  const query = useQuery({ queryKey: ["pyq-workspace"], queryFn: () => load({ data: {} }) });

  const startMutation = useMutation({
    mutationFn: (vars: { mode: PyqMode; chapter: string | null }) =>
      start({ data: { mode: vars.mode, chapter: vars.chapter } }),
    onSuccess: (data) => {
      setSession(data);
      setAnswers({});
      setResult(null);
    },
    onError: (error) => toast.error(friendlyErrorMessage(error)),
  });

  const submitMutation = useMutation({
    mutationFn: () => submit({ data: { sessionId: session!.sessionId, answers } }),
    onSuccess: (data) => {
      setResult(data);
      setSession(null);
      toast.success(`Scored ${data.scorePct}%`);
      void queryClient.invalidateQueries({ queryKey: ["pyq-workspace"] });
    },
    onError: (error) => toast.error(friendlyErrorMessage(error)),
  });

  if (query.isLoading) return <Skeleton className="h-96 w-full" />;
  if (query.isError) return <QueryError error={query.error} onRetry={() => query.refetch()} />;
  const data = query.data!;

  const available = new Map(data.availableByChapter.map((c) => [c.chapter, c.available]));

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Exam pattern practice</h1>
        <p className="text-muted-foreground max-w-3xl text-sm">
          {data.subject} · chapter weights derived from {data.cohortMeta.papersAnalysed} official
          CBSE Class 10 papers ({data.cohortMeta.years.join(", ")}). You practise EduOS-verified
          questions only — no past-paper text is reproduced here.
        </p>
        <p className="text-muted-foreground text-xs">{data.termCohortNote}</p>
      </header>

      {!session && !result && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4" aria-hidden /> Where the marks sit
              </CardTitle>
              <CardDescription>
                Highest-yield chapters first. Practice sets follow these weights.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.chapters.slice(0, 10).map((chapter) => (
                <div key={chapter.chapter} className="space-y-1">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium">{chapter.chapter}</span>
                    <span className="text-muted-foreground">
                      {pct(chapter.markShare)} of attributed marks ·{" "}
                      {available.get(chapter.chapter) ?? 0} verified questions
                    </span>
                  </div>
                  <Progress value={chapter.markShare * 100} />
                  <div className="flex flex-wrap gap-2">
                    {data.weakChapters.includes(chapter.chapter) && (
                      <Badge variant="destructive">Your weak area</Badge>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={(available.get(chapter.chapter) ?? 0) === 0 || startMutation.isPending}
                      onClick={() =>
                        startMutation.mutate({ mode: "practice", chapter: chapter.chapter })
                      }
                    >
                      Practise this chapter
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="h-4 w-4" aria-hidden /> Blueprint practice
                </CardTitle>
                <CardDescription>
                  A mixed set across chapters, weighted the way the real paper is.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  disabled={startMutation.isPending}
                  onClick={() => startMutation.mutate({ mode: "practice", chapter: null })}
                >
                  Start practice set
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4" aria-hidden /> Timed paper
                </CardTitle>
                <CardDescription>
                  {PYQ_TIMED_MINUTES} minutes, exam-weighted, full feedback afterwards.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="secondary"
                  disabled={startMutation.isPending}
                  onClick={() => startMutation.mutate({ mode: "timed_paper", chapter: null })}
                >
                  Start timed paper
                </Button>
              </CardContent>
            </Card>
          </div>

          {data.history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent attempts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {data.history.map((h) => (
                  <div key={h.id} className="flex items-center justify-between gap-3">
                    <span>
                      {h.chapter ?? "Blueprint set"} · {h.mode === "timed_paper" ? "Timed" : "Practice"}
                    </span>
                    <span className="text-muted-foreground">
                      {h.status === "submitted" ? `${h.scorePct}%` : "In progress"} ·{" "}
                      {new Date(h.startedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {session && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {session.durationMinutes ? `Timed paper · ${session.durationMinutes} minutes` : "Practice set"}
            </CardTitle>
            <CardDescription>{session.items.length} verified questions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {session.items.map((item, index) => (
              <div key={item.id} className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">Q{index + 1}</Badge>
                  <Badge variant="secondary">{item.chapter}</Badge>
                </div>
                {item.stimulus && <p className="text-muted-foreground text-sm">{item.stimulus}</p>}
                <p className="text-sm font-medium">{item.prompt}</p>
                {item.options ? (
                  <div className="grid gap-2">
                    {item.options.map((option) => (
                      <Button
                        key={option}
                        type="button"
                        variant={answers[item.id] === option ? "default" : "outline"}
                        className="justify-start"
                        onClick={() => setAnswers((prev) => ({ ...prev, [item.id]: option }))}
                      >
                        {option}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <Textarea
                    value={answers[item.id] ?? ""}
                    onChange={(event) =>
                      setAnswers((prev) => ({ ...prev, [item.id]: event.target.value }))
                    }
                    placeholder="Your answer"
                  />
                )}
              </div>
            ))}
            <div className="flex gap-2">
              <Button
                disabled={submitMutation.isPending}
                onClick={() => submitMutation.mutate()}
              >
                Submit for feedback
              </Button>
              <Button variant="ghost" onClick={() => setSession(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4" aria-hidden /> {result.scorePct}% ·{" "}
              {result.correctCount}/{result.totalCount} correct
            </CardTitle>
            <CardDescription>Chapter breakdown and worked explanations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {result.chapterBreakdown.map((row) => (
                <div key={row.chapter} className="flex items-center justify-between text-sm">
                  <span>{row.chapter}</span>
                  <span className="text-muted-foreground">
                    {row.correct}/{row.total} ({row.scorePct}%)
                  </span>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              {result.results.map((row, index) => (
                <div key={row.item.id} className="space-y-1 border-t pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">Q{index + 1}</Badge>
                    <Badge variant={row.correct ? "secondary" : "destructive"}>
                      {row.correct ? "Correct" : "Review"}
                    </Badge>
                    {row.item.verificationTier === "eduos_automated" && (
                      <Badge variant="outline">EduOS verified</Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium">{row.item.prompt}</p>
                  <p className="text-muted-foreground text-sm">
                    Your answer: {row.given || "—"} · Correct: {row.item.correctAnswer}
                  </p>
                  {row.item.explanation && (
                    <p className="text-sm">{row.item.explanation}</p>
                  )}
                </div>
              ))}
            </div>
            <Button variant="outline" onClick={() => setResult(null)}>
              Back to exam pattern
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

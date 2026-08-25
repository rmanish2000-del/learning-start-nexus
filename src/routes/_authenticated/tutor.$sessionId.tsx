import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import {
  BookOpen,
  Lightbulb,
  Loader2,
  MessageCircleQuestion,
  PencilLine,
  ArrowLeft,
  RefreshCw,
  Send,
  Sparkles,
  Target,
} from "lucide-react";
import { toast } from "sonner";

import { getTutorSession, tutorAction } from "@/lib/tutor.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/tutor/$sessionId")({
  beforeLoad: ({ context }) => {
    if (context.role !== "student") throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "AI Tutor — EduOS" },
      { name: "description", content: "Your personal tutor session — explanations, hints, examples, and practice." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TutorPage,
});

type Action = "explain" | "hint" | "example" | "reframe" | "try_question" | "socratic" | "practice_question";

const ACTION_BUTTONS: { action: Action; label: string; icon: typeof Sparkles }[] = [
  { action: "explain", label: "Explain", icon: BookOpen },
  { action: "hint", label: "Hint", icon: Lightbulb },
  { action: "example", label: "Show example", icon: Target },
  { action: "reframe", label: "Explain differently", icon: RefreshCw },
  { action: "try_question", label: "Let me try", icon: PencilLine },
  { action: "socratic", label: "Ask me a question", icon: MessageCircleQuestion },
  { action: "practice_question", label: "Practice", icon: Sparkles },
];

function TutorPage() {
  const { sessionId } = Route.useParams();
  const queryClient = useQueryClient();
  const fetchSession = useServerFn(getTutorSession);
  const runAction = useServerFn(tutorAction);
  const [answer, setAnswer] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["tutor-session", sessionId],
    queryFn: () => fetchSession({ data: { sessionId } }),
  });

  const mutation = useMutation({
    mutationFn: (input: { action: Action | "try_answer" | "practice_answer"; studentText?: string }) =>
      runAction({ data: { sessionId, action: input.action, studentText: input.studentText } }),
    onSuccess: () => {
      setAnswer("");
      void queryClient.invalidateQueries({ queryKey: ["tutor-session", sessionId] });
    },
    onError: (error) => toast.error(error.message),
  });

  const interactions = data?.interactions ?? [];
  const last = interactions[interactions.length - 1];
  const awaitingAnswer = last?.kind === "try_question" || last?.kind === "practice_question";
  const answerAction = last?.kind === "practice_question" ? "practice_answer" : "try_answer";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [interactions.length, mutation.isPending]);

  if (isPending) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Never leave the student stranded on a blank tutor screen: show what went
  // wrong and always offer a way back to their learning plan.
  if (isError || !data) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-12 text-center">
        <h2 className="text-xl font-semibold tracking-tight">This tutor session didn't open</h2>
        <p className="text-sm text-muted-foreground">
          {error instanceof Error && error.message
            ? error.message
            : "The session may have ended, or it belongs to a different account."}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => void refetch()}>Try again</Button>
          <Button asChild variant="outline">
            <Link to="/home">
              <ArrowLeft className="h-4 w-4" /> Back to my learning
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const { session, interventionTitle } = data;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/home">
          <ArrowLeft className="h-4 w-4" /> Back to my learning
        </Link>
      </Button>

      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">AI Tutor</h2>
          <Badge variant="outline">{session.concept}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {session.subject} · {session.topic}
          {interventionTitle ? ` · from your plan: ${interventionTitle}` : ""}
        </p>
      </div>

      <Card className="border-l-4 border-l-primary">
        <CardContent className="py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Today's objective
          </p>
          <p className="mt-0.5 text-sm">{session.objective}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Your tutor session</CardTitle>
              <CardDescription>
                I guide — you think. I'll never just hand you the answer.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="tabular-nums">
              {session.interaction_count} interactions
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-h-[420px] space-y-4 overflow-y-auto rounded-lg border bg-muted/30 p-4">
            {interactions.length === 0 && (
              <div className="py-8 text-center">
                <Sparkles className="mx-auto h-6 w-6 text-primary" />
                <p className="mt-2 text-sm font-medium">
                  Hi! I'm your tutor for {session.concept}.
                </p>
                <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                  Pick an action below to get started — I can explain, give hints, show examples,
                  or ask you questions. You do the thinking!
                </p>
              </div>
            )}
            {interactions.map((row) => (
              <div key={row.id} className="space-y-2">
                {row.request_text && (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground">
                      {row.request_text}
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="max-w-[85%] space-y-1.5">
                    <div className="rounded-2xl rounded-tl-sm border bg-card px-3.5 py-2 text-sm whitespace-pre-wrap">
                      {row.response_text}
                    </div>
                    <div className="flex items-center gap-2 pl-1">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          row.ai_used && "border-primary/40 text-primary",
                        )}
                      >
                        {row.ai_used ? "AI tutor" : "Library"}
                      </Badge>
                      {row.practice_correct !== null && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            row.practice_correct
                              ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                              : "border-amber-500/40 text-amber-600 dark:text-amber-400",
                          )}
                        >
                          {row.practice_correct ? "Correct" : "Keep trying"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {mutation.isPending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {awaitingAnswer ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!answer.trim()) return;
                mutation.mutate({ action: answerAction, studentText: answer.trim() });
              }}
              className="flex gap-2"
            >
              <Input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer…"
                aria-label="Your answer"
                autoFocus
              />
              <Button type="submit" disabled={mutation.isPending || !answer.trim()}>
                <Send className="h-4 w-4" /> Answer
              </Button>
            </form>
          ) : (
            <div className="flex flex-wrap gap-2">
              {ACTION_BUTTONS.map((b) => (
                <Button
                  key={b.action}
                  size="sm"
                  variant={b.action === "practice_question" || b.action === "try_question" ? "default" : "outline"}
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate({ action: b.action })}
                >
                  <b.icon className="h-3.5 w-3.5" />
                  {b.label}
                </Button>
              ))}
            </div>
          )}

          {awaitingAnswer && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="ghost"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate({ action: "hint" })}
              >
                <Lightbulb className="h-3.5 w-3.5" /> I need a hint
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate({ action: "practice_question" })}
              >
                <RefreshCw className="h-3.5 w-3.5" /> Skip to another question
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button asChild variant="outline" size="sm">
          <Link to="/home">Finish for now</Link>
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Practice here is separate from your formal assessments — it's a safe space to make
        mistakes. Your educator sees that you practiced, not your conversation.
      </p>
    </div>
  );
}

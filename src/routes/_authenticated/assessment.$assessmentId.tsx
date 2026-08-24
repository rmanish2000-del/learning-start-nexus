import { useMemo, useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CircleCheck, CircleX, Eye } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { DIFFICULTY_LABELS, type ResultEntry, type RunnerQuestion } from "@/lib/assessment-shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/assessment/$assessmentId")({
  beforeLoad: ({ context }) => {
    if (context.role === "student") throw redirect({ to: "/home" });
  },
  head: () => ({
    meta: [
      { title: "Assessment detail — EduOS" },
      { name: "description", content: "Questions, sessions, and results for this assessment." },
      { property: "og:title", content: "Assessment detail — EduOS" },
      { property: "og:description", content: "Questions, sessions, and results for this assessment." },
    ],
  }),
  component: AssessmentDetailPage,
});

type SessionRow = {
  id: string;
  learner_id: string;
  status: string;
  score_pct: number | null;
  correct_count: number | null;
  total_count: number | null;
  result: unknown;
  due: string | null;
  submitted_at: string | null;
  last_activity_at: string | null;
  learners: { full_name: string; handle: string } | null;
};

function AssessmentDetailPage() {
  const { assessmentId } = Route.useParams();
  const [reviewSession, setReviewSession] = useState<SessionRow | null>(null);

  const { data: assessment, isPending } = useQuery({
    queryKey: ["assessment", assessmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessments")
        .select("*")
        .eq("id", assessmentId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Sprint 6R: dual-read — curriculum assessments resolve via
  // assessment_question_map → question_bank; legacy ones via
  // assessment_item_map → assessment_items. Both mapped to RunnerQuestion.
  const { data: items } = useQuery({
    queryKey: ["assessment-items-for", assessmentId],
    queryFn: async (): Promise<RunnerQuestion[]> => {
      const { data: qMap, error: qError } = await supabase
        .from("assessment_question_map")
        .select("sort_order, points, question_bank(*)")
        .eq("assessment_id", assessmentId)
        .order("sort_order");
      if (qError) throw qError;
      if ((qMap ?? []).length > 0) {
        const rows = qMap ?? [];
        const outcomeIds = [
          ...new Set(rows.map((r) => (r.question_bank as unknown as { outcome_id: string }).outcome_id)),
        ];
        const { data: outcomes } = await supabase
          .from("assessment_outcomes")
          .select("id, code")
          .in("id", outcomeIds);
        const codeById = new Map((outcomes ?? []).map((o) => [o.id, o.code]));
        return rows.map((row) => {
          const q = row.question_bank as unknown as {
            id: string;
            outcome_id: string;
            kind: RunnerQuestion["kind"];
            difficulty: number;
            prompt: string;
            options: unknown;
            correct_answer: string;
            explanation: string;
          };
          return {
            id: q.id,
            subtopic: codeById.get(q.outcome_id) ?? "General",
            difficulty: q.difficulty,
            kind: q.kind,
            prompt: q.prompt,
            options: (q.options as string[] | null) ?? null,
            correct_answer: q.correct_answer,
            explanation: q.explanation,
            sort_order: row.sort_order,
            points: row.points,
          };
        });
      }
      const { data, error } = await supabase
        .from("assessment_item_map")
        .select("sort_order, points, assessment_items(*)")
        .eq("assessment_id", assessmentId)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []).map((row) => {
        const item = row.assessment_items as unknown as Omit<RunnerQuestion, "sort_order" | "points">;
        return { ...item, sort_order: row.sort_order, points: row.points };
      });
    },
  });

  const { data: sessions } = useQuery({
    queryKey: ["assessment-sessions-for", assessmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_sessions")
        .select("id, learner_id, status, score_pct, correct_count, total_count, result, due, submitted_at, last_activity_at, learners(full_name, handle)")
        .eq("assessment_id", assessmentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as SessionRow[];
    },
  });

  const itemById = useMemo(() => new Map((items ?? []).map((i) => [i.id, i])), [items]);
  const submitted = (sessions ?? []).filter((s) => s.status === "submitted");
  const avgScore =
    submitted.length > 0
      ? Math.round(submitted.reduce((sum, s) => sum + (s.score_pct ?? 0), 0) / submitted.length)
      : null;

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">Assessment not found in your organization.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/assessments">Back to assessments</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/assessments">
            <ArrowLeft className="h-4 w-4" /> Assessments
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{assessment.title}</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{assessment.description}</p>
        </div>
        <Badge variant={assessment.status === "published" ? "default" : "secondary"} className="capitalize">
          {assessment.status}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wide">Questions</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{(items ?? []).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wide">Assigned</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{(sessions ?? []).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wide">Average score</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{avgScore != null ? `${avgScore}%` : "—"}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Questions</CardTitle>
          <CardDescription>Correct answers are visible to staff only.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Question</TableHead>
                <TableHead>Subtopic</TableHead>
                <TableHead>Answer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(items ?? []).map((item, i) => (
                <TableRow key={item.id}>
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="max-w-md">
                    <p className="text-sm">{item.prompt}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.kind === "mcq" ? `Options: ${(item.options ?? []).join(" · ")}` : "Numeric answer"} ·{" "}
                      {DIFFICULTY_LABELS[item.difficulty]}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{item.subtopic}</Badge>
                  </TableCell>
                  <TableCell className="font-medium text-emerald-600 dark:text-emerald-400">
                    {item.correct_answer}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sessions</CardTitle>
          <CardDescription>Learner attempts and auto-scored results.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Learner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(sessions ?? []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <Link to="/learners/$learnerId" params={{ learnerId: s.learner_id }} className="font-medium hover:underline">
                      {s.learners?.full_name ?? "—"}
                    </Link>
                    <p className="text-xs text-muted-foreground">@{s.learners?.handle}</p>
                  </TableCell>
                  <TableCell className="capitalize text-sm">{s.status.replace("_", " ")}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {s.score_pct != null ? `${s.score_pct}% (${s.correct_count}/${s.total_count})` : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell>
                    {s.status === "submitted" && (
                      <Button variant="ghost" size="sm" onClick={() => setReviewSession(s)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(sessions ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    Not assigned to any learners yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!reviewSession} onOpenChange={(open) => !open && setReviewSession(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {reviewSession?.learners?.full_name} — {reviewSession?.score_pct}%
            </DialogTitle>
            <DialogDescription>Per-question breakdown from automatic scoring.</DialogDescription>
          </DialogHeader>
          <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
            {((reviewSession?.result as ResultEntry[] | null) ?? []).map((entry, i) => (
              <div key={entry.item_id} className="flex items-start gap-3 rounded-lg border p-3">
                {entry.correct ? (
                  <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <CircleX className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{itemById.get(entry.item_id)?.prompt ?? `Question ${i + 1}`}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Answered <span className="font-medium text-foreground">{entry.given || "—"}</span>
                    {!entry.correct && (
                      <>
                        {" · "}correct: <span className="font-medium text-foreground">{entry.correct_answer}</span>
                      </>
                    )}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0">{entry.subtopic}</Badge>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

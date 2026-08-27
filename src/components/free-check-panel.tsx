import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, Sparkles, XCircle } from "lucide-react";
import { toast } from "sonner";

import { getFreeCheckStatus, startFreeLearningCheck } from "@/lib/free-check.functions";
import {
  FREE_CHECK_QUESTION_COUNT,
  FREE_VS_PAID,
  type FreeCheckPreview,
  type FreeCheckSubject,
} from "@/lib/free-check-shared";
import type { ParentStudent } from "@/lib/parent-account-shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The free learning check: five verified questions, no payment, answered by the
 * learner in the Student workspace. The parent starts it here and reads a
 * deliberately limited preview of the paid report — real learner evidence,
 * never a simulation.
 */
export function FreeCheckPanel({ student }: { student: ParentStudent }) {
  const statusFn = useServerFn(getFreeCheckStatus);
  const startFn = useServerFn(startFreeLearningCheck);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["free-check-status", student.id],
    queryFn: () => statusFn({ data: { learnerId: student.id } }),
  });

  const mutation = useMutation({
    mutationFn: (subject: FreeCheckSubject) => startFn({ data: { learnerId: student.id, subject } }),
    onSuccess: () => {
      toast.success(`Free learning check ready. Ask ${student.fullName} to sign in and answer it.`);
      void queryClient.invalidateQueries({ queryKey: ["free-check-status", student.id] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "The free check could not be started."),
  });

  return (
    <div className="rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-primary" /> Free learning check
          </p>
          <p className="text-xs text-muted-foreground">
            {FREE_CHECK_QUESTION_COUNT} questions, one per subject, no payment. {student.fullName}{" "}
            answers it from the Student workspace.
          </p>
        </div>
        <Badge variant="outline">Free</Badge>
      </div>

      {query.isLoading ? (
        <Skeleton className="mt-3 h-20 w-full" />
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {(query.data ?? []).map((row) => (
            <div key={row.subject} className="rounded-md border bg-muted/30 p-2.5">
              <p className="text-sm font-medium">{row.subject}</p>
              {row.check ? (
                <FreeCheckSummary check={row.check} learnerName={student.fullName} />
              ) : (
                <>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Not started. One free check per subject.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    disabled={mutation.isPending}
                    onClick={() => mutation.mutate(row.subject)}
                  >
                    {mutation.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                    Start free check
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <details className="mt-3 rounded-md border bg-background p-2.5">
        <summary className="cursor-pointer text-xs font-medium">
          What the ₹199 diagnostic adds
        </summary>
        <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
          {FREE_VS_PAID.map((row) => (
            <li key={row.paid} className="flex flex-col sm:flex-row sm:gap-2">
              <span className="sm:w-1/2">Free: {row.free}</span>
              <span className="font-medium text-foreground sm:w-1/2">₹199: {row.paid}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function FreeCheckSummary({ check, learnerName }: { check: FreeCheckPreview; learnerName: string }) {
  if (check.status !== "submitted") {
    return (
      <p className="mt-1 text-xs text-muted-foreground">
        Waiting for {learnerName} to answer — {check.answeredCount} of {check.totalQuestions} done.
        Ask them to sign in as a student.
      </p>
    );
  }

  return (
    <div className="mt-1.5 space-y-2">
      <p className="text-xs text-muted-foreground">
        {check.unitTitle} · {check.correctCount} of {check.totalQuestions} correct ({check.scorePct}%)
      </p>
      <div>
        <p className="text-xs font-medium">Skills checked</p>
        <ul className="mt-1 space-y-1">
          {check.skills.map((s) => (
            <li key={s.code} className="flex items-start gap-1.5 text-xs">
              {s.correct ? (
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              ) : (
                <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
              )}
              <span className="text-muted-foreground">{s.title}</span>
            </li>
          ))}
        </ul>
      </div>
      {check.possibleGaps.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Possible gaps:</span>{" "}
          {check.possibleGaps.map((g) => g.title).join(", ")}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">No gaps in this short check.</p>
      )}
      {check.sampleRecommendation ? (
        <p className="rounded-md border bg-background p-2 text-xs">
          <span className="font-medium">Sample recommendation: </span>
          {check.sampleRecommendation}
        </p>
      ) : null}
      <p className="text-[11px] text-muted-foreground">
        Preview only — 5 of 20 questions from one chapter group. The ₹199 diagnostic gives the full
        outcome-by-outcome report.
      </p>
    </div>
  );
}

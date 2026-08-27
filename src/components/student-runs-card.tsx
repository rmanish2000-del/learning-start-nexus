import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, ClipboardList, PlayCircle } from "lucide-react";

import { getLearnerRuns } from "@/lib/learner-runs.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The learner's own to-do list: diagnostics their parent bought and free checks
 * their parent started. This is the only place an assessment is opened — the
 * parent never answers on the learner's behalf.
 */
export function StudentRunsCard() {
  const runsFn = useServerFn(getLearnerRuns);
  const query = useQuery({ queryKey: ["learner-runs"], queryFn: () => runsFn() });

  if (query.isLoading) return <Skeleton className="h-32 w-full" />;
  const data = query.data;
  if (!data || data.runs.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-4 w-4 text-primary" /> Assessments for you
        </CardTitle>
        <CardDescription>Your answers save as you go — you can stop and come back.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.runs.map((run) => {
          const key = run.kind === "diagnostic" ? run.accessToken : run.checkId;
          const pct = run.totalQuestions === 0 ? 0 : (run.answeredCount / run.totalQuestions) * 100;
          return (
            <div key={key} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {run.kind === "diagnostic" ? "Diagnostic" : "Free learning check"} · {run.subject}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{run.unitTitle}</p>
                </div>
                <Badge variant={run.status === "submitted" ? "secondary" : "outline"}>
                  {run.status === "submitted"
                    ? "Completed"
                    : run.status === "in_progress"
                      ? `${run.answeredCount} of ${run.totalQuestions}`
                      : "Not started"}
                </Badge>
              </div>
              {run.status !== "submitted" ? <Progress value={pct} className="mt-2" /> : null}
              <div className="mt-3">
                {run.kind === "diagnostic" ? (
                  run.status === "submitted" ? (
                    <Button asChild size="sm" variant="outline">
                      <Link to="/diagnostic/complete/$token" params={{ token: run.accessToken }}>
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> View confirmation
                      </Link>
                    </Button>
                  ) : (
                    <Button asChild size="sm">
                      <Link to="/diagnostic/session/$token" params={{ token: run.accessToken }}>
                        <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
                        {run.status === "in_progress" ? "Resume diagnostic" : "Start diagnostic"}
                      </Link>
                    </Button>
                  )
                ) : (
                  <Button asChild size="sm" variant={run.status === "submitted" ? "outline" : "default"}>
                    <Link to="/free-check/$checkId" params={{ checkId: run.checkId }}>
                      {run.status === "submitted" ? (
                        <>
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> View confirmation
                        </>
                      ) : (
                        <>
                          <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
                          {run.status === "in_progress" ? "Resume check" : "Start free check"}
                        </>
                      )}
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

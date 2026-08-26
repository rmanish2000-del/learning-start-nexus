// UX Phase 1 · UX-14 — educator cohort progress entry view.
import type { CohortProgress } from "@/lib/educator-board-shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function CohortProgressCard({
  cohort,
  isPending,
}: {
  cohort?: CohortProgress | undefined;
  isPending?: boolean | undefined;
}) {
  const worstMastery = cohort?.subjects.length
    ? Math.max(...cohort.subjects.map((s) => s.averageMastery), 1)
    : 1;

  return (
    <Card data-testid="cohort-progress">
      <CardHeader>
        <CardTitle className="text-base">Cohort progress</CardTitle>
        <CardDescription>
          Class mastery, active gaps and closures this term — subjects ordered worst first.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isPending && <Skeleton className="h-32 w-full" />}
        {!isPending && cohort && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Class average mastery", value: `${cohort.averageMastery}%` },
                { label: "Active gaps", value: String(cohort.activeGaps) },
                { label: "Gaps closed this term", value: String(cohort.gapsClosedThisTerm) },
                { label: "Closure rate", value: `${cohort.closureRatePct}%` },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {s.label}
                  </p>
                  <p className="mt-1 text-xl font-semibold tabular-nums">{s.value}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {cohort.subjects.map((s) => (
                <div key={s.subject} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{s.subject}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {s.averageMastery}% mastery · {s.openGaps} open · {s.closedGaps} closed
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.round((s.averageMastery / worstMastery) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
              {cohort.subjects.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No subject data yet.
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

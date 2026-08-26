// UX Phase 1 · UX-03 — educator class gap heatmap (learner × subject).
import { Link } from "@tanstack/react-router";

import {
  HEAT_BAND_CLASSES,
  HEAT_BAND_LABELS,
  RISK_LABELS,
  heatBand,
  type ClassGapMatrix,
  type RiskLevel,
} from "@/lib/educator-board-shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function RiskBadge({ risk }: { risk: RiskLevel }) {
  if (risk === "critical") return <Badge variant="destructive">{RISK_LABELS.critical}</Badge>;
  if (risk === "at_risk")
    return (
      <Badge className="bg-amber-500/15 text-amber-600 hover:bg-amber-500/15 dark:text-amber-400">
        {RISK_LABELS.at_risk}
      </Badge>
    );
  return <Badge variant="secondary">{RISK_LABELS.on_track}</Badge>;
}

export function GapHeatmap({
  matrix,
  isPending,
}: {
  matrix?: ClassGapMatrix | undefined;
  isPending?: boolean | undefined;
}) {
  return (
    <Card data-testid="gap-heatmap">
      <CardHeader>
        <CardTitle className="text-base">Class gap heatmap</CardTitle>
        <CardDescription>
          Open gaps per learner and subject, worst first. Click any learner to open their profile.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isPending && <Skeleton className="h-40 w-full" />}
        {!isPending && matrix && matrix.rows.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">No learners on the roster yet.</p>
        )}
        {!isPending && matrix && matrix.rows.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-separate border-spacing-y-1 text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-2 py-1 text-left font-medium">Learner</th>
                    {matrix.subjects.map((s) => (
                      <th key={s} className="px-2 py-1 text-center font-medium">
                        {s}
                      </th>
                    ))}
                    <th className="px-2 py-1 text-center font-medium">Total</th>
                    <th className="px-2 py-1 text-right font-medium">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {matrix.rows.map((row) => (
                    <tr key={row.learnerId}>
                      <td className="px-2 py-1">
                        <Link
                          to="/learners/$learnerId"
                          params={{ learnerId: row.learnerId }}
                          className="font-medium hover:underline"
                        >
                          {row.learnerName}
                        </Link>
                        <span className="ml-2 text-xs text-muted-foreground">
                          G{row.grade} · {row.mastery}%
                        </span>
                      </td>
                      {row.cells.map((cell) => (
                        <td key={cell.subject} className="px-1 py-1">
                          <Link
                            to="/learners/$learnerId"
                            params={{ learnerId: row.learnerId }}
                            className={`block rounded-md py-1.5 text-center text-xs font-semibold tabular-nums transition-opacity hover:opacity-80 ${HEAT_BAND_CLASSES[heatBand(cell.openGaps)]}`}
                            aria-label={`${row.learnerName} — ${cell.subject}: ${cell.openGaps} open gaps`}
                          >
                            {cell.openGaps}
                          </Link>
                        </td>
                      ))}
                      <td className="px-2 py-1 text-center text-sm font-semibold tabular-nums">
                        {row.total}
                      </td>
                      <td className="px-2 py-1 text-right">
                        <RiskBadge risk={row.risk} />
                      </td>
                    </tr>
                  ))}
                  <tr className="text-xs text-muted-foreground">
                    <td className="px-2 pt-2 font-medium uppercase tracking-wide">Subject total</td>
                    {matrix.columnTotals.map((c) => (
                      <td key={c.subject} className="px-2 pt-2 text-center font-semibold tabular-nums">
                        {c.openGaps}
                      </td>
                    ))}
                    <td className="px-2 pt-2 text-center font-semibold tabular-nums">
                      {matrix.totalOpenGaps}
                    </td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Density:</span>
              {([0, 1, 2, 3, 4] as const).map((band) => (
                <span
                  key={band}
                  className={`rounded px-2 py-0.5 font-medium ${HEAT_BAND_CLASSES[band]}`}
                >
                  {HEAT_BAND_LABELS[band]}
                </span>
              ))}
              <span>· Risk: 5+ gaps or mastery under 50% is Critical; 2+ gaps or under 70% is At risk.</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

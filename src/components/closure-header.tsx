// UX Phase 1 · UX-02 — shared closure header strip.
// The same four numbers on every role's first screen: gaps closed of total,
// closure rate, active gaps needing action, and the mastery trend direction.

import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryError } from "@/components/query-error";
import { fmtClosureRate, fmtTrend, type ClosureSummary } from "@/lib/closure-shared";
import { cn } from "@/lib/utils";

type Props = {
  summary: ClosureSummary | null | undefined;
  isPending?: boolean;
  error?: unknown;
  onRetry?: () => void;
};

function Tile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: string | undefined;
}) {
  return (
    <div className="min-w-0 flex-1 px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold tabular-nums", accent)}>{value}</p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export function ClosureHeader({ summary, isPending, error, onRetry }: Props) {
  if (error) {
    return (
      <QueryError
        title="Closure numbers didn't load"
        error={error}
        {...(onRetry ? { onRetry } : {})}
      />
    );
  }

  if (isPending || !summary) {
    return <Skeleton className="h-24 w-full" data-testid="closure-header-loading" />;
  }

  const TrendIcon =
    summary.trend === "up" ? TrendingUp : summary.trend === "down" ? TrendingDown : Minus;

  return (
    <Card data-testid="closure-header">
      <CardContent className="flex flex-wrap items-stretch gap-y-2 divide-x p-0">
        <Tile
          label="Gaps closed"
          value={`${summary.gapsClosed} of ${summary.gapsTotal}`}
          hint={summary.scopeLabel}
        />
        <Tile
          label="Closure rate"
          value={fmtClosureRate(summary.closureRatePct)}
          hint="This term"
        />
        <Tile
          label="Active gaps"
          value={String(summary.activeGaps)}
          hint={summary.activeGaps === 0 ? "Nothing outstanding" : "Needing action"}
          accent={summary.activeGaps > 0 ? "text-foreground" : undefined}
        />
        <div className="min-w-0 flex-1 px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Trend
          </p>
          <p
            className={cn(
              "mt-1 flex items-center gap-1.5 text-2xl font-semibold tabular-nums",
              summary.trend === "up" && "text-primary",
              summary.trend === "down" && "text-destructive",
            )}
          >
            <TrendIcon className="h-5 w-5" />
            {summary.masteryLiftAvg === null
              ? "—"
              : `${summary.masteryLiftAvg >= 0 ? "+" : ""}${summary.masteryLiftAvg}`}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {fmtTrend(summary.masteryLiftAvg)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

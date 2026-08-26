// UX Phase 1 · UX-02 — one shared closure vocabulary for every role.
// Pure, browser-safe. Turns the existing OutcomeMetrics into the four numbers
// that appear identically on /home, /dashboard and /parent.

import type { OutcomeMetrics } from "./outcome-dashboard-shared";

export type ClosureTrend = "up" | "down" | "flat";

export type ClosureSummary = {
  scopeLabel: string;
  gapsClosed: number;
  gapsTotal: number;
  closureRatePct: number | null;
  activeGaps: number;
  masteryLiftAvg: number | null;
  trend: ClosureTrend;
};

export function summariseClosure(scopeLabel: string, m: OutcomeMetrics): ClosureSummary {
  const lift = m.masteryLiftAvg;
  return {
    scopeLabel,
    gapsClosed: m.gapsClosed,
    gapsTotal: m.gapsTotal,
    closureRatePct: m.gapClosureRatePct,
    activeGaps: Math.max(m.gapsTotal - m.gapsClosed, 0),
    masteryLiftAvg: lift,
    trend: lift === null || lift === 0 ? "flat" : lift > 0 ? "up" : "down",
  };
}

export function fmtClosureRate(value: number | null): string {
  return value === null ? "—" : `${value}%`;
}

export function fmtTrend(value: number | null): string {
  return value === null ? "No reassessments yet" : `${value >= 0 ? "+" : ""}${value} pts mastery lift`;
}

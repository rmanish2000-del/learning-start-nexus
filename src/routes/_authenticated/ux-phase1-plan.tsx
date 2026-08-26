import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  NO_REDESIGN_REFERENCE,
  PLAN_ITEMS,
  PLAN_META,
  SEQUENCE,
  type PlanItem,
  type Priority,
} from "@/lib/ux-phase1-plan";

export const Route = createFileRoute("/_authenticated/ux-phase1-plan")({
  component: UxPhase1PlanPage,
  head: () => ({
    meta: [
      { title: "UX Phase 1 Implementation Plan | EduOS" },
      {
        name: "description",
        content:
          "Screen-by-screen comparison of the live EduOS workspace against the UX redesign, with P0/P1/P2 prioritisation, effort, risk and system impact.",
      },
      { property: "og:title", content: "UX Phase 1 Implementation Plan | EduOS" },
      {
        property: "og:description",
        content:
          "Prioritised UX Phase 1 plan for EduOS: current state, proposed state, business and user value, effort, risk and implementation order.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const PRIORITY_STYLES: Record<Priority, string> = {
  P0: "bg-destructive/10 text-destructive border-destructive/30",
  P1: "bg-primary/10 text-primary border-primary/30",
  P2: "bg-muted text-muted-foreground border-border",
};

const EFFORT_LABEL: Record<PlanItem["effort"], string> = {
  S: "Small (≤2 days)",
  M: "Medium (3–5 days)",
  L: "Large (1–2 weeks)",
};

function ItemCard({ item }: { item: PlanItem }) {
  return (
    <Card id={item.id}>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={PRIORITY_STYLES[item.priority]}>
            {item.priority}
          </Badge>
          <span className="font-mono text-xs text-muted-foreground">{item.id}</span>
          <Badge variant="secondary">{item.role}</Badge>
        </div>
        <CardTitle className="text-base">{item.title}</CardTitle>
        <CardDescription>Redesign reference: {item.figmaRef}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Current state
            </p>
            <p className="mt-1">{item.currentState}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Proposed state
            </p>
            <p className="mt-1">{item.proposedState}</p>
          </div>
        </div>
        <Separator />
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Business value
            </p>
            <p className="mt-1">{item.businessValue}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              User value
            </p>
            <p className="mt-1">{item.userValue}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Engineering effort
            </p>
            <p className="mt-1">
              <span className="font-medium">{EFFORT_LABEL[item.effort]}</span> — {item.effortNote}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Risk
            </p>
            <p className="mt-1">
              <span className="font-medium">{item.risk}</span> — {item.riskNote}
            </p>
          </div>
        </div>
        <Separator />
        <dl className="grid gap-3 md:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Components affected
            </dt>
            <dd className="mt-1 font-mono text-xs">{item.components.join(", ")}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Screens affected
            </dt>
            <dd className="mt-1 font-mono text-xs">{item.screens.join(", ")}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Database impact
            </dt>
            <dd className="mt-1">{item.dbImpact}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              API impact
            </dt>
            <dd className="mt-1">{item.apiImpact}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

function UxPhase1PlanPage() {
  const [filter, setFilter] = useState<Priority | "ALL">("ALL");

  const counts = useMemo(() => {
    return {
      P0: PLAN_ITEMS.filter((i) => i.priority === "P0").length,
      P1: PLAN_ITEMS.filter((i) => i.priority === "P1").length,
      P2: PLAN_ITEMS.filter((i) => i.priority === "P2").length,
    };
  }, []);

  const visible = useMemo(
    () => (filter === "ALL" ? PLAN_ITEMS : PLAN_ITEMS.filter((i) => i.priority === filter)),
    [filter],
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">UX Phase 1 implementation plan</h1>
        <p className="text-sm text-muted-foreground">
          Screen-by-screen comparison of the live workspace against the UX redesign prototype,
          prioritised for pilot outcomes — student outcomes, parent trust, educator efficiency and
          reviewer evidence flow — not aesthetics.
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <span>Live app: {PLAN_META.liveApp}</span>
          <span>Redesign: {PLAN_META.figma}</span>
          <span>Reviewed: {PLAN_META.reviewedOn}</span>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Review scope</CardTitle>
          <CardDescription>
            {PLAN_META.figmaScreens.length} redesign screens read across{" "}
            {PLAN_META.portalsReviewed.join(", ")}. {PLAN_ITEMS.length} changes identified.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex flex-wrap gap-2">
            {PLAN_META.figmaScreens.map((s) => (
              <Badge key={s} variant="secondary" className="font-normal">
                {s}
              </Badge>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3">
              <p className="text-2xl font-semibold">{counts.P0}</p>
              <p className="text-xs text-muted-foreground">P0 — high impact, low risk, immediate</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-2xl font-semibold">{counts.P1}</p>
              <p className="text-xs text-muted-foreground">P1 — important, medium effort</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-2xl font-semibold">{counts.P2}</p>
              <p className="text-xs text-muted-foreground">P2 — nice to have</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recommended implementation order</CardTitle>
          <CardDescription>
            Sequenced so that read-only wins land first and every write path arrives after
            verification is authoritative.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {SEQUENCE.map((wave) => (
            <div key={wave.wave} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{wave.wave}</p>
                <Badge variant="outline">{wave.window}</Badge>
                {wave.items.map((id) => (
                  <span key={id} className="font-mono text-xs text-muted-foreground">
                    {id}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-muted-foreground">{wave.rationale}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        {(["ALL", "P0", "P1", "P2"] as const).map((p) => (
          <Button
            key={p}
            size="sm"
            variant={filter === p ? "default" : "outline"}
            onClick={() => setFilter(p)}
          >
            {p === "ALL" ? `All (${PLAN_ITEMS.length})` : `${p} (${counts[p]})`}
          </Button>
        ))}
      </div>

      <div className="space-y-4">
        {visible.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">No redesign reference</CardTitle>
          <CardDescription>
            Live screens with no counterpart in the redesign prototype. These are recorded as-is —
            no designs were invented for them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {NO_REDESIGN_REFERENCE.map((entry) => (
              <li key={entry.screen} className="rounded-md border p-3">
                <p className="font-mono text-xs">{entry.screen}</p>
                <p className="mt-1 text-muted-foreground">{entry.note}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

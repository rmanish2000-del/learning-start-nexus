import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, BookOpenCheck, TrendingUp, TriangleAlert, Users } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getOrgOutcomeSummary } from "@/lib/outcomes.functions";

type Learner = Database["public"]["Tables"]["learners"]["Row"];
type Evidence = Database["public"]["Tables"]["learner_evidence"]["Row"];

export const Route = createFileRoute("/_authenticated/dashboard")({
  beforeLoad: ({ context }) => {
    if (context.role === "student") throw redirect({ to: "/home" });
  },
  head: () => ({
    meta: [
      { title: "Dashboard — EduOS" },
      { name: "description", content: "Roster health, mastery trends, and recent learning evidence." },
      { property: "og:title", content: "Dashboard — EduOS" },
      { property: "og:description", content: "Roster health, mastery trends, and recent learning evidence." },
    ],
  }),
  component: DashboardPage,
});

export function statusBadge(status: Learner["status"]) {
  if (status === "needs_attention")
    return <Badge variant="destructive">Needs attention</Badge>;
  if (status === "paused") return <Badge variant="outline">Paused</Badge>;
  return <Badge variant="secondary">Active</Badge>;
}

export function liftText(lift: number) {
  const rounded = Math.round(lift * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded}`;
}

function DashboardPage() {
  const { role, profile } = Route.useRouteContext();
  const fetchOutcomeSummary = useServerFn(getOrgOutcomeSummary);

  const { data: outcomeSummary } = useQuery({
    queryKey: ["outcome-summary"],
    queryFn: () => fetchOutcomeSummary(),
  });

  const { data: learners, isPending } = useQuery({
    queryKey: ["learners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("learners").select("*").order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: evidence } = useQuery({
    queryKey: ["recent-evidence"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learner_evidence")
        .select("*")
        .order("recorded_on", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  const roster = learners ?? [];
  const total = roster.length;
  const avgMastery = total ? Math.round(roster.reduce((s, l) => s + l.mastery_score, 0) / total) : 0;
  const avgLift = total
    ? Math.round((roster.reduce((s, l) => s + Number(l.mastery_lift), 0) / total) * 10) / 10
    : 0;
  const attention = roster.filter((l) => l.status === "needs_attention" || l.mastery_score < 60);
  const nameByLearner = new Map(roster.map((l) => [l.id, l.full_name]));
  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  const stats = [
    { label: "Learners", value: String(total), icon: Users, hint: role === "admin" ? "Across the center" : "On your roster" },
    { label: "Average mastery", value: `${avgMastery}%`, icon: BookOpenCheck, hint: "Across active learners" },
    { label: "Avg 30-day lift", value: liftText(avgLift), icon: TrendingUp, hint: "Points gained this month" },
    { label: "Needs attention", value: String(attention.length), icon: TriangleAlert, hint: "Below 60% or flagged" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">
          {role === "admin" ? "Center overview" : `Welcome back, ${firstName}`}
        </h2>
        <p className="text-sm text-muted-foreground">
          {role === "admin"
            ? "Organization-wide roster health for Brightpath Learning."
            : "Here's how your roster is doing today."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wide">
                {stat.label}
              </CardDescription>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isPending ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <p className="text-2xl font-semibold tracking-tight">{stat.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Intervention outcomes</CardTitle>
            <CardDescription>
              Reassessment results across the organization — diagnostic vs post-intervention
            </CardDescription>
          </div>
          <Link
            to="/sprint-5-audit"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Audit <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: "Improvement", value: outcomeSummary?.improvement, tone: "text-emerald-600 dark:text-emerald-400" },
              { label: "No improvement", value: outcomeSummary?.noImprovement, tone: "text-destructive" },
              { label: "Low confidence", value: outcomeSummary?.lowConfidence, tone: "text-amber-600 dark:text-amber-400" },
              { label: "Requires review", value: outcomeSummary?.requiresReview, tone: "text-muted-foreground" },
              {
                label: "Avg lift",
                value:
                  outcomeSummary && outcomeSummary.averageLift !== null
                    ? `${outcomeSummary.averageLift >= 0 ? "+" : ""}${outcomeSummary.averageLift} pts`
                    : null,
                tone: "text-foreground",
              },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {s.label}
                </p>
                <p className={`mt-1 text-xl font-semibold tabular-nums ${s.tone}`}>
                  {s.value === undefined ? "…" : (s.value ?? "—")}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Roster</CardTitle>
              <CardDescription>Sorted by lowest mastery first</CardDescription>
            </div>
            <Link
              to="/learners"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-1">
            {isPending && (
              <div className="space-y-2">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            )}
            {[...roster]
              .sort((a, b) => a.mastery_score - b.mastery_score)
              .slice(0, 6)
              .map((learner) => (
                <Link
                  key={learner.id}
                  to="/learners/$learnerId"
                  params={{ learnerId: learner.id }}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                    {learner.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{learner.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Grade {learner.grade} · {learner.subject}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">{learner.mastery_score}%</p>
                    <p className="text-xs text-muted-foreground tabular-nums">{liftText(Number(learner.mastery_lift))} pts</p>
                  </div>
                  {statusBadge(learner.status)}
                </Link>
              ))}
            {!isPending && roster.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No learners yet — add your first learner from the Learners screen.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent evidence</CardTitle>
            <CardDescription>Latest observations and work logged</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(evidence ?? []).map((item: Evidence) => (
              <div key={item.id} className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {nameByLearner.get(item.learner_id) ?? "Learner"} · {item.kind} · {item.recorded_on}
                  </p>
                </div>
              </div>
            ))}
            {(evidence ?? []).length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No evidence logged yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

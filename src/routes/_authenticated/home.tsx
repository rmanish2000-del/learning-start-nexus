import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, CircleCheck, CircleDashed, Loader, Sparkles } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { MasteryChart } from "@/components/mastery-chart";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/home")({
  beforeLoad: ({ context }) => {
    if (context.role !== "student") throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Home — EduOS" },
      { name: "description", content: "Your learning plan, progress, and what's next." },
      { property: "og:title", content: "Home — EduOS" },
      { property: "og:description", content: "Your learning plan, progress, and what's next." },
    ],
  }),
  component: StudentHomePage,
});

function itemIcon(status: string) {
  if (status === "completed") return <CircleCheck className="h-5 w-5 text-primary" />;
  if (status === "in_progress") return <Loader className="h-5 w-5 text-primary" />;
  return <CircleDashed className="h-5 w-5 text-muted-foreground" />;
}

function StudentHomePage() {
  const { user, profile } = Route.useRouteContext();

  const { data: learner, isPending: learnerPending } = useQuery({
    queryKey: ["my-learner", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learners")
        .select("*")
        .eq("student_user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: items } = useQuery({
    queryKey: ["my-learning-items", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learning_items")
        .select("*")
        .eq("student_user_id", user.id)
        .order("due", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: history } = useQuery({
    queryKey: ["mastery-history", learner?.id],
    enabled: !!learner,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mastery_history")
        .select("*")
        .eq("learner_id", learner!.id)
        .order("recorded_on");
      if (error) throw error;
      return data;
    },
  });

  const { data: planItems } = useQuery({
    queryKey: ["plan-items", learner?.id],
    enabled: !!learner,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learning_plan_items")
        .select("*")
        .eq("learner_id", learner!.id)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";
  const continueItem = (items ?? []).find((i) => i.status === "in_progress") ?? (items ?? []).find((i) => i.status === "not_started");
  const completed = (items ?? []).filter((i) => i.status === "completed").length;
  const chartData = (history ?? []).map((h) => ({ date: h.recorded_on.slice(5), score: h.score }));
  const nextPlanItems = (planItems ?? []).filter((p) => p.status !== "completed").slice(0, 3);

  if (learnerPending) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Hi {firstName}</h2>
        <p className="text-sm text-muted-foreground">
          {learner ? `Grade ${learner.grade} · ${learner.subject}` : "Welcome to EduOS"}
        </p>
      </div>

      {!learner && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Your educator hasn't linked your learner profile yet — check back soon.
          </CardContent>
        </Card>
      )}

      {learner?.focus_note && (
        <Card className="border-l-4 border-l-primary">
          <CardContent className="flex gap-3 py-4">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Your focus this week
              </p>
              <p className="mt-1 text-sm">{learner.focus_note}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {continueItem && (
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="flex flex-wrap items-center gap-4 py-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-foreground/15">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-primary-foreground/70">
                Continue learning
              </p>
              <p className="truncate text-lg font-semibold">{continueItem.title}</p>
              <div className="mt-2 flex items-center gap-3">
                <Progress
                  value={continueItem.progress_pct}
                  className="h-1.5 max-w-48 bg-primary-foreground/20"
                />
                <span className="text-xs text-primary-foreground/80">{continueItem.progress_pct}%</span>
              </div>
            </div>
            <Badge variant="secondary" className="capitalize">{continueItem.kind}</Badge>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wide">
              Current mastery
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{learner?.mastery_score ?? 0}%</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {Number(learner?.mastery_lift ?? 0) >= 0 ? "+" : ""}
              {learner?.mastery_lift ?? 0} points in the last 30 days
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wide">
              Activities completed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {completed}/{(items ?? []).length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Keep going — you're building momentum</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">My mastery</CardTitle>
          <CardDescription>How your score has grown</CardDescription>
        </CardHeader>
        <CardContent>
          <MasteryChart data={chartData} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">My activities</CardTitle>
            <CardDescription>Everything assigned to you</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(items ?? []).map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-lg border p-3">
                {itemIcon(item.status)}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.kind}
                    {item.due ? ` · due ${item.due}` : ""}
                  </p>
                </div>
                {item.status !== "completed" && (
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </div>
            ))}
            {(items ?? []).length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No activities assigned yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">What's next</CardTitle>
            <CardDescription>From your learning plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {nextPlanItems.map((item) => (
              <div key={item.id} className="rounded-lg border p-3">
                <p className="text-sm font-medium">{item.focus}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{item.activity}</p>
              </div>
            ))}
            {nextPlanItems.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Your plan is all caught up. Nice work!
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

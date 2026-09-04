// Automated verification console: dry-run preview, evidence log, and the
// explicit action that promotes high-confidence drafts to "EduOS verified".
// Admin (write) / reviewer (read) only. Named-SME certification is unaffected.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ContextHelp } from "@/components/context-help";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, PlayCircle, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { QueryError } from "@/components/query-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { friendlyErrorMessage } from "@/lib/user-errors";
import {
  getAutoVerificationFn,
  runAutoVerificationFn,
} from "@/lib/auto-verification.functions";
import { AUTO_VERIFICATION_ENGINE_VERSION } from "@/lib/auto-verification-shared";

export const Route = createFileRoute("/_authenticated/auto-verification")({
  component: AutoVerificationPage,
  head: () => ({
    meta: [
      { title: "Automated Verification — Class 10 Question Bank | EduOS" },
      {
        name: "description",
        content:
          "Deterministic verification of Class 10 CBSE draft questions: accuracy, curriculum alignment, distractor and explanation quality, duplicates and pool separation.",
      },
      { property: "og:title", content: "Automated Verification Console | EduOS" },
      {
        property: "og:description",
        content:
          "Preview and apply EduOS automated verification, with an append-only evidence log for every decision.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function AutoVerificationPage() {
  const queryClient = useQueryClient();
  const load = useServerFn(getAutoVerificationFn);
  const run = useServerFn(runAutoVerificationFn);

  const query = useQuery({ queryKey: ["auto-verification"], queryFn: () => load() });
  const mutation = useMutation({
    mutationFn: () => run(),
    onSuccess: (summary) => {
      toast.success(
        `${summary.autoApproved} auto-approved, ${summary.quarantined} held for named SME review.`,
      );
      void queryClient.invalidateQueries({ queryKey: ["auto-verification"] });
    },
    onError: (error) => toast.error(friendlyErrorMessage(error)),
  });

  if (query.isLoading) return <Skeleton className="h-96 w-full" />;
  if (query.isError) return <QueryError error={query.error} onRetry={() => query.refetch()} />;
  const data = query.data!;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Automated verification</h1>
          <ContextHelp page="/auto-verification" />
        </div>
        <p className="text-muted-foreground max-w-3xl text-sm">
          Engine v{AUTO_VERIFICATION_ENGINE_VERSION}. Every draft is checked for answer
          correctness, curriculum alignment, distractor and explanation quality, ambiguity,
          copyright contamination, duplication and diagnostic/reassessment pool separation. Only
          items passing every machine-checkable test with strong evidence are marked{" "}
          <strong>EduOS verified</strong>; everything else is held for named SME review.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Named SME verified</CardDescription>
            <CardTitle className="text-2xl">{data.evidence.tiers.namedSme}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>EduOS verified (automated)</CardDescription>
            <CardTitle className="text-2xl">{data.evidence.tiers.eduosAutomated}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Still unverified drafts</CardDescription>
            <CardTitle className="text-2xl">{data.evidence.tiers.unverifiedDrafts}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PlayCircle className="h-4 w-4" aria-hidden /> Dry run on the current drafts
          </CardTitle>
          <CardDescription>
            {data.summary.evaluated} drafts evaluated · {data.summary.autoApproved} would be
            auto-approved · {data.summary.quarantined} would be held.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {data.summary.bySubject.map((row) => (
              <div key={row.subject} className="flex items-center justify-between text-sm">
                <span>{row.subject}</span>
                <span className="text-muted-foreground">
                  {row.autoApproved} approve · {row.quarantined} hold
                </span>
              </div>
            ))}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Most common blocking checks</p>
            {data.summary.byFailedCheck.length === 0 ? (
              <p className="text-muted-foreground text-sm">No blocking checks.</p>
            ) : (
              data.summary.byFailedCheck.map((row) => (
                <div key={row.checkId} className="flex items-center justify-between text-sm">
                  <span>{row.checkId}</span>
                  <span className="text-muted-foreground">{row.items} items</span>
                </div>
              ))
            )}
          </div>
          <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Running…" : "Run verification and apply"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BadgeCheck className="h-4 w-4" aria-hidden /> Evidence log
          </CardTitle>
          <CardDescription>
            {data.evidence.totals.runs} runs · {data.evidence.totals.autoApproved} approvals ·{" "}
            {data.evidence.totals.quarantined} holds. Append-only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.evidence.latest.length === 0 ? (
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <ShieldAlert className="h-4 w-4" aria-hidden /> No automated run has been applied yet.
            </p>
          ) : (
            data.evidence.latest.map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="font-mono text-xs">{row.externalRef ?? row.questionId}</span>
                <span className="flex items-center gap-2">
                  <Badge variant={row.outcome === "auto_approved" ? "secondary" : "outline"}>
                    {row.outcome === "auto_approved" ? "EduOS verified" : "Held"}
                  </Badge>
                  <span className="text-muted-foreground">
                    {Math.round(row.confidence * 100)}% · {new Date(row.createdAt).toLocaleString()}
                  </span>
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

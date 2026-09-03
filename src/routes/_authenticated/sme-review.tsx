// Named-SME review of the 326 existing Class 10 (2026-27) drafts.
// Reviewer/admin only. One explicit decision at a time — no bulk approval.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, BadgeCheck, Copy, ShieldCheck, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { friendlyErrorMessage } from "@/lib/user-errors";
import { getSmeReviewFn, recordSmeDecisionFn } from "@/lib/sme-review.functions";
import {
  NCERT_OVERLAP_CANDIDATES,
  NEAR_DUPLICATE_PAIRS,
  SME_SUBJECTS,
  SME_WORKFLOW_RULES,
  type SmeSubject,
} from "@/lib/sme-review-shared";

export const Route = createFileRoute("/_authenticated/sme-review")({
  component: SmeReviewPage,
  head: () => ({
    meta: [
      { title: "SME Review — Class 10 Draft Questions | EduOS" },
      {
        name: "description",
        content:
          "Named subject-expert review of the 326 Class 10 CBSE 2026-27 draft questions, with per-item decisions and an append-only audit trail.",
      },
      { property: "og:title", content: "Named SME Review Queue | EduOS" },
      {
        property: "og:description",
        content:
          "Reviewer-only queue for Class 10 Mathematics and Science drafts. Explicit approvals only, append-only decision history.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function fmt(value: string | null): string {
  return value ? new Date(value).toLocaleString() : "—";
}

function SmeReviewPage() {
  const queryClient = useQueryClient();
  const load = useServerFn(getSmeReviewFn);
  const decide = useServerFn(recordSmeDecisionFn);
  const [reviewerName, setReviewerName] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [subject, setSubject] = useState<SmeSubject>("Mathematics");

  const query = useQuery({ queryKey: ["sme-review"], queryFn: () => load() });

  const mutation = useMutation({
    mutationFn: (vars: { questionId: string; action: "verified" | "rejected" }) =>
      decide({
        data: {
          questionId: vars.questionId,
          action: vars.action,
          reviewerName: reviewerName.trim(),
          note: notes[vars.questionId]?.trim() || null,
        },
      }),
    onSuccess: (_r, vars) => {
      toast.success(vars.action === "verified" ? "Question approved" : "Question rejected");
      void queryClient.invalidateQueries({ queryKey: ["sme-review"] });
    },
    onError: (error) => toast.error(friendlyErrorMessage(error)),
  });

  const data = query.data;
  const visible = useMemo(
    () => (data?.items ?? []).filter((i) => i.subject === subject).slice(0, 60),
    [data, subject],
  );

  if (query.isLoading) return <Skeleton className="h-96 w-full" />;
  if (query.isError) return <QueryError error={query.error} onRetry={() => query.refetch()} />;

  const nameReady = reviewerName.trim().length >= 2;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Named SME review queue</h1>
        <p className="text-muted-foreground max-w-3xl text-sm">
          Review of the existing Class 10 CBSE 2026–27 draft questions. No new content is created
          here. Both subjects remain <strong>NOT_CERTIFIED</strong> and the Science source book
          remains unapproved until named subject-expert decisions are recorded.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Queue reconciliation</CardTitle>
          <CardDescription>Expected versus live counts in the question bank.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {(data?.summaries ?? []).map((s) => (
            <div key={s.subject} className="rounded-lg border p-4">
              <p className="text-sm font-medium">{s.subject}</p>
              <p className="text-2xl font-semibold">{s.drafts}</p>
              <p className="text-muted-foreground text-xs">
                expected {s.expected} · approved {s.approved} · rejected {s.rejected}
              </p>
              <Badge variant={s.reconciled ? "secondary" : "destructive"} className="mt-2">
                {s.reconciled ? "Reconciled" : "Mismatch"}
              </Badge>
            </div>
          ))}
          <div className="rounded-lg border p-4">
            <p className="text-sm font-medium">Combined</p>
            <p className="text-2xl font-semibold">{data?.total ?? 0}</p>
            <p className="text-muted-foreground text-xs">unique items under review</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-4" /> Review rules in force
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
            {SME_WORKFLOW_RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reviewer identity</CardTitle>
          <CardDescription>
            Recorded with every decision in the append-only trail. Required before any decision.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            value={reviewerName}
            onChange={(e) => setReviewerName(e.target.value)}
            placeholder="Full name and qualification of the reviewing subject expert"
            aria-label="Named reviewer"
            className="max-w-xl"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="size-4" /> Advisory candidates
          </CardTitle>
          <CardDescription>
            Flagged for a human ruling only. Nothing is rejected or rewritten automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="font-medium">
              NCERT verbatim-overlap candidates ({NCERT_OVERLAP_CANDIDATES.length})
            </p>
            <ul className="text-muted-foreground mt-1 space-y-1">
              {NCERT_OVERLAP_CANDIDATES.map((c) => (
                <li key={c.externalRef}>
                  <code>{c.externalRef}</code> — “{c.matchedShingle}”
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-medium">
              Near-duplicate pair candidates ({NEAR_DUPLICATE_PAIRS.length})
            </p>
            <ul className="text-muted-foreground mt-1 space-y-1">
              {NEAR_DUPLICATE_PAIRS.map((p) => (
                <li key={`${p.a}-${p.b}`}>
                  <code>{p.a}</code> ↔ <code>{p.b}</code> · similarity{" "}
                  {(p.similarity * 100).toFixed(1)}%
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Tabs value={subject} onValueChange={(v) => setSubject(v as SmeSubject)}>
        <TabsList>
          {SME_SUBJECTS.map((s) => (
            <TabsTrigger key={s} value={s}>
              {s}
            </TabsTrigger>
          ))}
        </TabsList>
        {SME_SUBJECTS.map((s) => (
          <TabsContent key={s} value={s} className="space-y-4">
            {visible.length === 0 ? (
              <p className="text-muted-foreground text-sm">No draft items awaiting review.</p>
            ) : null}
            {visible.map((item) => (
              <Card key={item.id}>
                <CardHeader className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{item.externalRef ?? item.id.slice(0, 8)}</Badge>
                    <Badge variant="secondary">{item.unitTitle}</Badge>
                    <Badge variant="secondary">Difficulty {item.difficulty}</Badge>
                    {item.overlapCandidate ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="size-3" /> NCERT overlap candidate
                      </Badge>
                    ) : null}
                    {item.nearDuplicateOf ? (
                      <Badge variant="destructive" className="gap-1">
                        <Copy className="size-3" /> Near-duplicate of {item.nearDuplicateOf}
                      </Badge>
                    ) : null}
                  </div>
                  <CardTitle className="text-base leading-relaxed">{item.prompt}</CardTitle>
                  <CardDescription>
                    {item.outcomeCode} — {item.outcomeTitle}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {item.stimulus ? (
                    <p className="text-muted-foreground">{item.stimulus}</p>
                  ) : null}
                  <p>
                    <span className="font-medium">Answer:</span> {item.correctAnswer}
                  </p>
                  {item.explanation ? (
                    <p className="text-muted-foreground">{item.explanation}</p>
                  ) : null}
                  <Textarea
                    value={notes[item.id] ?? ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [item.id]: e.target.value }))}
                    placeholder="Reviewer comment or required correction (optional)"
                    aria-label={`Reviewer comment for ${item.externalRef ?? item.id}`}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={!nameReady || mutation.isPending}
                      onClick={() =>
                        mutation.mutate({ questionId: item.id, action: "verified" })
                      }
                    >
                      <BadgeCheck className="mr-1 size-4" /> Approve this question
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={!nameReady || mutation.isPending}
                      onClick={() =>
                        mutation.mutate({ questionId: item.id, action: "rejected" })
                      }
                    >
                      <XCircle className="mr-1 size-4" /> Reject
                    </Button>
                  </div>
                  {!nameReady ? (
                    <p className="text-muted-foreground text-xs">
                      Enter the reviewing expert&apos;s name above to enable decisions.
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        ))}
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Append-only decision trail</CardTitle>
          <CardDescription>
            Recorded decisions cannot be edited or deleted. Most recent 100 shown.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(data?.trail ?? []).length === 0 ? (
            <p className="text-muted-foreground">No decisions recorded yet.</p>
          ) : (
            (data?.trail ?? []).map((e) => (
              <div key={e.id} className="flex flex-wrap items-center gap-2 border-b py-2">
                <Badge variant={e.action === "verified" ? "secondary" : "destructive"}>
                  {e.action === "verified" ? "Approved" : "Rejected"}
                </Badge>
                <code className="text-xs">{e.externalRef ?? e.questionId.slice(0, 8)}</code>
                <span className="text-muted-foreground">{e.reviewerName}</span>
                <span className="text-muted-foreground text-xs">{fmt(e.createdAt)}</span>
                {e.note ? <span className="text-muted-foreground text-xs">{e.note}</span> : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

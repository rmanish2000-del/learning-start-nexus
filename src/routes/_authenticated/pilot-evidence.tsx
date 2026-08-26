// Pilot Evidence Foundation (P0): M6 tutor evidence per gap, M7 CBSE
// question-type tagging, M8 reviewer verification with an append-only trail.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, Clock, MessageSquare, XCircle } from "lucide-react";
import { useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getPilotEvidenceFn, verifyQuestionFn } from "@/lib/pilot-evidence.functions";
import {
  CBSE_KIND_LABELS,
  CBSE_KIND_RULES,
  CBSE_KINDS,
  COHORT_FORMULAS,
  TUTOR_MINUTES_FORMULA,
  VERIFICATION_LABELS,
  VERIFICATION_RULES,
} from "@/lib/pilot-evidence-shared";

export const Route = createFileRoute("/_authenticated/pilot-evidence")({
  component: PilotEvidencePage,
  head: () => ({
    meta: [
      { title: "Pilot Evidence — Tutor Minutes, CBSE Types, Verification | EduOS" },
      {
        name: "description",
        content:
          "Per-gap AI tutor evidence, CBSE competency question-type coverage and reviewer verification with a full audit trail.",
      },
      { property: "og:title", content: "Pilot Evidence Foundation | EduOS" },
      {
        property: "og:description",
        content:
          "Tutor minutes per gap, CBSE question-type coverage and append-only reviewer verification.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const authRoute = getRouteApi("/_authenticated");

function fmt(value: string | null): string {
  return value ? new Date(value).toLocaleString() : "—";
}

function PilotEvidencePage() {
  const { role } = authRoute.useRouteContext();
  const queryClient = useQueryClient();
  const load = useServerFn(getPilotEvidenceFn);
  const verify = useServerFn(verifyQuestionFn);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const query = useQuery({
    queryKey: ["pilot-evidence"],
    queryFn: () => load(),
  });

  const mutation = useMutation({
    mutationFn: (input: { questionId: string; action: "verified" | "rejected"; note: string }) =>
      verify({ data: { ...input, note: input.note || null } }),
    onSuccess: (_r, input) => {
      toast.success(input.action === "verified" ? "Question verified" : "Question rejected");
      void queryClient.invalidateQueries({ queryKey: ["pilot-evidence"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <QueryError
        title="We couldn't load the pilot evidence"
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const { tutor, coverage, verification, cohort } = query.data;
  const canVerify = role === "admin" || role === "reviewer";

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Pilot evidence</h1>
        <p className="text-muted-foreground text-sm">
          Three evidence lines a pilot reviewer can check independently: tutor effort per gap,
          CBSE competency coverage in the question bank, and who verified what, when.
        </p>
      </header>

      <Tabs defaultValue="tutor">
        <TabsList>
          <TabsTrigger value="tutor">Tutor evidence</TabsTrigger>
          <TabsTrigger value="cbse">CBSE question types</TabsTrigger>
          <TabsTrigger value="verification">Reviewer verification</TabsTrigger>
          <TabsTrigger value="cohort">Cohort metrics</TabsTrigger>
        </TabsList>

        {/* -------------------------------------------------- M6 */}
        <TabsContent value="tutor" className="space-y-4 pt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: "Gaps with tutor evidence", value: tutor.totals.gapsWithTutorEvidence },
              { label: "Tutor sessions", value: tutor.totals.sessions },
              { label: "Tutor minutes", value: tutor.totals.tutorMinutes },
              { label: "Interactions", value: tutor.totals.interactions },
              { label: "Substantive", value: tutor.totals.substantiveInteractions },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardHeader className="pb-2">
                  <CardDescription>{stat.label}</CardDescription>
                  <CardTitle className="text-2xl tabular-nums">{stat.value}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Per-gap tutor logging</CardTitle>
              <CardDescription>
                Each row ties AI tutor effort to one detected learning gap.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tutor.rows.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No tutor activity has been logged against a gap yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-muted-foreground border-b text-left">
                      <tr>
                        <th className="py-2 pr-3 font-medium">Learner</th>
                        <th className="py-2 pr-3 font-medium">Gap</th>
                        <th className="py-2 pr-3 font-medium">Status</th>
                        <th className="py-2 pr-3 text-right font-medium">Sessions</th>
                        <th className="py-2 pr-3 text-right font-medium">Minutes</th>
                        <th className="py-2 pr-3 text-right font-medium">Interactions</th>
                        <th className="py-2 pr-3 text-right font-medium">Substantive</th>
                        <th className="py-2 pr-3 font-medium">Last activity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tutor.rows.map((row) => (
                        <tr key={row.gapId} className="border-b last:border-0">
                          <td className="py-2 pr-3">{row.learnerName}</td>
                          <td className="py-2 pr-3">
                            <span className="font-medium">{row.subtopic}</span>
                            <span className="text-muted-foreground"> · {row.topic}</span>
                          </td>
                          <td className="py-2 pr-3">
                            <Badge variant="outline">{row.gapStatus}</Badge>
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums">{row.sessions}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{row.tutorMinutes}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{row.interactions}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">
                            {row.substantiveInteractions}
                          </td>
                          <td className="text-muted-foreground py-2 pr-3">{fmt(row.lastAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="size-4" /> How these numbers are produced
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-2 text-sm">
              {TUTOR_MINUTES_FORMULA.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* -------------------------------------------------- M7 */}
        <TabsContent value="cbse" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">CBSE competency types</CardTitle>
              <CardDescription>
                The question bank now tags and generates all four competency-based formats.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {CBSE_KINDS.map((kind) => {
                const row = coverage.find((c) => c.kind === kind);
                return (
                  <div key={kind} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{CBSE_KIND_LABELS[kind]}</span>
                      <Badge variant={row && row.total > 0 ? "default" : "outline"}>
                        {row?.total ?? 0} in bank
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-1 text-sm">{CBSE_KIND_RULES[kind]}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bank coverage by question type</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground border-b text-left">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Type</th>
                    <th className="py-2 pr-3 font-medium">Family</th>
                    <th className="py-2 pr-3 text-right font-medium">Total</th>
                    <th className="py-2 pr-3 text-right font-medium">Approved</th>
                    <th className="py-2 pr-3 text-right font-medium">Verified</th>
                  </tr>
                </thead>
                <tbody>
                  {coverage.map((row) => (
                    <tr key={row.kind} className="border-b last:border-0">
                      <td className="py-2 pr-3">{row.label}</td>
                      <td className="py-2 pr-3">
                        <Badge variant={row.cbse ? "default" : "secondary"}>
                          {row.cbse ? "CBSE competency" : "Core"}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">{row.total}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{row.approved}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{row.verified}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* -------------------------------------------------- M8 */}
        <TabsContent value="verification" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Verification rules</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-2 text-sm">
              {VERIFICATION_RULES.map((rule) => (
                <p key={rule}>{rule}</p>
              ))}
              {!canVerify && (
                <p className="text-foreground font-medium">
                  Your role can read this evidence but cannot record verifications.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Question verification queue</CardTitle>
              <CardDescription>
                {verification.questions.filter((q) => q.verificationState === "verified").length} of{" "}
                {verification.questions.length} shown questions verified.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {verification.questions.slice(0, 25).map((q) => (
                <div key={q.id} className="space-y-2 rounded-lg border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{q.outcomeCode}</Badge>
                    <Badge variant={q.cbse ? "default" : "secondary"}>{q.kindLabel}</Badge>
                    <Badge
                      variant={
                        q.verificationState === "verified"
                          ? "default"
                          : q.verificationState === "rejected"
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {VERIFICATION_LABELS[q.verificationState]}
                    </Badge>
                  </div>
                  {q.stimulus && (
                    <p className="bg-muted text-muted-foreground rounded-md p-2 text-sm whitespace-pre-line">
                      {q.stimulus}
                    </p>
                  )}
                  <p className="text-sm font-medium">{q.prompt}</p>
                  <p className="text-muted-foreground text-sm">Answer key: {q.correctAnswer}</p>
                  {q.verificationState !== "unverified" && (
                    <p className="text-muted-foreground text-xs">
                      {VERIFICATION_LABELS[q.verificationState]} by {q.verifiedByName ?? "Reviewer"}{" "}
                      on {fmt(q.verifiedAt)}
                      {q.verificationNote ? ` — “${q.verificationNote}”` : ""}
                    </p>
                  )}
                  {canVerify && (
                    <div className="space-y-2">
                      <Textarea
                        value={notes[q.id] ?? ""}
                        onChange={(e) => setNotes((n) => ({ ...n, [q.id]: e.target.value }))}
                        placeholder="Reviewer note (optional)"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={mutation.isPending}
                          onClick={() =>
                            mutation.mutate({
                              questionId: q.id,
                              action: "verified",
                              note: notes[q.id] ?? "",
                            })
                          }
                        >
                          <BadgeCheck className="size-4" /> Verify
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={mutation.isPending}
                          onClick={() =>
                            mutation.mutate({
                              questionId: q.id,
                              action: "rejected",
                              note: notes[q.id] ?? "",
                            })
                          }
                        >
                          <XCircle className="size-4" /> Reject
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {verification.questions.length === 0 && (
                <p className="text-muted-foreground text-sm">No questions in the bank yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="size-4" /> Audit trail
              </CardTitle>
              <CardDescription>Append-only log of every verification decision.</CardDescription>
            </CardHeader>
            <CardContent>
              {verification.trail.length === 0 ? (
                <p className="text-muted-foreground text-sm">No verifications recorded yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {verification.trail.map((event) => (
                    <li key={event.id} className="rounded-md border p-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={event.action === "verified" ? "default" : "destructive"}>
                          {event.action}
                        </Badge>
                        <span className="font-medium">{event.reviewerName}</span>
                        <span className="text-muted-foreground">{fmt(event.createdAt)}</span>
                      </div>
                      <p className="text-muted-foreground mt-1 line-clamp-2">
                        {event.questionPrompt}
                      </p>
                      {event.note && <p className="mt-1">“{event.note}”</p>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* -------------------------------------------------- Cohort */}
        <TabsContent value="cohort" className="space-y-4 pt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: "Cohort size", value: String(cohort.cohortSize) },
              { label: "Completion rate", value: `${cohort.completionRatePct}%` },
              { label: "Dropout rate", value: `${cohort.dropoutRatePct}%` },
              { label: "Assessments assigned", value: String(cohort.assigned) },
              { label: "Assessments submitted", value: String(cohort.submitted) },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardHeader className="pb-2">
                  <CardDescription>{stat.label}</CardDescription>
                  <CardTitle className="text-2xl tabular-nums">{stat.value}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {[
              { title: "Baseline distribution", data: cohort.baseline },
              { title: "Reassessment distribution", data: cohort.reassessment },
            ].map((panel) => {
              const total = panel.data.scores.length;
              return (
                <Card key={panel.title}>
                  <CardHeader>
                    <CardTitle className="text-base">{panel.title}</CardTitle>
                    <CardDescription>
                      {total} scored {total === 1 ? "outcome" : "outcomes"}
                      {panel.data.mean !== null ? ` · mean ${panel.data.mean}%` : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {panel.data.bands.map((band) => (
                      <div key={band.label} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{band.label}</span>
                          <span className="text-muted-foreground tabular-nums">{band.count}</span>
                        </div>
                        <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                          <div
                            className="bg-primary h-full rounded-full"
                            style={{ width: `${total === 0 ? 0 : (band.count / total) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    {total === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        No scored outcomes yet — the distribution fills as the pilot runs.
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Participation detail</CardTitle>
              <CardDescription>
                Mean lift{" "}
                {cohort.meanLift === null
                  ? "—"
                  : `${cohort.meanLift > 0 ? "+" : ""}${cohort.meanLift} pts`}{" "}
                across outcomes with both a baseline and a reassessment.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
              <div>
                <p className="text-muted-foreground">Learners assigned</p>
                <p className="text-lg tabular-nums">{cohort.learnersAssigned}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Learners completed</p>
                <p className="text-lg tabular-nums">{cohort.learnersCompleted}</p>
              </div>
              <div>
                <p className="text-muted-foreground">In progress</p>
                <p className="text-lg tabular-nums">{cohort.inProgress}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Dropped out</p>
                <p className="text-lg tabular-nums">{cohort.droppedOut}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">How these numbers are produced</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {COHORT_FORMULAS.map((line) => (
                <p key={line} className="text-muted-foreground text-sm">
                  {line}
                </p>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

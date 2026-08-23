import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { ArrowDown, ClipboardCheck, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Mono, fmt } from "@/components/audit-shared";
import { getAssessmentAuditReport } from "@/lib/audit.functions";

export const Route = createFileRoute("/_authenticated/assessment-audit")({
  head: () => ({
    meta: [
      { title: "Assessment Audit Report — EduOS" },
      {
        name: "description",
        content:
          "End-to-end audit chain for one completed assessment: assessment, responses, server-side scoring, learner assessment record, and learner evidence record — with IDs and timestamps.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AssessmentAuditPage,
});

const authRoute = getRouteApi("/_authenticated");

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-0.5 text-sm">{children}</div>
    </div>
  );
}

function ChainArrow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 pl-6 text-xs text-muted-foreground">
      <ArrowDown className="h-4 w-4" />
      <span className="font-medium uppercase tracking-wide">{label}</span>
    </div>
  );
}

function AssessmentAuditPage() {
  const { role } = authRoute.useRouteContext();
  const isStaff = role === "admin" || role === "educator";

  const fetchReport = useServerFn(getAssessmentAuditReport);
  const report = useQuery({
    queryKey: ["assessment-audit-report"],
    queryFn: () => fetchReport(),
    enabled: isStaff,
    staleTime: 10_000,
  });

  if (!isStaff) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assessment Audit Report</CardTitle>
            <CardDescription>
              The audit chain reads staff-scoped records. Sign in as an admin or educator to
              view it.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const chain = report.data?.chain ?? null;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <ClipboardCheck className="h-5 w-5 text-primary" /> Assessment Audit Report
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The most recently submitted assessment in your organization, traced end-to-end
            through every database record it produced.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => report.refetch()}
          disabled={report.isFetching}
        >
          <RefreshCw className={report.isFetching ? "animate-spin" : ""} /> Refresh
        </Button>
      </div>

      {report.data ? (
        <p className="text-xs text-muted-foreground">
          Generated {fmt(report.data.generatedAt)} · Org:{" "}
          <span className="font-medium text-foreground">{report.data.me.orgName ?? "—"}</span>
        </p>
      ) : null}

      {report.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading audit chain…</p>
      ) : !chain ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No submitted assessment exists in your organization yet. Have a student complete
            one, then reload this page.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {/* Step 1 — Assessment */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">1 · Assessment</CardTitle>
              <CardDescription>assessments row</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="ID">
                <Mono>{chain.assessment.id}</Mono>
              </Field>
              <Field label="Title">{chain.assessment.title}</Field>
              <Field label="Subject / Topic">
                {chain.assessment.subject} · {chain.assessment.topic}
              </Field>
              <Field label="Grade">{chain.assessment.grade}</Field>
              <Field label="Kind">
                <Badge variant="outline">{chain.assessment.kind}</Badge>
              </Field>
              <Field label="Status">
                <Badge variant="secondary">{chain.assessment.status}</Badge>
              </Field>
              <Field label="Created at">{fmt(chain.assessment.createdAt)}</Field>
            </CardContent>
          </Card>

          <ChainArrow label="assigned to learner → responses stored" />

          {/* Step 2 — Responses */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">2 · Responses</CardTitle>
              <CardDescription>assessment_sessions row (server-persisted answers)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Session ID">
                  <Mono>{chain.session.id}</Mono>
                </Field>
                <Field label="Learner">
                  {chain.session.learnerName} <Mono>({chain.session.learnerId})</Mono>
                </Field>
                <Field label="Status">
                  <Badge variant="secondary">{chain.session.status}</Badge>
                </Field>
                <Field label="Answers stored">{chain.session.answeredCount}</Field>
                <Field label="Started at">{fmt(chain.session.startedAt)}</Field>
                <Field label="Last activity">{fmt(chain.session.lastActivityAt)}</Field>
                <Field label="Submitted at">{fmt(chain.session.submittedAt)}</Field>
                <Field label="Session created">{fmt(chain.session.createdAt)}</Field>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Verbatim answers JSON (as stored)
                </p>
                <pre className="max-h-44 overflow-auto rounded-md bg-muted/50 p-2.5 font-mono text-xs">
                  {JSON.stringify(chain.session.answers, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>

          <ChainArrow label="submit → server-side scoring" />

          {/* Step 3 — Server scoring */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">3 · Server Scoring</CardTitle>
              <CardDescription>
                Computed inside the submitAssessment server function; the client only sends a
                session ID. Score source: assessment_sessions.score_pct / result columns.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Score">
                  <span className="text-lg font-semibold">
                    {chain.scoring.scorePct ?? "—"}%
                  </span>
                </Field>
                <Field label="Correct">
                  {chain.scoring.correctCount ?? "—"} / {chain.scoring.totalCount ?? "—"}
                </Field>
                <Field label="Scored at">{fmt(chain.scoring.submittedAt)}</Field>
                <Field label="Breakdown entries">{chain.scoring.breakdown.length}</Field>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item ID</TableHead>
                    <TableHead>Subtopic</TableHead>
                    <TableHead>Given</TableHead>
                    <TableHead>Correct answer</TableHead>
                    <TableHead>Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chain.scoring.breakdown.map((b) => (
                    <TableRow key={b.item_id}>
                      <TableCell>
                        <Mono>{b.item_id.slice(0, 8)}…</Mono>
                      </TableCell>
                      <TableCell className="text-xs">{b.subtopic}</TableCell>
                      <TableCell className="font-mono text-xs">{b.given || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{b.correct_answer}</TableCell>
                      <TableCell>
                        <Badge variant={b.correct ? "secondary" : "destructive"}>
                          {b.correct ? "correct" : "wrong"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <ChainArrow label="evidence generation → learner record" />

          {/* Step 4 — Learner assessment record */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">4 · Learner Assessment Record</CardTitle>
              <CardDescription>learner_assessments row written at submission</CardDescription>
            </CardHeader>
            <CardContent>
              {chain.learnerAssessment ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="ID">
                    <Mono>{chain.learnerAssessment.id}</Mono>
                  </Field>
                  <Field label="Title">{chain.learnerAssessment.title}</Field>
                  <Field label="Subject">{chain.learnerAssessment.subject}</Field>
                  <Field label="Score">{chain.learnerAssessment.score ?? "—"}%</Field>
                  <Field label="Status">
                    <Badge variant="secondary">{chain.learnerAssessment.status}</Badge>
                  </Field>
                  <Field label="Taken on">{chain.learnerAssessment.takenOn ?? "—"}</Field>
                  <Field label="Created at">{fmt(chain.learnerAssessment.createdAt)}</Field>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No matching learner_assessments row found for this submission window.
                </p>
              )}
            </CardContent>
          </Card>

          <ChainArrow label="evidence generation → evidence entry" />

          {/* Step 5 — Learner evidence record */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">5 · Learner Evidence Record</CardTitle>
              <CardDescription>learner_evidence row written at submission</CardDescription>
            </CardHeader>
            <CardContent>
              {chain.evidence ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="ID">
                    <Mono>{chain.evidence.id}</Mono>
                  </Field>
                  <Field label="Title">{chain.evidence.title}</Field>
                  <Field label="Kind">
                    <Badge variant="outline">{chain.evidence.kind}</Badge>
                  </Field>
                  <Field label="Recorded on">{chain.evidence.recordedOn}</Field>
                  <Field label="Created at">{fmt(chain.evidence.createdAt)}</Field>
                  <Field label="Note">{chain.evidence.note ?? "—"}</Field>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No matching learner_evidence row found for this submission window.
                </p>
              )}
            </CardContent>
          </Card>

          <p className="pt-1 text-xs text-muted-foreground">
            Join keys: learner <Mono>{chain.joinKeys.learnerId}</Mono> · assessment title “
            {chain.joinKeys.assessmentTitle}” · submitted {fmt(chain.joinKeys.submittedAt)}.
            Records 4–5 are written in the same server request as the submission and matched
            within a 10-minute window.
          </p>
        </div>
      )}
    </div>
  );
}

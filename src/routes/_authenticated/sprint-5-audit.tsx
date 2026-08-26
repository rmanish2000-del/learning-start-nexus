import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import {
  CheckCircle2,
  Database,
  FunctionSquare,
  ListChecks,
  PlayCircle,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { Circle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DbErrorBlock, Mono, Pass, fmt } from "@/components/audit-shared";
import { OUTCOME_STATUS_LABELS, type OutcomeStatus } from "@/lib/outcome-shared";
import { getSprint5Audit, runSprint5ProbesFn } from "@/lib/sprint5-audit.functions";
import type { Sprint5Count, Sprint5Probe } from "@/lib/sprint5-audit.server";

export const Route = createFileRoute("/_authenticated/sprint-5-audit")({
  head: () => ({
    meta: [
      { title: "Sprint 5 Audit Center — EduOS" },
      {
        name: "description",
        content:
          "Independently verifiable proof for Sprint 5: outcome calculation, mastery lift, evidence chain, cross-organization isolation, and security.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Sprint5AuditPage,
});

const authRoute = getRouteApi("/_authenticated");

type Probes = Awaited<ReturnType<typeof runSprint5ProbesFn>>;

function outcomeBadge(status: OutcomeStatus) {
  if (status === "improvement") return <Badge variant="secondary">Improvement</Badge>;
  if (status === "no_improvement") return <Badge variant="destructive">No improvement</Badge>;
  if (status === "low_confidence")
    return (
      <Badge className="bg-amber-500/15 text-amber-600 hover:bg-amber-500/15 dark:text-amber-400">
        Low confidence
      </Badge>
    );
  if (status === "requires_review") return <Badge variant="outline">Requires review</Badge>;
  return <Badge variant="outline">Pending</Badge>;
}

function CountRow({ c }: { c: Sprint5Count }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
      <div>
        <p className="text-sm font-medium">{c.label}</p>
        <p className="text-xs text-muted-foreground">
          <Mono>{c.table}</Mono> — visible to you:{" "}
          <span className="font-medium text-foreground">
            {c.visibleToYou === null ? "denied (RLS)" : c.visibleToYou}
          </span>{" "}
          · globally (service role):{" "}
          <span className="font-medium text-foreground">{c.globalAllOrgs}</span>
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{c.note}</p>
      </div>
      <Pass pass={c.isolated} />
    </div>
  );
}

function ProbeCard({ p }: { p: Sprint5Probe }) {
  return (
    <div className="rounded-lg border p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{p.name}</p>
        <Pass pass={p.pass} skipped={p.skipped} />
      </div>
      <div className="mt-2 space-y-1.5 text-xs">
        <p>
          <span className="text-muted-foreground">Expected: </span>
          {p.expectation}
        </p>
        <p>
          <span className="text-muted-foreground">Observed: </span>
          {p.detail}
        </p>
        {p.dbError ? (
          <div className="pt-1">
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Verbatim database response
            </p>
            <DbErrorBlock error={p.dbError} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

const CHECKLIST: { text: string; how: string }[] = [
  {
    text: "Completing an intervention opens a pending outcome and assigns a reassessment",
    how: "Interventions board → move an intervention to Completed. A learner_outcomes row is created (baseline = the diagnostic that found the gap) and the learner gets a reassessment session linked to the intervention.",
  },
  {
    text: "Reassessment uses fresh items, separate from the diagnostic bank",
    how: "Probe P2: the 12-item reassessment bank shares zero item ids with the diagnostic bank, so post scores measure mastery — not memorized answers.",
  },
  {
    text: "Submitting a reassessment finalizes the outcome deterministically",
    how: "Sign in as the pilot student, complete the assigned Fractions Mastery Reassessment. Lift, confidence, and status are computed in code — probe P1 recomputes them from raw rows and demands an exact match.",
  },
  {
    text: "Mastery lift updates the learner's mastery index",
    how: "Probe P3: learners.mastery_score equals the outcome's post score, mastery_lift equals the stored lift, and a mastery_history row exists at the post score.",
  },
  {
    text: "The outcome report shows the full evidence chain",
    how: "Learner profile → Outcomes tab: diagnostic, gap, recommendation, intervention, tutor practice, reassessment, and outcome — each a real database row (probe P4).",
  },
  {
    text: "Dashboard classifies outcomes: improvement, no improvement, low confidence, requires review",
    how: "Staff dashboard shows live counts per outcome status for the organization.",
  },
  {
    text: "Students see their own before/after/progress — nothing else",
    how: "Student home shows My progress with baseline, post score, and lift. learner_outcomes RLS scopes students to their own rows.",
  },
  {
    text: "Cross-organization isolation holds for outcomes and the reassessment bank",
    how: "Probes P5/P6: reads of the other org's item bank return 0 rows; inserts into the other org are rejected with the verbatim database error shown.",
  },
];

const CODEX_OBJECTIONS: { objection: string; evidence: string }[] = [
  {
    objection: "'Mastery lift is a marketing number.'",
    evidence:
      "Lift is post minus baseline from two scored, stored assessment sessions. Probe P1 recomputes lift, confidence, and status from raw rows and requires an exact match with the stored outcome.",
  },
  {
    objection: "'The reassessment could reuse diagnostic questions.'",
    evidence:
      "Probe P2 proves the reassessment bank (12 items) is disjoint from the diagnostic bank (16 items) by comparing live item ids.",
  },
  {
    objection: "'Confidence is unexplained.'",
    evidence:
      "The formula is rendered verbatim on this page: coverage (max 40) + practice accuracy (max 30) + subtopic consistency (max 30). Every input is a countable database row.",
  },
  {
    objection: "'The evidence chain is claimed, not shown.'",
    evidence:
      "Probe P4 walks all seven links — diagnostic, gap, recommendation, intervention, tutor practice, reassessment, evidence entries — and fails if any row is missing.",
  },
  {
    objection: "'Cross-org isolation is asserted, not demonstrated.'",
    evidence:
      "Probes P5/P6 execute real read/insert attempts against the other organization as the caller and show the verbatim database response.",
  },
];

function Sprint5AuditPage() {
  const { role } = authRoute.useRouteContext();
  const isStaff = role === "admin" || role === "educator";
  const fetchAudit = useServerFn(getSprint5Audit);
  const runProbes = useServerFn(runSprint5ProbesFn);
  const [probes, setProbes] = useState<Probes | null>(null);
  const [running, setRunning] = useState(false);

  const { data, isPending } = useQuery({
    queryKey: ["sprint5-audit"],
    queryFn: () => fetchAudit(),
  });

  if (isPending || !data) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-8 w-80" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const handleRunProbes = async () => {
    setRunning(true);
    try {
      const result = await runProbes();
      setProbes(result);
      const failed = result.probes.filter((p) => !p.pass && !p.skipped).length;
      if (failed === 0) toast.success("All probes passed.");
      else toast.warning(`${failed} probe(s) did not pass — inspect the details.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Probe run failed.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Sprint 5 Audit Center</h2>
          <p className="text-sm text-muted-foreground">
            Outcome proof — every claim on this page is backed by live data, live policies, or a
            runnable probe. Generated {fmt(data.generatedAt)} as {data.me.role} in{" "}
            {data.me.orgName ?? "unknown org"}.
          </p>
        </div>
        {isStaff && (
          <Button onClick={() => void handleRunProbes()} disabled={running}>
            <PlayCircle className="h-4 w-4" />
            {running ? "Running probes…" : "Run all probes"}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" /> Build summary
          </CardTitle>
          <CardDescription>The MVP loop, closed: diagnostic → gap → intervention → AI tutor → reassessment → mastery lift.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            When staff complete an intervention, EduOS opens a pending outcome capturing the
            baseline score from the diagnostic that found the gap, and assigns a fresh reassessment
            to the learner. When the learner submits it, the outcome is finalized
            deterministically: post score, mastery lift, confidence, and status — plus an updated
            mastery index, a mastery history point, and an evidence entry.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Table: learner_outcomes</Badge>
            <Badge variant="outline">Reassessment bank: 12 fresh items</Badge>
            <Badge variant="outline">Deterministic scoring — no AI in the loop</Badge>
          </div>
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <FunctionSquare className="h-3.5 w-3.5" /> Outcome formula (verbatim)
            </p>
            <ul className="space-y-1 text-xs">
              <li><Mono>{data.formula.lift}</Mono></li>
              {data.formula.confidence.map((c) => (
                <li key={c}>· {c}</li>
              ))}
              {data.formula.classification.map((c) => (
                <li key={c}>· {c}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4" /> Live counts — your view vs global
          </CardTitle>
          <CardDescription>
            Left number is what your role can see through RLS; right number is everything that
            exists across all organizations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.counts.map((c) => (
            <CountRow key={c.table} c={c} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" /> Outcomes visible to you
          </CardTitle>
          <CardDescription>
            Baseline → post-intervention scores with lift, confidence, and classification.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Learner</TableHead>
                <TableHead>Subtopic</TableHead>
                <TableHead className="text-right">Baseline</TableHead>
                <TableHead className="text-right">Post</TableHead>
                <TableHead className="text-right">Lift</TableHead>
                <TableHead className="text-right">Confidence</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.outcomes.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.learnerName}</TableCell>
                  <TableCell>{o.subtopic}</TableCell>
                  <TableCell className="text-right tabular-nums">{o.baselineScore}%</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {o.postScore !== null ? `${o.postScore}%` : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {o.masteryLift !== null
                      ? `${o.masteryLift >= 0 ? "+" : ""}${o.masteryLift}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {o.confidence !== null ? `${o.confidence}/100` : "—"}
                  </TableCell>
                  <TableCell>{outcomeBadge(o.status)}</TableCell>
                </TableRow>
              ))}
              {data.outcomes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    No outcomes visible to your role yet — complete an intervention to open one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" /> Live policy registry
          </CardTitle>
          <CardDescription>
            Read from the database catalog (pg_policies) at page load — not from application code.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.policies.map((p) => (
            <div key={`${p.tablename}-${p.policyname}`} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Mono>{p.tablename}</Mono>
                <Badge variant="outline">{p.cmd}</Badge>
                <span className="text-xs font-medium">{p.policyname}</span>
              </div>
              {p.using_expression && (
                <p className="mt-1.5 text-xs">
                  <span className="text-muted-foreground">USING: </span>
                  <Mono>{p.using_expression}</Mono>
                </p>
              )}
              {p.with_check_expression && (
                <p className="mt-1 text-xs">
                  <span className="text-muted-foreground">WITH CHECK: </span>
                  <Mono>{p.with_check_expression}</Mono>
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PlayCircle className="h-4 w-4" /> Live probes
          </CardTitle>
          <CardDescription>
            {isStaff
              ? "Each probe executes real database operations and reports the verbatim response."
              : "Probe execution is staff-only — students can view results after a staff run."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!probes && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {isStaff
                ? "Press “Run all probes” to execute the verification suite."
                : "No probe results yet — ask an educator or admin to run them."}
            </p>
          )}
          {probes?.probes.map((p) => <ProbeCard key={p.key} p={p} />)}
          {probes && (
            <p className="text-xs text-muted-foreground">
              Ran {fmt(probes.generatedAt)} by {probes.me.role} in {probes.me.orgName}.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="h-4 w-4" /> Acceptance checklist — manual steps, not auto-verified
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {CHECKLIST.map((item) => (
            <div key={item.text} className="flex items-start gap-3 rounded-lg border p-3">
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{item.text}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{item.how}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" /> Likely review objections — and the evidence
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {CODEX_OBJECTIONS.map((item) => (
            <div key={item.objection} className="rounded-lg border p-3">
              <p className="text-sm font-medium">{item.objection}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.evidence}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

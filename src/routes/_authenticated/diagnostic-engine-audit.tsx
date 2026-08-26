import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  Database,
  Gauge,
  GitBranch,
  ListChecks,
  PlayCircle,
  ShieldCheck,
} from "lucide-react";
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
import { getDiagnosticAudit, runEngineProbesFn } from "@/lib/diagnostic-audit.functions";
import type { EngineCount, EngineProbe } from "@/lib/diagnostic-audit.server";
import { DIAG_EXPECTED } from "@/lib/diagnostic-audit.server";
import { RISK_BAND_LABELS } from "@/lib/diagnostic-shared";

export const Route = createFileRoute("/_authenticated/diagnostic-engine-audit")({
  head: () => ({
    meta: [
      { title: "Diagnostic Engine Audit Center — EduOS" },
      {
        name: "description",
        content:
          "Independently verifiable proof for Sprint 6F: weight-compliant diagnostic generation, outcome coverage, reassessment separation, and question reuse rules.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DiagnosticEngineAuditPage,
});

type Probes = Awaited<ReturnType<typeof runEngineProbesFn>>;

function CountRow({ c }: { c: EngineCount }) {
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

function ProbeCard({ p }: { p: EngineProbe }) {
  return (
    <div className="rounded-lg border p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{p.name}</p>
        <Pass pass={p.pass} skipped={p.skipped ?? false} />
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
    text: "Diagnostic templates generate for any curriculum path (Board → Grade → Subject → Book)",
    how: "/diagnostic-engine step 1 — the cascading selectors resolve to a book; templates are derived from that book's blueprint. Probe P1 verifies the seeded generated pair.",
  },
  {
    text: "Question allocation follows blueprint weights",
    how: "The engine uses largest-remainder rounding over diagnostic weights. Probe P2 recomputes the allocation from live weights and requires an exact match with stored question counts.",
  },
  {
    text: "Diagnostic preview shows outcome, weight, question count, and difficulty mix before creation",
    how: "/diagnostic-engine step 3 — the preview table renders the exact plan that the server will persist.",
  },
  {
    text: "Blueprint compliance shows target coverage, actual coverage, and coverage gap",
    how: "/diagnostic-engine step 4 — measured weight ÷ total weight. Probe P3 verifies every coverable outcome is measured.",
  },
  {
    text: "Reassessment templates are generated separately with no question overlap while alternatives exist",
    how: "Probe P4 requires zero shared question ids between the diagnostic and its reassessment.",
  },
  {
    text: "Reassessments prefer unused approved questions",
    how: "Probe P5 requires every reassessment question to be approved and unused by any other assessment.",
  },
  {
    text: "Gap prediction preview flags high-risk outcomes from curriculum weighting only",
    how: "Risk score = diagnostic weight × outcome difficulty, banded against the unit mean — deterministic, no learner data, no AI.",
  },
  {
    text: "Generation never auto-assigns, auto-creates interventions, or changes mastery",
    how: "Probe P6 requires the only sessions on the generated pair to be the two seeded Sprint 6G demo submissions, and engine events limited to diagnostic_generated log rows. The generate function writes only assessments, question maps, and book events.",
  },
  {
    text: "Organization isolation and role gates hold on engine outputs",
    how: "This page → isolation counts + probes P7–P9. Cross-org reads return 0 rows, cross-org writes are rejected, reviewers are read-only.",
  },
];

function DiagnosticEngineAuditPage() {
  const runProbes = useServerFn(runEngineProbesFn);
  const [probes, setProbes] = useState<Probes | null>(null);
  const [running, setRunning] = useState(false);

  const { data, isPending } = useQuery({
    queryKey: ["diagnostic-engine-audit"],
    queryFn: () => getDiagnosticAudit(),
  });

  const handleRun = async () => {
    setRunning(true);
    try {
      const result = await runProbes();
      setProbes(result);
      const passing = result.probes.filter((p) => p.pass).length;
      toast.success(`Probes finished — ${passing}/${result.probes.length} passing.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Probe run failed.");
    } finally {
      setRunning(false);
    }
  };

  if (isPending || !data) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-8 w-80" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const snap = data.snapshot;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Diagnostic Engine Audit Center</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Independently verifiable proof for Sprint 6F — the engine generates diagnostics and
            reassessments from curriculum outcomes and approved questions, allocated by blueprint
            weight. Signed in with role <Mono>{data.me.role}</Mono> in{" "}
            <Mono>{data.me.orgName ?? "—"}</Mono>.
          </p>
        </div>
        <Button onClick={() => void handleRun()} disabled={running}>
          <PlayCircle className="h-4 w-4" />
          {running ? "Running probes…" : "Run probe suite"}
        </Button>
      </div>

      {/* Probe results */}
      {probes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Probe suite — {probes.probes.filter((p) => p.pass).length}/{probes.probes.length}{" "}
              passing
            </CardTitle>
            <CardDescription>
              Ran {fmt(probes.generatedAt)} with role <Mono>{probes.me.role}</Mono> in{" "}
              <Mono>{probes.me.orgName ?? "—"}</Mono>. The write-gate probe adapts to the caller:
              staff prove a create/delete round-trip; reviewers prove their writes are rejected.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {probes.probes.map((p) => (
              <ProbeCard key={p.key} p={p} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Generated pair snapshot with recomputed allocation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge className="h-4 w-4 text-primary" />
            Seeded generated pair — allocation recomputed live
          </CardTitle>
          <CardDescription>
            “{DIAG_EXPECTED.diagnosticTitle}” + “{DIAG_EXPECTED.reassessmentTitle}”, re-derived from
            live blueprint weights and the approved bank. Stored counts must equal recomputed
            counts; overlap must be zero.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Pass pass={snap.diagnosticPresent && snap.reassessmentPresent} />
            <div className="flex flex-wrap gap-1.5 text-xs">
              <Badge variant="outline">diagnostic: {snap.diagnosticQuestions}q · {snap.diagnosticStatus}</Badge>
              <Badge variant="outline">reassessment: {snap.reassessmentQuestions}q · {snap.reassessmentStatus}</Badge>
              <Badge variant={snap.overlapCount === 0 ? "outline" : "destructive"}>
                overlap: {snap.overlapCount}
              </Badge>
              <Badge variant={snap.reusedCount === 0 ? "outline" : "destructive"}>
                reused: {snap.reusedCount}
              </Badge>
            </div>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Bank (approved)</TableHead>
                  <TableHead>Diagnostic stored</TableHead>
                  <TableHead>Diagnostic recomputed</TableHead>
                  <TableHead>Reassessment stored</TableHead>
                  <TableHead>Reassessment recomputed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snap.rows.map((r) => (
                  <TableRow key={r.code}>
                    <TableCell>
                      <p className="font-mono text-xs">{r.code}</p>
                      <p className="max-w-48 truncate text-xs text-muted-foreground">{r.title}</p>
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">{r.weight}%</TableCell>
                    <TableCell className="text-xs tabular-nums">{r.approvedInBank}</TableCell>
                    <TableCell className="text-xs tabular-nums">{r.diagnosticStored}</TableCell>
                    <TableCell className="text-xs tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        {r.diagnosticRecomputed}
                        {r.diagnosticRecomputed === r.diagnosticStored ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <span className="font-medium text-destructive">≠</span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">{r.reassessmentStored}</TableCell>
                    <TableCell className="text-xs tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        {r.reassessmentRecomputed}
                        {r.reassessmentRecomputed === r.reassessmentStored ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <span className="font-medium text-destructive">≠</span>
                        )}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Risk preview, recomputed */}
          {snap.risks.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Gap prediction preview (recomputed) — weight × difficulty
              </p>
              <div className="flex flex-wrap gap-1.5">
                {snap.risks.map((r) => (
                  <Badge
                    key={r.outcomeId}
                    variant="outline"
                    className={
                      r.band === "high"
                        ? "border-destructive/40 bg-destructive/10 text-destructive"
                        : r.band === "watch"
                          ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : ""
                    }
                  >
                    {r.code} · {r.riskScore} · {RISK_BAND_LABELS[r.band]}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Isolation counts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4 text-primary" />
            Organization isolation — live counts
          </CardTitle>
          <CardDescription>
            Compares what you can see through RLS against the true global count (service role).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.counts.map((c) => (
            <CountRow key={c.table} c={c} />
          ))}
        </CardContent>
      </Card>

      {/* Policy registry */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Live RLS policy registry
          </CardTitle>
          <CardDescription>
            Read straight from the database catalog (<Mono>pg_policies</Mono>) at request time — the
            actual policies PostgreSQL enforces on the engine's tables.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Table</TableHead>
                <TableHead>Policy</TableHead>
                <TableHead>Operation</TableHead>
                <TableHead>Applies to</TableHead>
                <TableHead>Expression</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.policies.map((p) => (
                <TableRow key={`${p.tablename}:${p.policyname}`}>
                  <TableCell>
                    <Mono>{p.tablename}</Mono>
                  </TableCell>
                  <TableCell className="text-xs">{p.policyname}</TableCell>
                  <TableCell className="text-xs">{p.cmd}</TableCell>
                  <TableCell className="text-xs">{p.roles}</TableCell>
                  <TableCell className="max-w-72 truncate font-mono text-[10px] text-muted-foreground">
                    {p.using_expression ?? p.with_check_expression ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
              {data.policies.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-xs text-muted-foreground">
                    No policies visible — the audit view may be missing.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="h-4 w-4 text-primary" />
            Sprint 6F acceptance checklist — how to verify by hand
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {CHECKLIST.map((item) => (
            <div key={item.text} className="flex items-start gap-3 rounded-lg border p-3.5">
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{item.text}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.how}</p>
              </div>
            </div>
          ))}
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <GitBranch className="h-3.5 w-3.5" />
              Scope note: generation only — no auto-assign, no auto-interventions, no mastery changes.
            </span>
            <span>
              Related:{" "}
              <Link to="/assessment-builder-audit" className="underline">Builder Audit</Link> ·{" "}
              <Link to="/question-bank-audit" className="underline">Question Bank Audit</Link> ·{" "}
              <Link to="/assessment-blueprint-audit" className="underline">Blueprint Audit</Link>
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

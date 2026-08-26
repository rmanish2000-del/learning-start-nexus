import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  Database,
  GitBranch,
  ListChecks,
  PlayCircle,
  ShieldCheck,
  Target,
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
import { getGapAuditFn, runGapProbesFn } from "@/lib/gap-audit.functions";
import type { GapCount, GapProbe, GapSnapshotSession } from "@/lib/gap-audit.server";
import { GAP_EXPECTED } from "@/lib/gap-audit.server";
import { GAP_CATEGORY_LABELS, RISK_LABELS } from "@/lib/gap-shared";

export const Route = createFileRoute("/_authenticated/gap-analysis-audit")({
  head: () => ({
    meta: [
      { title: "Gap Analysis Audit Center — EduOS" },
      {
        name: "description",
        content:
          "Independently verifiable proof for Sprint 6G: outcome-level scoring, mastery mapping, intervention lookup, curriculum traceability, determinism, and organization isolation.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: GapAnalysisAuditPage,
});

type Probes = Awaited<ReturnType<typeof runGapProbesFn>>;

function CountRow({ c }: { c: GapCount }) {
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

function ProbeCard({ p }: { p: GapProbe }) {
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

function SessionSnapshot({ s }: { s: GapSnapshotSession }) {
  return (
    <div className="rounded-lg border p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{s.learnerName}</p>
          <p className="text-xs text-muted-foreground">
            <Mono>{s.id}</Mono> · submitted {s.submittedAt ? fmt(s.submittedAt) : "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Pass pass={s.present} />
          {s.present && (
            <Badge
              variant={s.storedScorePct === s.recomputedScorePct ? "outline" : "destructive"}
              className="tabular-nums"
            >
              stored {s.storedScorePct}% · recomputed {s.recomputedScorePct}% (
              {s.recomputedCorrect}/{s.recomputedTotal})
            </Badge>
          )}
        </div>
      </div>
      {s.present && (
        <div className="mt-3 rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Outcome</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Raw</TableHead>
                <TableHead>%</TableHead>
                <TableHead>Mastery band</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Interventions</TableHead>
                <TableHead>Trace</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.rows.map((r) => (
                <TableRow key={r.code}>
                  <TableCell>
                    <p className="font-mono text-xs">{r.code}</p>
                    <p className="max-w-44 truncate text-xs text-muted-foreground">{r.title}</p>
                  </TableCell>
                  <TableCell className="text-xs tabular-nums">{r.weight}%</TableCell>
                  <TableCell className="text-xs tabular-nums">{r.questions}</TableCell>
                  <TableCell className="text-xs font-medium tabular-nums">
                    {r.pct === null ? "—" : `${r.pct}%`}
                  </TableCell>
                  <TableCell className="text-xs">{r.bandLabel ?? "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        r.gapCategory === "weak"
                          ? "border-destructive/40 bg-destructive/10 text-destructive"
                          : r.gapCategory === "medium"
                            ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      }
                    >
                      {GAP_CATEGORY_LABELS[r.gapCategory]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{RISK_LABELS[r.riskLevel]}</TableCell>
                  <TableCell className="text-xs tabular-nums">{r.interventions}</TableCell>
                  <TableCell>
                    {r.traceComplete ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <span className="text-xs font-medium text-destructive">broken</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

const CHECKLIST: { text: string; how: string }[] = [
  {
    text: "Submitted diagnostics are scored per assessment outcome",
    how: "/gap-analysis — every mapped outcome shows raw score and percentage. Probe P2 recomputes percentages from stored answers × question_bank correct answers and requires an exact match.",
  },
  {
    text: "Percentages map onto the Beginning / Developing / Proficient / Advanced framework",
    how: "The org's live mastery_levels bands are used; probe P3 requires 100% → Advanced, 67% → Developing, 33% → Beginning.",
  },
  {
    text: "The gap analyzer detects Weak, Medium, and Strong outcomes",
    how: "Band rank 1 → Weak, rank 2 → Medium, ranks 3+ → Strong. Probe P4 checks the exact category for every outcome of both demo sessions.",
  },
  {
    text: "The gap dashboard shows outcome, mastery level, risk level, and intervention recommendation",
    how: "/gap-analysis step 3 — one row per measured outcome. Risk = weight × difficulty banded against the unit mean; recommendations come from intervention_map.",
  },
  {
    text: "Curriculum traceability navigates Gap → Outcome → Topic → Chapter → Unit",
    how: "The traceability card on /gap-analysis renders the full chain per outcome; probe P6 requires a complete chain for every measured outcome.",
  },
  {
    text: "Interventions are displayed, never auto-assigned",
    how: "Probe P5 verifies intervention_map lookups resolve AND that zero learning_gaps rows reference the analyzed sessions. Probe P9 proves learner/gap/intervention state is byte-identical before and after analysis.",
  },
  {
    text: "The learner view shows strengths, growth areas, and priority areas in student-friendly language",
    how: "/gap-analysis bottom card — the same rows regrouped for sharing with the student.",
  },
  {
    text: "Everything is deterministic — no AI, no mastery modification",
    how: "Probe P8 re-runs the analysis twice and requires byte-identical output; the analyzer is a pure function in gap-shared.ts.",
  },
  {
    text: "Organization isolation holds on analysis inputs and outputs",
    how: "This page → isolation counts + probe P7. Cross-org reads return 0 rows, cross-org writes are rejected with the verbatim database response shown.",
  },
];

function GapAnalysisAuditPage() {
  const runProbes = useServerFn(runGapProbesFn);
  const [probes, setProbes] = useState<Probes | null>(null);
  const [running, setRunning] = useState(false);

  const { data, isPending } = useQuery({
    queryKey: ["gap-analysis-audit"],
    queryFn: () => getGapAuditFn(),
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

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Gap Analysis Audit Center</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Independently verifiable proof for Sprint 6G — submitted diagnostics are scored per
            outcome, mapped to mastery bands, categorized Weak/Medium/Strong, and traced through
            the curriculum, all deterministically. Signed in with role <Mono>{data.me.role}</Mono>{" "}
            in <Mono>{data.me.orgName ?? "—"}</Mono>.
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
              <Mono>{probes.me.orgName ?? "—"}</Mono>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {probes.probes.map((p) => (
              <ProbeCard key={p.key} p={p} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Live recomputed snapshot of both demo sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-primary" />
            Seeded demo sessions — analysis recomputed live
          </CardTitle>
          <CardDescription>
            “{GAP_EXPECTED.diagnosticTitle}” submitted by both demo learners. Every number below is
            recomputed at request time from stored answers and the question bank — the stored score
            must equal the recomputed score.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.snapshot.sessions.map((s) => (
            <SessionSnapshot key={s.id} s={s} />
          ))}
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
            actual policies PostgreSQL enforces on the analyzer's tables.
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
            Sprint 6G acceptance checklist — how to verify by hand
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
              Scope note: analysis only — no automatic interventions, no mastery changes, no AI.
            </span>
            <span>
              Related:{" "}
              <Link to="/gap-analysis" className="underline">
                Gap Analysis
              </Link>{" "}
              ·{" "}
              <Link to="/diagnostic-engine-audit" className="underline">
                Diagnostic Audit
              </Link>{" "}
              ·{" "}
              <Link to="/assessment-blueprint-audit" className="underline">
                Blueprint Audit
              </Link>
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

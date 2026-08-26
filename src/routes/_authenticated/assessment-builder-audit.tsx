import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  CircleDashed,
  Crosshair,
  Database,
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
import { getBuilderAudit, runBuilderProbesFn } from "@/lib/builder-audit.functions";
import type { BuilderCount, BuilderProbe } from "@/lib/builder-audit.server";
import { BUILDER_EXPECTED } from "@/lib/builder-audit.server";
import { KIND_LABELS, type QuestionKind } from "@/lib/question-bank-shared";
import { TEMPLATE_LABELS } from "@/lib/builder-shared";

export const Route = createFileRoute("/_authenticated/assessment-builder-audit")({
  head: () => ({
    meta: [
      { title: "Assessment Builder Audit Center — EduOS" },
      {
        name: "description",
        content:
          "Independently verifiable proof for Sprint 6E: curriculum-driven assessment construction, blueprint alignment, gap coverage, and RLS isolation.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AssessmentBuilderAuditPage,
});

type Probes = Awaited<ReturnType<typeof runBuilderProbesFn>>;

function CountRow({ c }: { c: BuilderCount }) {
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

function ProbeCard({ p }: { p: BuilderProbe }) {
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
    text: "Assessments are built from a curriculum path (Board → Grade → Subject → Unit → Outcome)",
    how: "/assessment-builder — the cascading selectors resolve to a book and unit. Probe P3 verifies every mapped question's outcome belongs to the assessment's unit.",
  },
  {
    text: "Outcome-based selection shows coverage, difficulty mix, and question types",
    how: "/assessment-builder step 2–3 — per-outcome coverage chips plus difficulty/type filters that drive question pre-selection.",
  },
  {
    text: "Coverage view shows blueprint alignment and question count, live",
    how: "/assessment-builder step 5 — outcome coverage % and blueprint alignment % recompute on every checkbox. Probe P4 re-derives the same math from the database.",
  },
  {
    text: "Diagnostic, Practice, and Reassessment templates exist",
    how: "/assessment-builder step 7 — the three templates are selectable; the template is stored as the assessment kind.",
  },
  {
    text: "Gap coverage preview shows outcomes measured → potential gaps",
    how: "/assessment-builder step 6 — for each selected outcome, the intervention map's failure patterns and interventions are previewed.",
  },
  {
    text: "Only approved questions can be built into an assessment",
    how: "Draft questions are disabled in the picker, and the server function rejects them too. Probe P2 verifies every mapped question is approved.",
  },
  {
    text: "Building never assigns, generates questions, or changes grading",
    how: "The build function only writes to assessments + assessment_question_map. Assignment stays on the Assessments page; generation stays in the Question Bank.",
  },
  {
    text: "Organization isolation and role gates hold on builder tables",
    how: "This page → isolation counts + probes P6–P8. Cross-org reads return 0 rows, cross-org writes are rejected, reviewers are read-only.",
  },
];

function AssessmentBuilderAuditPage() {
  const runProbes = useServerFn(runBuilderProbesFn);
  const [probes, setProbes] = useState<Probes | null>(null);
  const [running, setRunning] = useState(false);

  const { data, isPending } = useQuery({
    queryKey: ["builder-audit"],
    queryFn: () => getBuilderAudit(),
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
          <h1 className="text-2xl font-semibold tracking-tight">Assessment Builder Audit Center</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Independently verifiable proof for Sprint 6E — the assessment builder constructs
            assessments from curriculum outcomes and approved bank questions, with live coverage
            math. Signed in with role <Mono>{data.me.role}</Mono> in{" "}
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
              staff prove a build/delete round-trip; reviewers prove their writes are rejected.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {probes.probes.map((p) => (
              <ProbeCard key={p.key} p={p} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Seeded build snapshot */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Crosshair className="h-4 w-4 text-primary" />
            Seeded build — “{BUILDER_EXPECTED.title}”
          </CardTitle>
          <CardDescription>
            The migration-seeded demo build on the pilot book (Class 3 GK), re-queried live. Unit:{" "}
            {snap.unitTitle || "My Country"} · blueprint alignment = measured weight{" "}
            {snap.weightMeasured} ÷ unit total {snap.weightTotal}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Pass pass={snap.present} />
            <div className="flex flex-wrap gap-1.5 text-xs">
              <Badge variant="outline">{snap.questions} questions</Badge>
              <Badge variant="outline">
                {snap.outcomesMeasured}/{snap.outcomesTotal} outcomes · {snap.outcomeCoveragePct}%
              </Badge>
              <Badge variant="outline">alignment {snap.blueprintAlignmentPct}%</Badge>
              <Badge variant="outline">
                {TEMPLATE_LABELS[snap.template as keyof typeof TEMPLATE_LABELS] ?? snap.template} ·{" "}
                {snap.status}
              </Badge>
            </div>
          </div>

          {snap.present && (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Kind</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Approved</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snap.rows.map((r) => (
                    <TableRow key={r.sortOrder}>
                      <TableCell className="text-xs tabular-nums">{r.sortOrder}</TableCell>
                      <TableCell className="max-w-72 truncate text-xs">{r.prompt}</TableCell>
                      <TableCell>
                        <Mono>{r.outcomeCode}</Mono>
                      </TableCell>
                      <TableCell className="text-xs">
                        {KIND_LABELS[r.kind as QuestionKind] ?? r.kind}
                      </TableCell>
                      <TableCell className="text-xs tabular-nums">D{r.difficulty}</TableCell>
                      <TableCell className="text-xs tabular-nums">{r.points}</TableCell>
                      <TableCell className="text-xs">
                        {r.approved ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <span className="font-medium text-destructive">draft</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
            actual policies PostgreSQL enforces on the builder tables.
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
            Sprint 6E manual verification steps — not auto-checked
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {CHECKLIST.map((item) => (
            <div key={item.text} className="flex items-start gap-3 rounded-lg border p-3.5">
              <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{item.text}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.how}</p>
              </div>
            </div>
          ))}
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <GitBranch className="h-3.5 w-3.5" />
              Scope note: construction only — no auto-assign, no auto-generation, no auto-grading.
            </span>
            <span>
              Related:{" "}
              <Link to="/question-bank-audit" className="underline">
                Question Bank Audit
              </Link>{" "}
              ·{" "}
              <Link to="/assessment-blueprint-audit" className="underline">
                Blueprint Audit
              </Link>{" "}
              ·{" "}
              <Link to="/curriculum-audit" className="underline">
                Curriculum Audit
              </Link>
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

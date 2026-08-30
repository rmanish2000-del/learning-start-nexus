import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  Crosshair,
  Database,
  Gauge,
  GitBranch,
  ListChecks,
  PlayCircle,
  ShieldCheck,
  Target,
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
import { getBlueprintAudit, runBlueprintProbesFn } from "@/lib/blueprint-audit.functions";
import type { BlueprintCount, BlueprintProbe } from "@/lib/blueprint-audit.server";
import { MASTERY_FORMULA } from "@/lib/blueprint-shared";
import { friendlyErrorMessage } from "@/lib/user-errors";

export const Route = createFileRoute("/_authenticated/assessment-blueprint-audit")({
  head: () => ({
    meta: [
      { title: "Blueprint Audit Center — EduOS" },
      {
        name: "description",
        content:
          "Independently verifiable proof for Sprint 6C: outcome catalog, diagnostic weights, curriculum mapping chain, intervention mapping, mastery framework, and RLS isolation.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BlueprintAuditPage,
});

type Probes = Awaited<ReturnType<typeof runBlueprintProbesFn>>;

function CountRow({ c }: { c: BlueprintCount }) {
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

function ProbeCard({ p }: { p: BlueprintProbe }) {
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
    text: "Outcome catalog stores code, title, Bloom level, difficulty, weight, and intervention strategy",
    how: "/assessment-blueprint → Outcome catalog tab. 18 outcomes with LO_GK3_* codes, each carrying Bloom level, difficulty 1–5, diagnostic weight, and strategy.",
  },
  {
    text: "Diagnostic weights sum to exactly 100 per unit",
    how: "/assessment-blueprint → Blueprint tab shows a Σ weight badge per unit; probe P2 re-checks the sums straight from the database.",
  },
  {
    text: "Curriculum mapping chains Topic → Learning Outcome → Assessment Outcome",
    how: "/assessment-blueprint → Curriculum mapping tab renders the chain per outcome; probe P4 verifies all 55 learning outcomes are mapped with no broken links.",
  },
  {
    text: "Blueprint viewer shows Unit → Outcome → Weight → Question Types → Intervention Strategy",
    how: "/assessment-blueprint → Blueprint tab. Each outcome card shows its weight bar, question-type chips, and intervention strategy.",
  },
  {
    text: "Intervention mapping stores Outcome → Failure Pattern → Recommended Intervention",
    how: "Outcome cards on the Blueprint tab list their failure-pattern rows; probe P5 verifies every outcome has at least one.",
  },
  {
    text: "Mastery framework has four contiguous bands and is admin-configurable",
    how: "/assessment-blueprint → Mastery framework tab. Admins get an edit pencil per band; probe P3 verifies Beginning 0–49 → Advanced 85–100 with no gaps.",
  },
  {
    text: "Mastery engine preview projects a learner's mastery without reassignment",
    how: "/assessment-blueprint → Mastery preview tab (staff). The deterministic formula is printed on the page; probe P10 re-runs it with fixed inputs.",
  },
  {
    text: "Organization isolation and role gates hold on every blueprint table",
    how: "This page → Isolation counts + probes P6–P8. Cross-org reads return 0 rows, cross-org writes are rejected, and reviewers are read-only.",
  },
];

function BlueprintAuditPage() {
  const runProbes = useServerFn(runBlueprintProbesFn);
  const [probes, setProbes] = useState<Probes | null>(null);
  const [running, setRunning] = useState(false);

  const { data, isPending } = useQuery({
    queryKey: ["blueprint-audit"],
    queryFn: () => getBlueprintAudit(),
  });

  const handleRun = async () => {
    setRunning(true);
    try {
      const result = await runProbes();
      setProbes(result);
      const passing = result.probes.filter((p) => p.pass).length;
      toast.success(`Probes finished — ${passing}/${result.probes.length} passing.`);
    } catch (error) {
      toast.error(friendlyErrorMessage(error, "Probe run failed."));
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
          <h1 className="text-2xl font-semibold tracking-tight">Blueprint Audit Center</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Independently verifiable proof for Sprint 6C — the assessment blueprint engine maps the
            curriculum to weighted outcomes and a configurable mastery framework. Signed in with
            role <Mono>{data.me.role}</Mono> in <Mono>{data.me.orgName ?? "—"}</Mono>.
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

      {/* Blueprint snapshot */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Crosshair className="h-4 w-4 text-primary" />
            Pilot blueprint snapshot
          </CardTitle>
          <CardDescription>
            “Knowledge Bank for Children” (Class 3 GK) — verified from the database on every load.
            Expected 18 outcomes / 55 mappings / 24 intervention rows / 4 mastery levels.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Pass pass={snap.present} />
            <div className="flex flex-wrap gap-1.5 text-xs">
              <Badge variant="outline">{snap.outcomes} outcomes</Badge>
              <Badge variant="outline">{snap.mappings} mappings</Badge>
              <Badge variant="outline">{snap.interventions} intervention rows</Badge>
              <Badge variant="outline">{snap.masteryLevels} mastery levels</Badge>
            </div>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit</TableHead>
                  <TableHead>Outcomes</TableHead>
                  <TableHead>Weight sum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snap.unitSums.map((u) => (
                  <TableRow key={u.unit}>
                    <TableCell className="text-xs">{u.unit}</TableCell>
                    <TableCell className="text-xs tabular-nums">{u.outcomes}</TableCell>
                    <TableCell className="text-xs tabular-nums">
                      <span className={u.weightSum === 100 ? "" : "font-medium text-destructive"}>
                        {u.weightSum}/100
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Bloom</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Mapped LOs</TableHead>
                  <TableHead>Interventions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snap.rows.map((r) => (
                  <TableRow key={r.code}>
                    <TableCell>
                      <Mono>{r.code}</Mono>
                    </TableCell>
                    <TableCell className="max-w-64 text-xs">{r.title}</TableCell>
                    <TableCell className="text-xs">{r.bloomLevel}</TableCell>
                    <TableCell className="text-xs tabular-nums">{r.weight}%</TableCell>
                    <TableCell className="text-xs tabular-nums">{r.mappings}</TableCell>
                    <TableCell className="text-xs tabular-nums">{r.interventions}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Mastery framework */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge className="h-4 w-4 text-primary" />
            Mastery framework
          </CardTitle>
          <CardDescription>
            The live bands from the database, plus the deterministic projection formula.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {snap.masteryBands.map((b) => (
              <Badge key={b.label} variant="outline">
                {b.label} {b.min}–{b.max}
              </Badge>
            ))}
          </div>
          <ol className="list-decimal space-y-0.5 pl-4 text-xs text-muted-foreground">
            {MASTERY_FORMULA.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
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
            Each row compares what you can see through RLS against the true global count. Isolation
            holds when your count stays below the global count (both organizations carry blueprint
            data) or matches it exactly (your org owns all rows).
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
            actual policies PostgreSQL enforces on the blueprint tables.
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
                </TableRow>
              ))}
              {data.policies.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-xs text-muted-foreground">
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
            Sprint 6C acceptance checklist — how to verify by hand
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
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <GitBranch className="h-3.5 w-3.5" />
            Scope note: this sprint ends at the blueprint — no question generation and no automated
            reassignment.
            <Target className="h-3.5 w-3.5" />
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

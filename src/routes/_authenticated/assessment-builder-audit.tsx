import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FlaskConical, RefreshCw } from "lucide-react";

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
import {
  DbError,
  EvidenceList,
  Kpi,
  PassBadge,
  ProbeCard,
  Section,
  SummaryStrip,
} from "@/components/audit-shared";
import { KIND_LABELS, type QuestionKind } from "@/lib/question-bank-shared";
import {
  getBuilderAudit,
  runBuilderProbesFn,
} from "@/lib/builder-audit.functions";
import { BUILDER_EXPECTED } from "@/lib/builder-audit.server";

export const Route = createFileRoute("/_authenticated/assessment-builder-audit")({
  head: () => ({
    meta: [
      { title: "Assessment Builder Audit — EduOS" },
      {
        name: "description",
        content:
          "Independent verification of the curriculum-driven assessment builder: seeded build, coverage math, question-chain integrity, cross-org isolation, and role write gates.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AssessmentBuilderAuditPage,
});

function AssessmentBuilderAuditPage() {
  const snapshotQuery = useQuery({
    queryKey: ["builder-audit"],
    queryFn: () => getBuilderAudit(),
  });
  const [probeState, setProbeState] = useState<"idle" | "running" | "done">("idle");
  const probesQuery = useQuery({
    queryKey: ["builder-audit-probes"],
    queryFn: () => runBuilderProbesFn(),
    enabled: false,
  });

  const data = snapshotQuery.data;
  const probes = probesQuery.data?.probes ?? [];
  const passed = probes.filter((p) => p.pass).length;

  const runProbes = async () => {
    setProbeState("running");
    await probesQuery.refetch();
    setProbeState("done");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <FlaskConical className="h-6 w-6 text-primary" />
            Assessment Builder Audit
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Sprint 6E verification for the curriculum-driven assessment builder. Counts are
            re-queried live: "Visible to you" runs under your RLS policies, "Global" via service
            role. Construction only — no auto-assign, no auto-generation, no auto-grading.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button variant="outline" size="sm" onClick={() => void snapshotQuery.refetch()}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Refresh snapshot
          </Button>
          {data && (
            <p className="text-xs text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{data.me.name}</span> ·{" "}
              {data.me.role} · {data.me.orgName}
            </p>
          )}
        </div>
      </div>

      {data && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.counts.map((c) => (
            <Kpi key={c.table} label={c.label} value={c.visibleToYou ?? "—"} />
          ))}
        </div>
      )}

      <Section
        title="Table isolation"
        description="Visible-to-you counts run under RLS; global counts run as service role. Visible must never exceed global."
      >
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Table</TableHead>
                <TableHead>Visible to you</TableHead>
                <TableHead>Global (all orgs)</TableHead>
                <TableHead>Isolation</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.counts ?? []).map((c) => (
                <TableRow key={c.table}>
                  <TableCell className="font-mono text-xs">{c.table}</TableCell>
                  <TableCell className="text-xs tabular-nums">
                    {c.visibleToYou === null ? <DbError error={{ code: null, message: "permission denied", details: null, hint: null }} /> : c.visibleToYou}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums">{c.globalAllOrgs}</TableCell>
                  <TableCell><PassBadge pass={c.isolated} /></TableCell>
                  <TableCell className="max-w-64 text-xs text-muted-foreground">{c.note}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Section>

      <Section
        title="Seeded demo build"
        description={`The migration-seeded build "${BUILDER_EXPECTED.title}" with its full Assessment → Outcomes → Questions chain and live-computed coverage.`}
      >
        {data?.snapshot.present ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi label="Questions" value={data.snapshot.questions} />
              <Kpi
                label="Outcome coverage"
                value={`${data.snapshot.outcomesMeasured}/${data.snapshot.outcomesTotal} · ${data.snapshot.outcomeCoveragePct}%`}
              />
              <Kpi
                label="Blueprint alignment"
                value={`${data.snapshot.blueprintAlignmentPct}%`}
              />
              <Kpi label="Weight measured" value={`${data.snapshot.weightMeasured}/${data.snapshot.weightTotal}`} />
            </div>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  {data.snapshot.title}
                  <Badge variant="outline" className="text-[10px]">{data.snapshot.template}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{data.snapshot.status}</Badge>
                </CardTitle>
                <CardDescription>
                  Unit: {data.snapshot.unitTitle} · blueprint alignment = measured weight{" "}
                  {data.snapshot.weightMeasured} ÷ unit total {data.snapshot.weightTotal}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Question</TableHead>
                      <TableHead>Outcome</TableHead>
                      <TableHead>Kind</TableHead>
                      <TableHead>Difficulty</TableHead>
                      <TableHead>Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.snapshot.rows.map((r) => (
                      <TableRow key={r.sortOrder}>
                        <TableCell className="text-xs tabular-nums">{r.sortOrder}</TableCell>
                        <TableCell className="max-w-72 truncate text-xs">{r.prompt}</TableCell>
                        <TableCell className="font-mono text-xs">{r.outcomeCode}</TableCell>
                        <TableCell className="text-xs">
                          {KIND_LABELS[r.kind as QuestionKind] ?? r.kind}
                        </TableCell>
                        <TableCell className="text-xs tabular-nums">D{r.difficulty}</TableCell>
                        <TableCell className="text-xs tabular-nums">{r.points}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              Seeded build not visible — check the demo migration ran and your RLS role.
            </CardContent>
          </Card>
        )}
      </Section>

      <Section
        title="RLS policies in effect"
        description="Live from pg_policies for the builder tables."
      >
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Table</TableHead>
                <TableHead>Policy</TableHead>
                <TableHead>Command</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Expression</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.policies ?? []).map((p) => (
                <TableRow key={`${p.tablename}-${p.policyname}`}>
                  <TableCell className="font-mono text-xs">{p.tablename}</TableCell>
                  <TableCell className="text-xs">{p.policyname}</TableCell>
                  <TableCell className="text-xs">{p.cmd}</TableCell>
                  <TableCell className="text-xs">{p.roles}</TableCell>
                  <TableCell className="max-w-80 truncate font-mono text-[10px] text-muted-foreground">
                    {p.qual ?? p.withCheck ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Section>

      <Section
        title="Probe runner"
        description="8 live probes: seeded build, question coverage, outcome alignment, blueprint weights, orphan scan, cross-org read/write isolation, and a role-appropriate write gate."
      >
        <div className="flex items-center gap-3">
          <Button onClick={() => void runProbes()} disabled={probeState === "running"}>
            {probeState === "running" ? "Running probes…" : "Run all probes"}
          </Button>
          {probes.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {passed}/{probes.length} passed
            </span>
          )}
        </div>
        {probes.length > 0 && (
          <>
            <SummaryStrip
              items={[
                { label: "Passed", value: passed },
                { label: "Failed", value: probes.length - passed },
                { label: "Total", value: probes.length },
              ]}
            />
            <div className="grid gap-3 md:grid-cols-2">
              {probes.map((p) => (
                <ProbeCard
                  key={p.key}
                  name={p.name}
                  expectation={p.expectation}
                  detail={p.detail}
                  pass={p.pass}
                  skipped={p.skipped}
                  dbError={p.dbError ?? null}
                />
              ))}
            </div>
          </>
        )}
      </Section>

      <EvidenceList
        items={[
          "Assessment → unit → outcomes chain verified against live rows",
          "Mapped questions must exist in the bank and be approved",
          "Diagnostic weights per unit must sum to 100",
          "Cross-org read and write probes target a real second organization",
        ]}
      />

      <p className="text-xs text-muted-foreground">
        Related audits:{" "}
        <Link to="/question-bank-audit" className="underline">Question Bank</Link> ·{" "}
        <Link to="/assessment-blueprint-audit" className="underline">Blueprint</Link> ·{" "}
        <Link to="/curriculum-audit" className="underline">Curriculum</Link>
      </p>
    </div>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import {
  BookOpen,
  CircleDashed,
  Database,
  GitBranch,
  ListChecks,
  PlayCircle,
  ScrollText,
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
import { getCurriculumAudit, runCurriculumProbesFn } from "@/lib/curriculum-audit.functions";
import type { CurriculumCount, CurriculumProbe } from "@/lib/curriculum-audit.server";

export const Route = createFileRoute("/_authenticated/curriculum-audit")({
  head: () => ({
    meta: [
      { title: "Curriculum Audit Center — EduOS" },
      {
        name: "description",
        content:
          "Independently verifiable proof for Sprint 6: curriculum import, tree structure, learning outcomes, knowledge graph, cross-organization isolation, and RLS.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CurriculumAuditPage,
});

const authRoute = getRouteApi("/_authenticated");

type Probes = Awaited<ReturnType<typeof runCurriculumProbesFn>>;

const EVENT_LABELS: Record<string, string> = {
  uploaded: "Book uploaded",
  imported: "Curriculum imported",
  unit_added: "Unit added",
  chapter_added: "Chapter added",
  topic_added: "Topic added",
  renamed: "Node renamed",
  moved: "Node moved",
  deleted: "Node deleted",
  outcome_added: "Outcome added",
  outcome_edited: "Outcome edited",
  outcome_approved: "Outcome approved",
  outcome_unapproved: "Outcome unapproved",
  outcome_deleted: "Outcome deleted",
  approved: "Book approved",
  reopened: "Returned to review",
};

function CountRow({ c }: { c: CurriculumCount }) {
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

function ProbeCard({ p }: { p: CurriculumProbe }) {
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
    text: "Curriculum library is organized Board → Grade → Subject → Book",
    how: "/curriculum — the library groups books under their board (ICSE) and grade/subject lane, with per-book structure counts and status.",
  },
  {
    text: "Tree viewer shows the full Unit → Chapter → Topic hierarchy",
    how: "/curriculum → open a book → Tree tab. Units expand into numbered chapters and topics, with outcome progress per topic.",
  },
  {
    text: "Staff can rename, move, add, and delete structure nodes",
    how: "/curriculum → Review & edit tab (staff only). Rename and move happen inline; deletes ask for confirmation; every change lands in the History tab.",
  },
  {
    text: "Learning outcomes are stored separately and can be edited and approved",
    how: "/curriculum → Outcomes tab. Outcomes are individual rows with suggested/approved status — approve one, approve all, edit the text, or add new ones.",
  },
  {
    text: "Knowledge graph shows concept relationships",
    how: "/curriculum → Knowledge graph tab. The pilot book shows 39 concepts and 38 contains-relationships (e.g. India → States & Capitals → New Delhi).",
  },
  {
    text: "JSON import builds a complete book in one transaction",
    how: "/curriculum → Import JSON. Paste the sample structure (or click “Insert example”) and the whole tree, outcomes, and graph are created atomically — on failure nothing is left behind.",
  },
  {
    text: "Reviewers can view the curriculum but cannot change anything",
    how: "Sign in as reviewer@eduos.global → /curriculum is visible, but the Review & edit tab and all approve/edit buttons are hidden, and the server rejects mutations with 403.",
  },
  {
    text: "The organization boundary holds on every curriculum table",
    how: "This page → Isolation counts + probes P1–P3. Your org sees 8/8 tables; Northstar Tutoring's attempt to read the pilot book is rejected (PGRST116).",
  },
];

function CurriculumAuditPage() {
  const { role } = authRoute.useRouteContext();
  const isStaff = role === "admin" || role === "educator";
  const runProbes = useServerFn(runCurriculumProbesFn);
  const [probes, setProbes] = useState<Probes | null>(null);
  const [running, setRunning] = useState(false);

  const { data, isPending } = useQuery({
    queryKey: ["curriculum-audit"],
    queryFn: () => getCurriculumAudit(),
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
          <h1 className="text-2xl font-semibold tracking-tight">Curriculum Audit Center</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Independently verifiable proof for Sprint 6 — the imported curriculum is visible,
            manageable, approvable, and isolated per organization. Signed in with role{" "}
            <Mono>{data.me.role}</Mono> in <Mono>{data.me.orgName ?? "—"}</Mono>.
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

      {/* Pilot book structure */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-primary" />
            Pilot book structure
          </CardTitle>
          <CardDescription>
            “{data.pilot.title}” — <Mono>{data.pilot.bookId}</Mono>. Verified from the database on
            every load; expected 6 units / 64 chapters / 64 topics / 55 outcomes / 39 concepts /
            38 relationships.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Pass pass={data.pilot.present && data.pilot.structureOk} />
            <div className="flex flex-wrap gap-1.5 text-xs">
              <Badge variant="outline">{data.pilot.units} units</Badge>
              <Badge variant="outline">{data.pilot.chapters} chapters</Badge>
              <Badge variant="outline">{data.pilot.topics} topics</Badge>
              <Badge variant="outline">
                {data.pilot.approvedOutcomes}/{data.pilot.outcomes} outcomes approved
              </Badge>
              <Badge variant="outline">{data.pilot.nodes} concepts</Badge>
              <Badge variant="outline">{data.pilot.edges} relationships</Badge>
            </div>
          </div>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit</TableHead>
                  <TableHead>Chapter</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Outcomes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.pilot.sampleRows.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs">{row.unit}</TableCell>
                    <TableCell className="text-xs">{row.chapter}</TableCell>
                    <TableCell className="text-xs">{row.topic}</TableCell>
                    <TableCell className="text-xs">
                      {row.outcomes}
                      {row.sampleOutcome ? (
                        <span className="block max-w-md truncate text-[11px] text-muted-foreground">
                          {row.sampleOutcome}
                        </span>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-[11px] text-muted-foreground">
            First 12 topic rows, in tree order — the full structure is browsable in{" "}
            <Mono>/curriculum</Mono>.
          </p>
        </CardContent>
      </Card>

      {/* Knowledge graph sample */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GitBranch className="h-4 w-4 text-primary" />
            Knowledge graph sample
          </CardTitle>
          <CardDescription>
            Concept relationships extracted from the book (parent contains child).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {data.pilot.graphSample.map((g, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <Mono>{g.parent}</Mono>
              <span className="text-muted-foreground">→ contains →</span>
              <Mono>{g.child}</Mono>
            </div>
          ))}
          {data.pilot.graphSample.length === 0 && (
            <p className="text-xs text-muted-foreground">No graph rows.</p>
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
            Each row compares what you can see through RLS against the true global count. Isolation
            holds when your count stays below the global count (both organizations carry pilot
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
            actual policies PostgreSQL enforces on the curriculum tables.
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

      {/* Recent flow log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ScrollText className="h-4 w-4 text-primary" />
            Recent curriculum events
          </CardTitle>
          <CardDescription>
            The last 20 entries in the append-only book event log, across books in your
            organization.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {data.events.map((e) => (
            <div
              key={e.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2.5"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline">{EVENT_LABELS[e.event] ?? e.event}</Badge>
                <span className="text-muted-foreground">{e.bookTitle}</span>
              </div>
              <span className="text-xs text-muted-foreground">{fmt(e.createdAt)}</span>
            </div>
          ))}
          {data.events.length === 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">No events yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="h-4 w-4 text-primary" />
            Sprint 6 manual verification steps — not auto-checked
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
          {!isStaff && (
            <p className="text-xs text-muted-foreground">
              You are signed in with a read-only role — the mutation probes (P4–P7) will report SKIP
              and the edit controls stay hidden, which is itself the expected behavior.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

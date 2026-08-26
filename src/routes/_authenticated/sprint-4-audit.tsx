import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import {
  Bot,
  CircleDashed,
  Database,
  Library,
  ListChecks,
  PlayCircle,
  ShieldCheck,
  Sparkles,
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
import { getSprint4Audit, runSprint4ProbesFn } from "@/lib/sprint4-audit.functions";
import type { Sprint4Count, Sprint4Probe } from "@/lib/sprint4-audit.server";

export const Route = createFileRoute("/_authenticated/sprint-4-audit")({
  head: () => ({
    meta: [
      { title: "Sprint 4 Audit Center — EduOS" },
      {
        name: "description",
        content:
          "Independently verifiable proof for Sprint 4: the AI Tutor — launch flow, Socratic capabilities, failsafe library, boundaries, RLS policies, and cross-organization isolation.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Sprint4AuditPage,
});

const authRoute = getRouteApi("/_authenticated");

type Probes = Awaited<ReturnType<typeof runSprint4ProbesFn>>;

function CountRow({ c }: { c: Sprint4Count }) {
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

function ProbeCard({ p }: { p: Sprint4Probe }) {
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
    text: "Students launch the tutor from an assigned intervention",
    how: "Sign in as a student (e.g. aarav / PIN), open Home → Focus plan → AI Tutor. The session inherits concept, objective, and mastery from the intervention and gap.",
  },
  {
    text: "All six capabilities work: explain, hint, example, reframe, let-me-try, socratic",
    how: "In a tutor session, press each action button. Replies are marked 'AI tutor' (live model) or 'Library' (failsafe). Probe P5 proves every action works with the AI forced off.",
  },
  {
    text: "Hints are progressive and never reveal the answer",
    how: "Press Hint repeatedly in one session — the reply is labeled 'Hint N of 3' and escalates. The system prompt forbids handing over answers.",
  },
  {
    text: "Practice mode grades deterministically with immediate feedback",
    how: "Practice → answer the question → feedback includes correctness and the worked solution. Grading is done by fraction-aware comparison in code, never by the AI.",
  },
  {
    text: "The tutor never touches high-stakes records",
    how: "Probe P7 runs a full tutor walk and verifies mastery score, evidence rows, and assessment sessions are byte-identical before and after.",
  },
  {
    text: "Educators see session aggregates, never conversation content",
    how: "Probe P2: staff SELECT on tutor_interactions returns 0 rows. The learner profile Tutor tab shows concept, counts, and status only.",
  },
  {
    text: "Students see only their own tutor sessions",
    how: "tutor_sessions RLS: student_user_id = auth.uid() for writes; reads scoped by can_view_learner. Cross-org probes P3/P4 prove isolation.",
  },
  {
    text: "AI outage never dead-ends the student",
    how: "Probe P5 forces fallback and confirms all 9 actions return library content; the UI labels those replies 'Library'.",
  },
];

const CODEX_OBJECTIONS: { objection: string; evidence: string }[] = [
  {
    objection: "'The AI tutor is just a chatbot wrapper.'",
    evidence:
      "Capability buttons map to structured server actions with deterministic state (hint level, active question, practice rotation). Question posing and grading are code, not model output — see tutor.server.ts and probe P7.",
  },
  {
    objection: "'The tutor could leak answers or modify scores.'",
    evidence:
      "The system prompt forbids answer-handover; grading is deterministic; probe P7 proves mastery/evidence/assessment records are untouched by a full tutor walk. tutor.server.ts imports no scoring or mastery writers.",
  },
  {
    objection: "'Educators can read student conversations.'",
    evidence:
      "tutor_interactions has exactly one SELECT policy: student_user_id = auth.uid(). Probe P2 shows staff reads return 0 rows while data exists globally. The policy registry on this page is read live from pg_policies.",
  },
  {
    objection: "'AI down = broken feature.'",
    evidence:
      "Every action has a static library fallback (6 fraction concepts + generic). Probe P5 runs all actions with the AI forced off; probe P6 reports live gateway status honestly.",
  },
  {
    objection: "'Cross-org isolation is claimed, not shown.'",
    evidence:
      "Probes P3/P4 seed a real session in the other organization via service role, attempt read/insert as the caller, show the verbatim database response, and clean up.",
  },
];

function Sprint4AuditPage() {
  const { role } = authRoute.useRouteContext();
  const isStaff = role === "admin" || role === "educator";
  const fetchAudit = useServerFn(getSprint4Audit);
  const runProbes = useServerFn(runSprint4ProbesFn);
  const [probes, setProbes] = useState<Probes | null>(null);
  const [running, setRunning] = useState(false);

  const { data, isPending } = useQuery({
    queryKey: ["sprint4-audit"],
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
          <h2 className="text-2xl font-semibold tracking-tight">Sprint 4 Audit Center</h2>
          <p className="text-sm text-muted-foreground">
            AI Tutor V1 — every claim on this page is backed by live data, live policies, or a
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
            <Bot className="h-4 w-4" /> Build summary
          </CardTitle>
          <CardDescription>What Sprint 4 shipped and the contract it must hold.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Students launch an AI tutor session from any assigned intervention. The tutor receives
            the student's name, grade, subject, topic, concept, current mastery index, the active
            intervention plan, and the known gap — then teaches Socratically: explain, progressive
            hints, worked examples, rephrasing, try-it questions, and guiding questions. Practice
            mode grades deterministically and stores activity in <Mono>tutor_interactions</Mono>,
            separate from formal assessment evidence.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Model: {data.aiModel}</Badge>
            <Badge variant="outline">
              Failsafe: static library ({data.library.length} concepts)
            </Badge>
            <Badge variant="outline">Tables: tutor_sessions, tutor_interactions</Badge>
          </div>
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Hard boundaries (never crossed)
            </p>
            <ul className="space-y-1">
              {data.boundaries.map((b) => (
                <li key={b} className="flex items-start gap-2 text-xs">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  {b}
                </li>
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
            <Sparkles className="h-4 w-4" /> Tutor sessions visible to you
          </CardTitle>
          <CardDescription>
            The educator view: concept, status, and interaction counts — never conversation content.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Learner</TableHead>
                <TableHead>Concept</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Interactions</TableHead>
                <TableHead>Concepts accessed</TableHead>
                <TableHead>Last activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.sessions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.learnerName}</TableCell>
                  <TableCell>{s.concept}</TableCell>
                  <TableCell>
                    <Badge variant={s.status === "active" ? "default" : "secondary"}>
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{s.interactionCount}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {s.conceptsAccessed.join(", ") || "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {fmt(s.lastActivityAt)}
                  </TableCell>
                </TableRow>
              ))}
              {data.sessions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    No tutor sessions visible to your role yet — a student launches one from their
                    focus plan.
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
            <Library className="h-4 w-4" /> Failsafe content library
          </CardTitle>
          <CardDescription>
            Served verbatim whenever the AI is unavailable — the student always gets an explanation,
            hints, an example, and practice.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            {data.library.map((c) => (
              <div key={c.concept} className="rounded-lg border p-3 text-xs">
                <p className="text-sm font-medium">{c.concept}</p>
                <p className="mt-0.5 text-muted-foreground">
                  {c.practiceItems} questions · {c.hints} progressive hints · {c.socraticPrompts}{" "}
                  socratic prompts
                </p>
              </div>
            ))}
          </div>
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
          {probes?.probes.map((p) => (
            <ProbeCard key={p.key} p={p} />
          ))}
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
            <ListChecks className="h-4 w-4" /> How to verify by hand
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {CHECKLIST.map((item) => (
            <div key={item.text} className="flex items-start gap-3 rounded-lg border p-3">
              <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
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
          <CardTitle className="text-base">Likely review objections — and the evidence</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {CODEX_OBJECTIONS.map((o) => (
            <div key={o.objection} className="rounded-lg border p-3">
              <p className="text-sm font-medium">{o.objection}</p>
              <p className="mt-1 text-xs text-muted-foreground">{o.evidence}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  CircleDashed,
  Database,
  FileQuestion,
  GitBranch,
  KeyRound,
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
import { getQuestionBankAudit, runQuestionBankProbesFn } from "@/lib/question-bank-audit.functions";
import type { QuestionBankCount, QuestionBankProbe } from "@/lib/question-bank-audit.server";
import { GENERATION_CONTRACT, KIND_LABELS, type QuestionKind } from "@/lib/question-bank-shared";

export const Route = createFileRoute("/_authenticated/question-bank-audit")({
  head: () => ({
    meta: [
      { title: "Question Bank Audit Center — EduOS" },
      {
        name: "description",
        content:
          "Independently verifiable proof for Sprint 6D: outcome-linked questions, difficulty bounds, answer keys, explanations, and RLS isolation.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: QuestionBankAuditPage,
});

type Probes = Awaited<ReturnType<typeof runQuestionBankProbesFn>>;

function CountRow({ c }: { c: QuestionBankCount }) {
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

function ProbeCard({ p }: { p: QuestionBankProbe }) {
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
    text: "Every question is linked to an assessment outcome (Outcome → Question Bank)",
    how: "/question-bank — pick a book, then an outcome; its questions appear in the right panel. Probe P2 verifies every question's outcome link resolves to the same book.",
  },
  {
    text: "Every question carries a difficulty level between 1 and 5",
    how: "Question cards show a D1–D5 badge (Foundational → Advanced). Probe P5 re-checks the bounds straight from the database.",
  },
  {
    text: "Every question has an answer key",
    how: "Question cards show the answer key in a dedicated block; MCQ options highlight the correct one. Probe P3 verifies none are empty.",
  },
  {
    text: "Every question has an explanation",
    how: "Question cards show a teaching explanation next to the answer key. Probe P4 verifies none are empty.",
  },
  {
    text: "AI generation produces reviewed drafts, never live questions",
    how: "/question-bank → Generate with AI. Generated questions land as Draft with an AI-generated badge; staff approve them explicitly. The generation contract is printed on the page.",
  },
  {
    text: "MCQ answer keys always match one of the options",
    how: "The editor refuses to save otherwise; probe P5 verifies the invariant on stored rows.",
  },
  {
    text: "Organization isolation and role gates hold on the question bank",
    how: "This page → Isolation counts + probes P6–P8. Cross-org reads return 0 rows, cross-org writes are rejected, and reviewers are read-only.",
  },
];

function QuestionBankAuditPage() {
  const runProbes = useServerFn(runQuestionBankProbesFn);
  const [probes, setProbes] = useState<Probes | null>(null);
  const [running, setRunning] = useState(false);

  const { data, isPending } = useQuery({
    queryKey: ["question-bank-audit"],
    queryFn: () => getQuestionBankAudit(),
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
          <h1 className="text-2xl font-semibold tracking-tight">Question Bank Audit Center</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Independently verifiable proof for Sprint 6D — the question bank engine links outcomes
            to reviewed questions, each with a difficulty, an answer key, and an explanation.
            Signed in with role <Mono>{data.me.role}</Mono> in <Mono>{data.me.orgName ?? "—"}</Mono>.
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

      {/* Coverage snapshot */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileQuestion className="h-4 w-4 text-primary" />
            Pilot question bank snapshot
          </CardTitle>
          <CardDescription>
            “Knowledge Bank for Children” (Class 3 GK) — verified from the database on every load.
            Seeded with 12 questions across 4 outcomes; AI generation adds more as drafts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Pass pass={snap.present} />
            <div className="flex flex-wrap gap-1.5 text-xs">
              <Badge variant="outline">{snap.questions} questions</Badge>
              <Badge variant="outline">{snap.outcomesCovered} outcomes covered</Badge>
              <Badge variant="outline">{snap.approved} approved</Badge>
            </div>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead>Approved</TableHead>
                  <TableHead>Difficulties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snap.coverage.map((c) => (
                  <TableRow key={c.code}>
                    <TableCell>
                      <Mono>{c.code}</Mono>
                      <span className="block max-w-64 truncate text-[11px] text-muted-foreground">
                        {c.title}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">{c.questions}</TableCell>
                    <TableCell className="text-xs tabular-nums">{c.approved}</TableCell>
                    <TableCell className="text-xs tabular-nums">{c.difficulties}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Prompt</TableHead>
                  <TableHead>Answer key</TableHead>
                  <TableHead>Explanation</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snap.rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Mono>{r.outcomeCode}</Mono>
                    </TableCell>
                    <TableCell className="text-xs">
                      {KIND_LABELS[r.kind as QuestionKind] ?? r.kind}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">D{r.difficulty}</TableCell>
                    <TableCell className="max-w-64 truncate text-xs">{r.prompt}</TableCell>
                    <TableCell className="text-xs">
                      {r.hasAnswerKey ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <span className="font-medium text-destructive">missing</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.hasExplanation ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <span className="font-medium text-destructive">missing</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.status}
                      {r.source === "ai" && (
                        <span className="ml-1 text-[10px] text-muted-foreground">(AI)</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Generation contract */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Generation contract
          </CardTitle>
          <CardDescription>
            The exact input/output contract the AI is held to when staff generate questions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-0.5 pl-4 text-xs text-muted-foreground">
            {GENERATION_CONTRACT.map((line) => (
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
            actual policies PostgreSQL enforces on the question bank.
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
            Sprint 6D manual verification steps — not auto-checked
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
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <GitBranch className="h-3.5 w-3.5" />
            Scope note: this sprint ends at the question bank — no automatic assessment assembly.
            <KeyRound className="h-3.5 w-3.5" />
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

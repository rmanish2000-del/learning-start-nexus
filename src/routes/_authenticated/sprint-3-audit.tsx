import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import {
  ArrowDown,
  CircleDashed,
  ClipboardCheck,
  Database,
  GitBranch,
  ListChecks,
  PlayCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DbErrorBlock, Mono, Pass, fmt } from "@/components/audit-shared";
import { getSprint3Audit, runSprint3Probes } from "@/lib/sprint3-audit.functions";
import type { Sprint3Count, Sprint3CrossOrgTest } from "@/lib/sprint3-audit.server";

export const Route = createFileRoute("/_authenticated/sprint-3-audit")({
  head: () => ({
    meta: [
      { title: "Sprint 3 Audit Center — EduOS" },
      {
        name: "description",
        content:
          "Independently verifiable proof for Sprint 3: gap detection, the deterministic recommendation engine, and the intervention workflow — with live data, RLS policies, and cross-organization denial probes.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Sprint3AuditPage,
});

const authRoute = getRouteApi("/_authenticated");

type Probes = Awaited<ReturnType<typeof runSprint3Probes>>;

function CountRow({ c }: { c: Sprint3Count }) {
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
      </div>
      <Pass pass={c.isolated} />
    </div>
  );
}

function CrossOrgCard({ tests }: { tests: Sprint3CrossOrgTest[] }) {
  return (
    <div className="space-y-3">
      {tests.map((t) => (
        <div key={t.key} className="rounded-lg border p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">{t.name}</p>
            <Pass pass={t.pass} skipped={t.skipped} />
          </div>
          <div className="mt-2 space-y-1.5 text-xs">
            <p>
              <span className="text-muted-foreground">Target org: </span>
              <span className="font-medium">{t.targetOrgName}</span>
            </p>
            {t.targetId ? (
              <p>
                <span className="text-muted-foreground">Target row: </span>
                <Mono>{t.targetId}</Mono>
              </p>
            ) : null}
            <p>
              <span className="text-muted-foreground">Operation: </span>
              <Mono>{t.operation}</Mono>
            </p>
            <p>
              <span className="text-muted-foreground">Expected: </span>
              {t.expectation}
            </p>
            <div className="pt-1">
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Database response
              </p>
              <div className="rounded-md border bg-muted/40 p-2.5 font-mono text-xs leading-relaxed">
                <div>{t.dbResponse.message}</div>
                {t.dbResponse.rowsAffected !== null ? (
                  <div>
                    <span className="text-muted-foreground">rows affected:</span>{" "}
                    {t.dbResponse.rowsAffected}
                  </div>
                ) : null}
              </div>
              {t.dbResponse.code ? (
                <div className="mt-1.5">
                  <DbErrorBlock error={{ code: t.dbResponse.code, message: t.dbResponse.message, details: null, hint: null }} />
                </div>
              ) : null}
              {t.postCheck ? (
                <p className="mt-1.5 text-xs text-muted-foreground">{t.postCheck}</p>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const CHECKLIST: { text: string; how: string }[] = [
  {
    text: "Gap detection runs on every submission",
    how: "Run probes — the Detection section re-executes the engine on a real submitted session and lists the gaps it produced per subtopic.",
  },
  {
    text: "Thresholds: < 70% = gap; < 50% = high severity",
    how: "Rule book card shows the exact constants; the Detection probe shows one subtopic above the threshold (e.g. Number Lines 100%) with no gap row.",
  },
  {
    text: "Recommendations are deterministic",
    how: "Run probes twice — the fingerprint hash before and after stays identical and the second run creates 0 rows. The rule book (subtopic × severity → fixed template) is printed on this page.",
  },
  {
    text: "One recommendation per open gap (idempotent)",
    how: "Detection probe second run: recsCreated = 0. Duplicate key learner_id+subtopic enforces one gap row per pair.",
  },
  {
    text: "Gaps auto-close at ≥ 70% on a later session",
    how: "Detection probe 'addressed' counter; gap registry on /interventions shows addressed status.",
  },
  {
    text: "Intervention workflow: accept → planned → in_progress → completed",
    how: "Run probes — the Workflow section walks all five steps as the signed-in staff caller with verbatim database responses.",
  },
  {
    text: "Students never see gaps or recommendations",
    how: "Sign in as the pilot student — this page shows 'denied (RLS)' for learning_gaps and recommendations counts.",
  },
  {
    text: "Students see accepted interventions only",
    how: "Sign in as aarav — home page Focus plan card lists interventions; interventions count here matches learner-scoped visibility.",
  },
  {
    text: "Cross-org isolation on all three tables",
    how: "Run probes — Cross-org section shows read/create/update against the other org all denied. Counts card shows visible < global.",
  },
  {
    text: "Policy registry is live, not claimed",
    how: "Section 6 lists policy names and expressions read from pg_policies at page-load time.",
  },
];

function Sprint3AuditPage() {
  const { role } = authRoute.useRouteContext();
  const isStaff = role === "admin" || role === "educator";

  const fetchAudit = useServerFn(getSprint3Audit);
  const auditQuery = useQuery({
    queryKey: ["sprint3-audit"],
    queryFn: () => fetchAudit(),
    staleTime: 15_000,
  });

  const runProbes = useServerFn(runSprint3Probes);
  const [probes, setProbes] = useState<Probes | null>(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    try {
      const res = await runProbes();
      setProbes(res);
      const parts = [res.detection?.pass ?? true, res.workflow?.pass ?? true, ...res.crossOrg.map((t) => t.pass)];
      const failed = parts.filter((p) => !p).length;
      if (failed === 0) toast.success("All Sprint 3 probes passed.");
      else toast.error(`${failed} probe(s) FAILED.`);
      void auditQuery.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Probe run failed");
    } finally {
      setRunning(false);
    }
  };

  const data = auditQuery.data;

  return (
    <div className="mx-auto max-w-5xl space-y-6 print:max-w-none">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <ShieldCheck className="h-5 w-5 text-primary" /> Sprint 3 Audit Center
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Gap detection · deterministic recommendations · intervention workflow. Every claim on
            this page is backed by a live database read or an executed probe — nothing is asserted
            without observable evidence.
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => auditQuery.refetch()}
            disabled={auditQuery.isFetching}
          >
            <RefreshCw className={auditQuery.isFetching ? "animate-spin" : ""} /> Refresh
          </Button>
          {isStaff ? (
            <Button size="sm" onClick={run} disabled={running}>
              <PlayCircle className={running ? "animate-pulse" : ""} />
              {running ? "Running…" : probes ? "Re-run probes" : "Run probes"}
            </Button>
          ) : null}
        </div>
      </div>

      {data ? (
        <p className="text-xs text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{data.me.role}</span>
          {data.me.orgName ? (
            <>
              {" "}· Org: <span className="font-medium text-foreground">{data.me.orgName}</span>
            </>
          ) : null}{" "}
          · Generated {fmt(data.generatedAt)}
        </p>
      ) : (
        <Skeleton className="h-4 w-72" />
      )}

      {/* 1 — Isolation counts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4 text-muted-foreground" /> 1 — Row visibility vs global totals
          </CardTitle>
          <CardDescription>
            Same query run twice: once as you (RLS applies), once with the service role (all
            organizations). Students see "denied" where policies exclude them entirely.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {data ? data.counts.map((c) => <CountRow key={c.table} c={c} />) : <Skeleton className="h-24 w-full" />}
        </CardContent>
      </Card>

      {/* 2 — Deterministic rule book */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <GitBranch className="h-4 w-4 text-muted-foreground" /> 2 — Deterministic rule book
          </CardTitle>
          <CardDescription>
            The engine has no model and no randomness: a gap below{" "}
            {data?.ruleBook.gapThresholdPct ?? 70}% opens (high severity below{" "}
            {data?.ruleBook.highSeverityBelowPct ?? 50}%), and each (subtopic, severity) pair maps
            to exactly one fixed template. Given the same inputs it always produces the same output.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-1.5 pr-3 font-medium">Rule</th>
                  <th className="py-1.5 pr-3 font-medium">Subtopic</th>
                  <th className="py-1.5 pr-3 font-medium">Severity</th>
                  <th className="py-1.5 pr-3 font-medium">Priority</th>
                  <th className="py-1.5 font-medium">Title</th>
                </tr>
              </thead>
              <tbody>
                {(data?.ruleBook.rules ?? []).map((r) => (
                  <tr key={r.ruleId} className="border-b last:border-0">
                    <td className="py-1.5 pr-3"><Mono>{r.ruleId}</Mono></td>
                    <td className="py-1.5 pr-3">{r.subtopic}</td>
                    <td className="py-1.5 pr-3">{r.severity}</td>
                    <td className="py-1.5 pr-3">{r.priority}</td>
                    <td className="py-1.5">{r.title}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 3 — Live chain */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">3 — Gap → recommendation → intervention chain</CardTitle>
          <CardDescription>
            Most recent intervention visible to you, joined back to the gap and recommendation that
            produced it — with IDs and timestamps at every hop.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!data ? (
            <Skeleton className="h-40 w-full" />
          ) : !data.chain ? (
            <p className="text-sm text-muted-foreground">
              No interventions visible to your account yet.
            </p>
          ) : (
            <div className="space-y-1.5">
              {[
                data.chain.gap && {
                  label: "Gap",
                  id: data.chain.gap.id,
                  detail: `${data.chain.gap.subtopic} — ${data.chain.gap.scorePct}% (${data.chain.gap.severity}), status ${data.chain.gap.status}`,
                  at: data.chain.gap.createdAt,
                },
                data.chain.recommendation && {
                  label: "Recommendation",
                  id: data.chain.recommendation.id,
                  detail: `${data.chain.recommendation.title} — rule ${data.chain.recommendation.ruleId}, priority ${data.chain.recommendation.priority}, status ${data.chain.recommendation.status}`,
                  at: data.chain.recommendation.createdAt,
                },
                {
                  label: "Intervention",
                  id: data.chain.intervention.id,
                  detail: `${data.chain.intervention.title} — status ${data.chain.intervention.status}${data.chain.intervention.targetDate ? `, target ${data.chain.intervention.targetDate}` : ""}`,
                  at: data.chain.intervention.createdAt,
                },
              ]
                .filter(Boolean)
                .map((node, i, arr) => (
                  <div key={node!.label}>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border p-3">
                      <Badge variant="secondary">{node!.label}</Badge>
                      <Mono>{node!.id}</Mono>
                      <span className="text-xs">{node!.detail}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{fmt(node!.at)}</span>
                    </div>
                    {i < arr.length - 1 && (
                      <ArrowDown className="mx-auto my-1 h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                ))}
              <p className="pt-1 text-xs text-muted-foreground">
                Learner: <span className="font-medium text-foreground">{data.chain.learnerName}</span>
                {data.chain.gap?.sessionId ? (
                  <>
                    {" "}· evidence session: <Mono>{data.chain.gap.sessionId}</Mono>
                  </>
                ) : null}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4 — Live data */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">4 — Live rows visible to you</CardTitle>
          <CardDescription>
            Read through your session — exactly what RLS allows you to see, nothing more.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!data ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Learning gaps ({data.gaps.length})
                </p>
                <div className="space-y-1.5">
                  {data.gaps.length === 0 && (
                    <p className="text-sm text-muted-foreground">None visible.</p>
                  )}
                  {data.gaps.map((g) => (
                    <div key={g.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border px-3 py-2 text-xs">
                      <Mono>{g.id.slice(0, 8)}…</Mono>
                      <span className="font-medium">{g.learners?.full_name ?? "—"}</span>
                      <span>{g.subtopic}</span>
                      <span className="text-muted-foreground">
                        {g.items_correct}/{g.items_total} ({g.gap_score_pct}%) · {g.severity} · {g.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Recommendations ({data.recommendations.length})
                </p>
                <div className="space-y-1.5">
                  {data.recommendations.length === 0 && (
                    <p className="text-sm text-muted-foreground">None visible.</p>
                  )}
                  {data.recommendations.map((r) => (
                    <div key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border px-3 py-2 text-xs">
                      <Mono>{r.id.slice(0, 8)}…</Mono>
                      <Mono>{r.rule_id}</Mono>
                      <span className="font-medium">{r.learners?.full_name ?? "—"}</span>
                      <span>{r.title}</span>
                      <span className="text-muted-foreground">p{r.priority} · {r.status}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Interventions ({data.interventions.length})
                </p>
                <div className="space-y-1.5">
                  {data.interventions.length === 0 && (
                    <p className="text-sm text-muted-foreground">None visible.</p>
                  )}
                  {data.interventions.map((i) => (
                    <div key={i.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border px-3 py-2 text-xs">
                      <Mono>{i.id.slice(0, 8)}…</Mono>
                      <span className="font-medium">{i.learners?.full_name ?? "—"}</span>
                      <span>{i.title}</span>
                      <span className="text-muted-foreground">{i.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 5 — Probes */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardCheck className="h-4 w-4 text-muted-foreground" /> 5 — Executed probes
              </CardTitle>
              <CardDescription>
                Real operations against live data, with verbatim database responses. Staff only.
              </CardDescription>
            </div>
            {isStaff && !probes ? (
              <Button size="sm" onClick={run} disabled={running} className="print:hidden">
                <PlayCircle className={running ? "animate-pulse" : ""} />
                {running ? "Running…" : "Run probes"}
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {!isStaff ? (
            <p className="text-sm text-muted-foreground">
              Probes perform privileged write attempts and are available to staff accounts only.
              Sign in as an admin or educator to execute them.
            </p>
          ) : !probes ? (
            <p className="text-sm text-muted-foreground">
              Not run yet in this session. Press “Run probes” to execute detection, workflow, and
              cross-organization probes against live data.
            </p>
          ) : (
            <div className="space-y-6">
              <p className="text-xs text-muted-foreground">Last run {fmt(probes.generatedAt)}</p>

              {/* Detection probe */}
              <div className="space-y-3">
                <p className="text-sm font-medium">Detection — engine re-run on the latest submitted session</p>
                {!probes.detection ? (
                  <p className="text-sm text-muted-foreground">No submitted session visible to re-run.</p>
                ) : (
                  <div className="rounded-lg border p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm">
                        {probes.detection.learnerName} — {probes.detection.assessmentTitle}{" "}
                        <span className="text-muted-foreground">({probes.detection.scorePct}%)</span>
                      </p>
                      <Pass pass={probes.detection.pass} />
                    </div>
                    <div className="mt-2 space-y-1.5 text-xs">
                      <p>
                        <span className="text-muted-foreground">Session: </span>
                        <Mono>{probes.detection.sessionId}</Mono>
                      </p>
                      <div className="grid gap-1.5 sm:grid-cols-2">
                        <div className="rounded-md border bg-muted/40 p-2.5">
                          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            Subtopic scores
                          </p>
                          {probes.detection.subtopicStats.map((s) => (
                            <div key={s.subtopic} className="flex justify-between">
                              <span>{s.subtopic}</span>
                              <span className={s.severity ? "font-medium text-destructive" : "text-muted-foreground"}>
                                {s.correct}/{s.total} ({s.pct}%){s.severity ? ` — gap (${s.severity})` : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="rounded-md border bg-muted/40 p-2.5">
                          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            Idempotency
                          </p>
                          <div>run 1: detected {probes.detection.firstRun.detected}, refreshed {probes.detection.firstRun.refreshed}, addressed {probes.detection.firstRun.addressed}, recs +{probes.detection.firstRun.recsCreated}</div>
                          <div>run 2: detected {probes.detection.secondRun.detected}, reopened {probes.detection.secondRun.reopened}, recs +{probes.detection.secondRun.recsCreated}</div>
                          <div className="mt-1 break-all text-muted-foreground">
                            fingerprint: {probes.detection.fingerprintAfter.slice(0, 48)}…
                          </div>
                          <div className={probes.detection.fingerprintBefore === probes.detection.fingerprintAfter ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}>
                            {probes.detection.fingerprintBefore === probes.detection.fingerprintAfter
                              ? "fingerprint unchanged across runs — deterministic"
                              : "fingerprint CHANGED — non-deterministic"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Workflow probe */}
              <div className="space-y-3">
                <p className="text-sm font-medium">
                  Workflow — full lifecycle executed as the signed-in staff caller
                  {probes.workflow ? ` (learner: ${probes.workflow.learnerName})` : ""}
                </p>
                {!probes.workflow ? (
                  <p className="text-sm text-muted-foreground">No learner available in your organization.</p>
                ) : (
                  <div className="space-y-2">
                    {probes.workflow.steps.map((s) => (
                      <div key={s.key} className="rounded-lg border p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-medium">{s.name}</p>
                          <Pass pass={s.pass} />
                        </div>
                        <div className="mt-1.5 rounded-md border bg-muted/40 p-2.5 font-mono text-xs">
                          {s.dbResponse}
                          {s.rowId ? (
                            <div className="text-muted-foreground">row: {s.rowId}</div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cross-org probes */}
              <div className="space-y-3">
                <p className="text-sm font-medium">Cross-organization denials</p>
                <CrossOrgCard tests={probes.crossOrg} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 6 — Policy registry */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" /> 6 — Live policy registry
          </CardTitle>
          <CardDescription>
            Read from pg_policies at page load — the policies the database is actually enforcing
            right now on the three Sprint 3 tables.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(data?.policies ?? []).map((p) => (
            <div key={`${p.tablename}.${p.policyname}`} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Mono>{p.tablename}</Mono>
                <Mono>{p.policyname}</Mono>
                <Badge variant="outline">{p.cmd}</Badge>
                <span className="text-xs text-muted-foreground">applies to: {p.roles}</span>
              </div>
              {p.using_expression ? (
                <pre className="mt-2 overflow-x-auto rounded-md bg-muted/50 p-2 font-mono text-xs whitespace-pre-wrap">
                  {p.using_expression}
                </pre>
              ) : null}
              {p.with_check_expression ? (
                <pre className="mt-2 overflow-x-auto rounded-md bg-muted/50 p-2 font-mono text-xs whitespace-pre-wrap">
                  WITH CHECK: {p.with_check_expression}
                </pre>
              ) : null}
            </div>
          ))}
          {data && data.policies.length === 0 && (
            <p className="text-sm text-muted-foreground">No policies visible.</p>
          )}
        </CardContent>
      </Card>

      {/* 7 — How to verify by hand */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="h-4 w-4 text-muted-foreground" /> 7 — How to verify by hand
          </CardTitle>
          <CardDescription>
            Each item names the observable evidence for it — an independent reviewer can validate
            Sprint 3 without trusting any claim in this sentence.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {CHECKLIST.map((c) => (
            <div key={c.text} className="flex gap-3 rounded-lg border p-3">
              <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{c.text}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{c.how}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

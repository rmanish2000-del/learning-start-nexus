import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { Database, PlayCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DbErrorBlock, Mono, Pass, fmt } from "@/components/audit-shared";
import { AUDIT_TABLES, type CrossOrgTest } from "@/lib/audit.server";
import { getRlsPolicyAudit, runCrossOrgTestRunner } from "@/lib/audit.functions";
import { friendlyErrorMessage } from "@/lib/user-errors";

export const Route = createFileRoute("/_authenticated/rls-verification")({
  head: () => ({
    meta: [
      { title: "RLS Verification — EduOS" },
      {
        name: "description",
        content:
          "Live row-level security audit: actual database policy names and expressions for the Sprint 2 assessment tables, plus a cross-organization test runner with verbatim database responses.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RlsVerificationPage,
});

const authRoute = getRouteApi("/_authenticated");

const TABLE_LABELS: Record<string, string> = {
  assessments: "assessments",
  assessment_sessions: "assessment_sessions",
  assessment_items: "assessment_items",
  learner_assessments: "learner_assessments",
  learner_evidence: "learner_evidence",
};

function RlsVerificationPage() {
  const { role } = authRoute.useRouteContext();
  const isStaff = role === "admin" || role === "educator";

  const fetchPolicies = useServerFn(getRlsPolicyAudit);
  const policiesQuery = useQuery({
    queryKey: ["rls-policy-audit"],
    queryFn: () => fetchPolicies(),
    staleTime: 30_000,
  });

  const runTests = useServerFn(runCrossOrgTestRunner);
  const [tests, setTests] = useState<CrossOrgTest[] | null>(null);
  const [ranAt, setRanAt] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    try {
      const res = await runTests();
      setTests(res.tests);
      setRanAt(res.generatedAt);
      const failed = res.tests.filter((t) => !t.pass).length;
      if (failed === 0) toast.success("All cross-organization tests passed.");
      else toast.error(`${failed} test(s) FAILED — policy breach detected.`);
    } catch (err) {
      toast.error(friendlyErrorMessage(err, "Test runner failed"));
    } finally {
      setRunning(false);
    }
  };

  const data = policiesQuery.data;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <ShieldCheck className="h-5 w-5 text-primary" /> RLS Verification
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Policy names and expressions below are read live from the database catalog
            (pg_policies) — not from application code.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => policiesQuery.refetch()}
          disabled={policiesQuery.isFetching}
        >
          <RefreshCw className={policiesQuery.isFetching ? "animate-spin" : ""} /> Refresh
        </Button>
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
      ) : null}

      {/* 1 — Live policy registry */}
      <div className="space-y-4">
        {AUDIT_TABLES.map((table) => {
          const rows = (data?.policies ?? []).filter((p) => p.tablename === table);
          return (
            <Card key={table}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <Mono>{TABLE_LABELS[table]}</Mono>
                  <Badge variant={rows.length > 0 ? "secondary" : "destructive"}>
                    {rows.length} {rows.length === 1 ? "policy" : "policies"}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {rows.length === 0
                    ? "No policies found — table would be fully locked or fully exposed."
                    : "Policies currently enforced by the database on this table."}
                </CardDescription>
              </CardHeader>
              {rows.length > 0 ? (
                <CardContent className="space-y-3">
                  {rows.map((p) => (
                    <div key={p.policyname} className="rounded-lg border p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Mono>{p.policyname}</Mono>
                        <Badge variant="outline">{p.cmd}</Badge>
                        <span className="text-xs text-muted-foreground">applies to: {p.roles}</span>
                      </div>
                      {p.using_expression ? (
                        <div className="mt-2">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            USING
                          </p>
                          <pre className="mt-1 overflow-x-auto rounded-md bg-muted/50 p-2 font-mono text-xs whitespace-pre-wrap">
                            {p.using_expression}
                          </pre>
                        </div>
                      ) : null}
                      {p.with_check_expression ? (
                        <div className="mt-2">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            WITH CHECK
                          </p>
                          <pre className="mt-1 overflow-x-auto rounded-md bg-muted/50 p-2 font-mono text-xs whitespace-pre-wrap">
                            {p.with_check_expression}
                          </pre>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </CardContent>
              ) : null}
            </Card>
          );
        })}
      </div>

      {/* 2 — Cross-organization test runner */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Cross-Organization Test Runner</CardTitle>
              <CardDescription>
                Executes real database operations as <span className="font-medium">you</span>{" "}
                against rows owned by another organization, then shows the verbatim database
                response. A row is located with the service role first, so the target is
                guaranteed to exist.
              </CardDescription>
            </div>
            {isStaff ? (
              <Button onClick={run} disabled={running} size="sm">
                <PlayCircle className={running ? "animate-pulse" : ""} />
                {running ? "Running…" : tests ? "Re-run tests" : "Run tests"}
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {!isStaff ? (
            <p className="text-sm text-muted-foreground">
              The test runner performs privileged write attempts and is available to staff
              accounts only. Sign in as an admin or educator to execute it.
            </p>
          ) : !tests ? (
            <p className="text-sm text-muted-foreground">
              Not run yet in this session. Press “Run tests” to execute the three cross-org
              probes against live data.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Last run {fmt(ranAt)}</p>
              {tests.map((t) => (
                <div key={t.key} className="rounded-lg border p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{t.name}</p>
                    <Pass pass={t.pass} skipped={t.skipped} />
                  </div>
                  <div className="mt-2 space-y-1.5 text-xs">
                    <p>
                      <span className="text-muted-foreground">Target org: </span>
                      <span className="font-medium">{t.targetOrgName}</span>{" "}
                      <Mono>({t.targetOrgId})</Mono>
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
                      <p className="mb-1 font-medium uppercase tracking-wide text-[11px] text-muted-foreground">
                        Database response
                      </p>
                      <div className="rounded-md border bg-muted/40 p-2.5 font-mono text-xs leading-relaxed">
                        <div>{t.dbResponse.summary}</div>
                        {t.dbResponse.rowsAffected !== null ? (
                          <div>
                            <span className="text-muted-foreground">rows affected:</span>{" "}
                            {t.dbResponse.rowsAffected}
                          </div>
                        ) : null}
                      </div>
                      {t.dbResponse.error ? (
                        <div className="mt-1.5">
                          <DbErrorBlock error={t.dbResponse.error} />
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}

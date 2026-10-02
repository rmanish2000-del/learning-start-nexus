import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { FileCheck2, Printer } from "lucide-react";

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
import { Mono, Pass, fmt } from "@/components/audit-shared";
import { getAssessmentBuildProof, runCrossOrgTestRunner } from "@/lib/audit.functions";

export const Route = createFileRoute("/_authenticated/assessment-proof")({
  head: () => ({
    meta: [
      { title: "Assessment Build Proof — EduOS" },
      {
        name: "description",
        content:
          "Single-page Sprint 2 verification export: live row counts, cross-organization denial results, and the actual RLS policy registry — printable for independent review.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AssessmentProofPage,
});

const authRoute = getRouteApi("/_authenticated");

function AssessmentProofPage() {
  const { role } = authRoute.useRouteContext();
  const isStaff = role === "admin" || role === "educator";

  const fetchProof = useServerFn(getAssessmentBuildProof);
  const proof = useQuery({
    queryKey: ["assessment-build-proof"],
    queryFn: () => fetchProof(),
    staleTime: 10_000,
  });

  const runTests = useServerFn(runCrossOrgTestRunner);
  const crossOrg = useQuery({
    queryKey: ["assessment-build-proof-crossorg"],
    queryFn: () => runTests(),
    enabled: isStaff,
    staleTime: 10_000,
  });

  const data = proof.data;
  const tests = crossOrg.data?.tests ?? null;
  const policies = data?.policies ?? [];
  const policyTables = [...new Set(policies.map((p) => p.tablename))];

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <FileCheck2 className="h-5 w-5 text-primary" /> Assessment Build Proof
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sprint 2 verification export. Every figure below is queried live from the database
            when this page loads — print or save as PDF for independent review.
          </p>
        </div>
        <Button className="print:hidden" size="sm" onClick={() => window.print()}>
          <Printer /> Print / Save PDF
        </Button>
      </div>

      {data ? (
        <Card>
          <CardContent className="grid gap-3 py-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Generated
              </p>
              <p>{fmt(data.generatedAt)}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Reviewer role
              </p>
              <p className="capitalize">{data.me.role}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Organization
              </p>
              <p>{data.me.orgName ?? "—"}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Reviewer ID
              </p>
              <Mono>{data.me.userId}</Mono>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Counts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Live row counts</CardTitle>
          <CardDescription>
            “Visible to you” is queried as the signed-in reviewer (row-level security applies);
            “All organizations” is the global total. A gap between the two is direct proof of
            organization isolation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dataset</TableHead>
                <TableHead className="text-right">Visible to you</TableHead>
                <TableHead className="text-right">All organizations</TableHead>
                <TableHead>Isolation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.counts ?? []).map((c) => (
                <TableRow key={c.table}>
                  <TableCell>
                    {c.label} <Mono>({c.table})</Mono>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {c.visibleToYou === null ? "access denied" : c.visibleToYou}
                  </TableCell>
                  <TableCell className="text-right">{c.globalAllOrgs}</TableCell>
                  <TableCell>
                    {c.isolated ? (
                      <Badge variant="secondary">isolated</Badge>
                    ) : (
                      <Badge variant="destructive">not isolated</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {data ? (
                <TableRow>
                  <TableCell>
                    Submitted sessions <Mono>(status = submitted)</Mono>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {data.submittedVisible === null ? "access denied" : data.submittedVisible}
                  </TableCell>
                  <TableCell className="text-right">{data.submittedGlobal}</TableCell>
                  <TableCell>
                    {data.submittedVisible !== null &&
                    data.submittedVisible < data.submittedGlobal ? (
                      <Badge variant="secondary">isolated</Badge>
                    ) : (
                      <Badge variant="outline">n/a</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cross-org denial results */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cross-organization denial results</CardTitle>
          <CardDescription>
            Executed live as the reviewer against rows owned by another organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isStaff ? (
            <p className="text-sm text-muted-foreground">
              Cross-organization write attempts require a staff account. Sign in as an admin or
              educator to include these results in the export.
            </p>
          ) : crossOrg.isLoading ? (
            <p className="text-sm text-muted-foreground">Running cross-organization tests…</p>
          ) : !tests ? (
            <p className="text-sm text-muted-foreground">No results.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Attempt</TableHead>
                  <TableHead>Target org</TableHead>
                  <TableHead>Database response</TableHead>
                  <TableHead>Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tests.map((t) => (
                  <TableRow key={t.key}>
                    <TableCell className="text-sm font-medium">{t.name}</TableCell>
                    <TableCell className="text-xs">{t.targetOrgName}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {t.dbResponse.error
                        ? `${t.dbResponse.error.code ?? ""} ${t.dbResponse.error.message}`
                        : t.dbResponse.summary}
                    </TableCell>
                    <TableCell>
                      <Pass pass={t.pass} skipped={t.skipped} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* RLS verification results */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">RLS verification results</CardTitle>
          <CardDescription>
            Policy registry read live from the database catalog (pg_policies) at export time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {policyTables.length === 0 ? (
            <p className="text-sm text-muted-foreground">Loading policies…</p>
          ) : (
            policyTables.map((table) => {
              const rows = policies.filter((p) => p.tablename === table);
              return (
                <div
                  key={table}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border px-3 py-2 text-sm"
                >
                  <Mono>{table}</Mono>
                  <Badge variant="secondary">
                    {rows.length} {rows.length === 1 ? "policy" : "policies"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {rows.map((r) => r.policyname).join(" · ")}
                  </span>
                </div>
              );
            })
          )}
          <p className="pt-1 text-xs text-muted-foreground">
            Full policy expressions (USING / WITH CHECK) are on the RLS Verification page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

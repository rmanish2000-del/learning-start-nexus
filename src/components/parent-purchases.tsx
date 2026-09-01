import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowUpRight,
  FileText,
  LogIn,
  ShieldCheck,
} from "lucide-react";

import { getParentAccount } from "@/lib/parent-account.functions";
import { formatInr } from "@/lib/parent-diagnostic-shared";
import { QueryError } from "@/components/query-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Returning-parent surface: the students on the account and every purchase
 * made with it, each with the one action that moves it forward — resume the
 * diagnostic, read the report, or upgrade.
 */
export function ParentPurchases() {
  const accountFn = useServerFn(getParentAccount);
  const query = useQuery({ queryKey: ["parent-account"], queryFn: () => accountFn() });

  if (query.isLoading) return <Skeleton className="h-48 w-full" />;
  if (query.isError) {
    return (
      <QueryError title="Your account could not be loaded" error={query.error} onRetry={() => void query.refetch()} />
    );
  }

  const account = query.data;
  if (!account) return null;
  const { students, purchases } = account;
  const awaiting = students.filter((s) => s.assignmentStatus === "awaiting_assignment").length;

  return (
    <div className="space-y-4">
      {students.length > 0 ? (
        <Card className="border-primary/25 bg-primary/[0.03]">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" /> What happens next
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-3">
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">1 · Diagnostic</p>
              <p className="mt-1 text-sm">
                Your child signs in with their own handle and PIN and answers the diagnostic — no
                educator required. Your report is instant when they finish.
              </p>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">2 · Educator</p>
              <p className="mt-1 text-sm">
                {awaiting > 0
                  ? "An educator is only assigned when you take the Annual Plan. Our centre admin does it within 1 working day — you never have to pick one."
                  : "An educator is assigned and reviewing the report."}
              </p>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">3 · Plan</p>
              <p className="mt-1 text-sm">
                The educator approves interventions; progress and consent controls appear on this page.
              </p>
            </div>
          </CardContent>

        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" /> Your purchases
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {purchases.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing purchased yet. A diagnostic takes about 20 minutes and the report is instant.
            </p>
          ) : (
            purchases.map((p) => (
              <div
                key={p.orderRef}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {p.purpose === "diagnostic" ? "Diagnostic" : "Annual Plan"}
                    {p.subject ? ` · ${p.subject}` : ""}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.studentName ?? "—"}
                    {p.unitTitle ? ` · ${p.unitTitle}` : ""} · {formatInr(p.amountPaise)} · {p.orderRef}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={p.status === "paid" ? "secondary" : "outline"}>{p.status}</Badge>
                  {p.status === "paid" && p.accessToken ? (
                    p.sessionStatus === "submitted" ? (
                      <>
                        <Button asChild size="sm" variant="outline">
                          <Link to="/diagnostic/report/$token" params={{ token: p.accessToken }}>
                            <FileText className="mr-1.5 h-3.5 w-3.5" /> Report
                          </Link>
                        </Button>
                        {p.purpose === "diagnostic" ? (
                          <Button asChild size="sm">
                            <Link to="/upgrade/$token" params={{ token: p.accessToken }}>
                              <ArrowUpRight className="mr-1.5 h-3.5 w-3.5" /> Upgrade
                            </Link>
                          </Button>
                        ) : null}
                      </>
                    ) : (
                      <Button asChild size="sm">
                        <Link to="/diagnostic/handoff/$token" params={{ token: p.accessToken }}>
                          <LogIn className="mr-1.5 h-3.5 w-3.5" /> Sign-in details
                        </Link>
                      </Button>
                    )
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

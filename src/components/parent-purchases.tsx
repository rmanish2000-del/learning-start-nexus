import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUpRight, FileText, PlayCircle, ShoppingBag, Users } from "lucide-react";

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

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" /> Students
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {students.length === 0 ? (
            <p className="text-sm text-muted-foreground">No student profile yet.</p>
          ) : (
            students.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{s.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.board} · Class {s.grade}
                  </p>
                </div>
                <Badge variant="secondary">{s.masteryScore}%</Badge>
              </div>
            ))
          )}
          <Button asChild variant="outline" className="w-full">
            <Link to="/diagnostic">
              <ShoppingBag className="mr-2 h-4 w-4" /> Buy a diagnostic
            </Link>
          </Button>
        </CardContent>
      </Card>

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
                    {p.purpose === "diagnostic" ? "Diagnostic" : "Board Success Plan"}
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
                        <Link to="/diagnostic/session/$token" params={{ token: p.accessToken }}>
                          <PlayCircle className="mr-1.5 h-3.5 w-3.5" /> Resume
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

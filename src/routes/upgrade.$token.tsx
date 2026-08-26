import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowRight, CheckCircle2, Info, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

import { DiagnosticShell } from "@/components/diagnostic-shell";
import { QueryError } from "@/components/query-error";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchDiagnosticReport,
  payDiagnosticOrder,
  startUpgradeOrder,
} from "@/lib/parent-diagnostic.functions";
import { PRICING, formatInr } from "@/lib/parent-diagnostic-shared";

const TITLE = "Board Success Plan — ₹2,999 a year | EduOS";
const DESCRIPTION =
  "Unlimited diagnostics and reassessments on fresh items, AI Tutor scoped to approved interventions, and fortnightly parent reports for one child's board year.";

export const Route = createFileRoute("/upgrade/$token")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UpgradePage,
});

const UNLOCKS = [
  "Unlimited AI Tutor on every gap in this report, scoped to the approved intervention for that outcome.",
  "Reassessment on fresh items the diagnostic never showed, so the mastery lift is real.",
  "Unlimited diagnostics across all subjects for the grade, not just the chapter group you bought.",
  "Fortnightly parent report: gaps detected, gaps closed, mastery lift, tutor minutes.",
  "Evidence portfolio with verifier attribution for every closed gap.",
];

function UpgradePage() {
  const { token } = Route.useParams();
  const viewFn = useServerFn(fetchDiagnosticReport);
  const createFn = useServerFn(startUpgradeOrder);
  const payFn = useServerFn(payDiagnosticOrder);
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ["diagnostic-report", token],
    queryFn: () => viewFn({ data: { token } }),
  });
  const [pending, setPending] = useState(false);

  const view = query.data;

  async function purchase() {
    setPending(true);
    try {
      // Amount is computed server-side from the offer rules; the page sends none.
      const order = await createFn({ data: { token } });
      const paid = await payFn({ data: { orderRef: order.orderRef, outcome: "success" } });
      if (paid.status !== "paid") throw new Error("Payment was not captured.");
      toast.success("Board Success Plan activated.");
      await query.refetch();
      await navigate({ to: "/diagnostic/report/$token", params: { token } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The upgrade could not be completed.");
    } finally {
      setPending(false);
    }
  }

  if (query.isLoading) {
    return (
      <DiagnosticShell>
        <Skeleton className="h-72 w-full" />
      </DiagnosticShell>
    );
  }
  if (query.isError || !view) {
    return (
      <DiagnosticShell>
        <QueryError title="This upgrade link is not valid" error={query.error} onRetry={() => void query.refetch()} />
      </DiagnosticShell>
    );
  }

  const gapCount = view.report?.gaps.length ?? 0;
  const offer = view.offer;

  return (
    <DiagnosticShell footerNote={`${view.subject} · ${view.unitTitle}`}>
      <section className="space-y-3">
        <Badge variant="secondary">Board Success Plan · one child · one board year</Badge>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {gapCount > 0
            ? `Close ${view.childFirstName}'s ${gapCount} open ${gapCount === 1 ? "gap" : "gaps"} this year.`
            : `Hold ${view.childFirstName}'s level through the board year.`}
        </h1>
        {view.report && gapCount > 0 ? (
          <p className="text-sm text-muted-foreground">
            At risk right now: {view.report.gaps.slice(0, 3).map((g) => g.code).join(", ")}
            {gapCount > 3 ? ` and ${gapCount - 3} more` : ""} — about {view.report.marksAtRiskTotal} marks of an 80-mark
            paper.
          </p>
        ) : null}
      </section>

      {view.planPurchased ? (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-base">The plan is already active</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>Order {view.planOrderRef}. Everything in the report is unlocked for {view.childFirstName}.</p>
            <Button asChild>
              <Link to="/diagnostic/report/$token" params={{ token }}>
                Back to the report <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="mt-8 border-primary/40">
          <CardHeader>
            <CardTitle className="text-base">What you pay</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap items-baseline gap-3">
              {offer.creditApplied ? (
                <>
                  <span className="text-sm text-muted-foreground line-through">{formatInr(offer.listPaise)}</span>
                  <span className="text-3xl font-semibold tracking-tight">
                    {formatInr(offer.firstInvoicePaise)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    for year one · {formatInr(offer.creditPaise)} diagnostic credit applied · renews at{" "}
                    {formatInr(PRICING.planPaise)}/yr
                  </span>
                </>
              ) : (
                <>
                  <span className="text-3xl font-semibold tracking-tight">{formatInr(offer.listPaise)}</span>
                  <span className="text-sm text-muted-foreground">per year · renews annually</span>
                </>
              )}
            </div>
            {offer.creditApplied ? (
              <p className="text-xs text-muted-foreground">
                The credit is available for {offer.daysLeft} more {offer.daysLeft === 1 ? "day" : "days"}. After that
                the plan is {formatInr(PRICING.planPaise)} with no discount shown.
              </p>
            ) : null}

            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-medium">What changes today</p>
              {UNLOCKS.map((line) => (
                <p key={line} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {line}
                </p>
              ))}
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                This pilot checkout is a simulation — no money moves and no card details are collected.
              </AlertDescription>
            </Alert>

            <Button size="lg" className="w-full" onClick={purchase} disabled={pending}>
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
              Start the plan — {formatInr(offer.firstInvoicePaise)}
            </Button>

            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
              <span>Cancel anytime, access runs to the period end</span>
              <span>No card stored by EduOS</span>
              <span>Data deleted on request</span>
              <span>Sibling plan {formatInr(249_900)}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </DiagnosticShell>
  );
}

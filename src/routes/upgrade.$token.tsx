import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowRight, CheckCircle2, Info, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

import { ParentAuthGate } from "@/components/parent-auth-gate";
import { useSupabaseUser } from "@/lib/use-supabase-user";
import { DiagnosticShell } from "@/components/diagnostic-shell";
import { useI18n } from "@/lib/i18n/context";
import { QueryError } from "@/components/query-error";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createPaymentIntent,
  fetchDiagnosticReport,
  reportPaymentFailure,
  startUpgradeOrder,
  verifyPayment,
} from "@/lib/parent-diagnostic.functions";
import { openRazorpayCheckout } from "@/lib/razorpay-checkout";
import { CHAPTER_GROUP_MARKS, PRICING, formatInr } from "@/lib/parent-diagnostic-shared";

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


// Identity gate: the report, the run and the upgrade are account-owned. The
// server re-checks ownership on every call; this only keeps the UI honest.
function UpgradePage() {
  const { token } = Route.useParams();
  const { data: user, isLoading } = useSupabaseUser();
  if (isLoading) {
    return (
      <DiagnosticShell>
        <Skeleton className="h-64 w-full" />
      </DiagnosticShell>
    );
  }
  if (!user) {
    return (
      <DiagnosticShell>
        <ParentAuthGate next={`/upgrade/${token}`}>{null}</ParentAuthGate>
      </DiagnosticShell>
    );
  }
  return <UpgradePageBody />;
}

function UpgradePageBody() {
  const { t } = useI18n();
  const { token } = Route.useParams();
  const viewFn = useServerFn(fetchDiagnosticReport);
  const createFn = useServerFn(startUpgradeOrder);
  const intentFn = useServerFn(createPaymentIntent);
  const verifyFn = useServerFn(verifyPayment);
  const failFn = useServerFn(reportPaymentFailure);
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
      if (order.status !== "paid") {
        const intent = await intentFn({ data: { orderRef: order.orderRef } });
        if (!intent.razorpayOrderId) throw new Error("The payment gateway is unavailable right now.");
        const result = await openRazorpayCheckout({
          keyId: intent.keyId,
          razorpayOrderId: intent.razorpayOrderId,
          amountPaise: intent.amountPaise,
          description: intent.description,
          notes: { order_ref: order.orderRef },
        });
        if (!result) {
          await failFn({ data: { orderRef: order.orderRef, reason: "Checkout dismissed by the parent" } });
          toast.message(t("pay.cancelled", "Payment cancelled. Nothing was charged."));
          return;
        }
        const paid = await verifyFn({
          data: {
            orderRef: order.orderRef,
            razorpayOrderId: result.razorpay_order_id,
            razorpayPaymentId: result.razorpay_payment_id,
            signature: result.razorpay_signature,
          },
        });
        if (paid.status !== "paid") throw new Error("Payment was not captured.");
      }
      toast.success(t("upgrade.activated", "Board Success Plan activated."));
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
        <QueryError title={t("upgrade.invalid", "This upgrade link is not valid")} error={query.error} onRetry={() => void query.refetch()} />
      </DiagnosticShell>
    );
  }

  const gapCount = view.report?.gaps.length ?? 0;
  const offer = view.offer;

  return (
    <DiagnosticShell footerNote={`${view.subject} · ${view.unitTitle}`}>
      <section className="space-y-3">
        <Badge variant="secondary">
          {t("upgrade.badge", "Board Success Plan · one child · one board year")}
        </Badge>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {gapCount > 0
            ? t(
                "upgrade.title.gaps",
                `Close ${view.childFirstName}'s ${gapCount} open ${gapCount === 1 ? "gap" : "gaps"} this year.`,
                { name: view.childFirstName, n: gapCount },
              )
            : t("upgrade.title.secure", `Hold ${view.childFirstName}'s level through the board year.`, {
                name: view.childFirstName,
              })}
        </h1>
        {view.report && gapCount > 0 ? (
          <p className="text-sm text-muted-foreground">
            {t(
              "upgrade.atRisk",
              `At risk right now: ${view.report.gaps.slice(0, 3).map((g) => g.code).join(", ")}${
                gapCount > 3 ? ` and ${gapCount - 3} more` : ""
              } — about ${view.report.marksAtRiskTotal} of the ~${CHAPTER_GROUP_MARKS} marks this chapter group carries.`,
              {
                codes: view.report.gaps.slice(0, 3).map((g) => g.code).join(", "),
                more: gapCount > 3 ? String(gapCount - 3) : "0",
                marks: view.report.marksAtRiskTotal,
                total: CHAPTER_GROUP_MARKS,
              },
            )}
          </p>
        ) : null}
      </section>

      {view.planPurchased ? (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-base">{t("upgrade.active.title", "The plan is already active")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              {t(
                "upgrade.active.body",
                `Order ${view.planOrderRef}. Everything in the report is unlocked for ${view.childFirstName}.`,
                { ref: view.planOrderRef ?? "", name: view.childFirstName },
              )}
            </p>
            <Button asChild>
              <Link to="/diagnostic/report/$token" params={{ token }}>
                {t("upgrade.backToReport", "Back to the report")} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="mt-8 border-primary/40">
          <CardHeader>
            <CardTitle className="text-base">{t("upgrade.pay.title", "What you pay")}</CardTitle>
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
                    {t(
                      "upgrade.pay.creditLine",
                      `for year one · ${formatInr(offer.creditPaise)} diagnostic credit applied · renews at ${formatInr(PRICING.planPaise)}/yr`,
                      { credit: formatInr(offer.creditPaise), renew: formatInr(PRICING.planPaise) },
                    )}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-3xl font-semibold tracking-tight">{formatInr(offer.listPaise)}</span>
                  <span className="text-sm text-muted-foreground">{t("upgrade.pay.perYear", "per year · renews annually")}</span>
                </>
              )}
            </div>
            {offer.creditApplied ? (
              <p className="text-xs text-muted-foreground">
                {t(
                  "upgrade.pay.creditWindow",
                  `The credit is available for ${offer.daysLeft} more ${offer.daysLeft === 1 ? "day" : "days"}. After that the plan is ${formatInr(PRICING.planPaise)} with no discount shown.`,
                  { days: offer.daysLeft, price: formatInr(PRICING.planPaise) },
                )}
              </p>
            ) : null}

            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("upgrade.unlock.title", "What changes today")}</p>
              {UNLOCKS.map((line, i) => (
                <p key={line} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {t(`upgrade.unlock.${i}`, line)}
                </p>
              ))}
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {t(
                  "pay.secureNote",
                  "Payments are processed securely by Razorpay. EduOS never sees or stores your card details.",
                )}
              </AlertDescription>
            </Alert>

            <Button size="lg" className="w-full" onClick={purchase} disabled={pending}>
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
              {t("upgrade.cta", `Start the plan — ${formatInr(offer.firstInvoicePaise)}`, {
                price: formatInr(offer.firstInvoicePaise),
              })}
            </Button>

            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
              <span>{t("upgrade.trust.0", "Cancel anytime, access runs to the period end")}</span>
              <span>{t("upgrade.trust.1", "No card stored by EduOS")}</span>
              <span>{t("upgrade.trust.2", "Data deleted on request")}</span>
              <span>
                {t("upgrade.trust.sibling", `Sibling plan ${formatInr(249_900)}`, { price: formatInr(249_900) })}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </DiagnosticShell>
  );
}

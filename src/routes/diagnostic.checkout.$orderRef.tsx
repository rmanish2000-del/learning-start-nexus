import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CheckCircle2, Info, Loader2, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { DiagnosticShell } from "@/components/diagnostic-shell";
import { ParentAuthGate } from "@/components/parent-auth-gate";
import { QueryError } from "@/components/query-error";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  completeDiagnosticSetup,
  createPaymentIntent,
  fetchOrder,
  reportPaymentFailure,
  verifyPayment,
} from "@/lib/parent-diagnostic.functions";
import { getParentAccount } from "@/lib/parent-account.functions";
import { openRazorpayCheckout } from "@/lib/razorpay-checkout";
import { formatInr } from "@/lib/parent-diagnostic-shared";
import { useI18n } from "@/lib/i18n/context";

const TITLE = "Checkout — Class 10 Diagnostic | EduOS";
const DESCRIPTION =
  "Pay ₹199 for one CBSE Class 10 outcome-mapped diagnostic. The purchase, the report and the plan are owned by your EduOS parent account.";

export const Route = createFileRoute("/diagnostic/checkout/$orderRef")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DiagnosticCheckoutPage,
});

function DiagnosticCheckoutPage() {
  const { orderRef } = Route.useParams();
  return (
    <DiagnosticShell footerNote={`Order ${orderRef}`}>
      <ParentAuthGate next={`/diagnostic/checkout/${orderRef}`}>
        <CheckoutBody orderRef={orderRef} />
      </ParentAuthGate>
    </DiagnosticShell>
  );
}

function CheckoutBody({ orderRef }: { orderRef: string }) {
  const { t } = useI18n();
  const orderFn = useServerFn(fetchOrder);
  const accountFn = useServerFn(getParentAccount);
  const intentFn = useServerFn(createPaymentIntent);
  const verifyFn = useServerFn(verifyPayment);
  const failFn = useServerFn(reportPaymentFailure);
  const setupFn = useServerFn(completeDiagnosticSetup);
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ["parent-order", orderRef],
    queryFn: () => orderFn({ data: { orderRef } }),
  });
  const account = useQuery({ queryKey: ["parent-account"], queryFn: () => accountFn() });

  const [stage, setStage] = useState<"idle" | "paying" | "provisioning">("idle");

  const order = query.data;
  const profile = account.data?.profile;

  async function payAndStart() {
    try {
      setStage("paying");
      // The guard is server-side: this call fails unless the caller owns the
      // order and the order carries an account and a student profile.
      const intent = await intentFn({ data: { orderRef } });
      if (intent.status !== "paid") {
        if (!intent.razorpayOrderId)
          throw new Error(t("checkout.error.gateway", "The payment gateway is unavailable right now."));
        const result = await openRazorpayCheckout({
          keyId: intent.keyId,
          razorpayOrderId: intent.razorpayOrderId,
          amountPaise: intent.amountPaise,
          description: intent.description,
          prefill: {
            name: profile?.fullName ?? "",
            email: profile?.email ?? "",
            contact: profile?.phone ?? "",
          },
          notes: { order_ref: orderRef },
        });
        if (!result) {
          await failFn({ data: { orderRef, reason: "Checkout dismissed by the parent" } });
          toast.message(t("checkout.cancelled", "Payment cancelled. Nothing was charged."));
          setStage("idle");
          return;
        }
        // Signature is verified server-side; the webhook re-confirms the same capture.
        const paid = await verifyFn({
          data: {
            orderRef,
            razorpayOrderId: result.razorpay_order_id,
            razorpayPaymentId: result.razorpay_payment_id,
            signature: result.razorpay_signature,
          },
        });
        if (paid.status !== "paid") throw new Error(t("checkout.error.notCaptured", "Payment was not captured."));
      }
      setStage("provisioning");
      const { accessToken } = await setupFn({ data: { orderRef } });
      await navigate({ to: "/diagnostic/session/$token", params: { token: accessToken } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("checkout.error.failed", "Payment could not be completed."));
      setStage("idle");
    }
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">{t("checkout.title", "Confirm and pay")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {t(
          "checkout.lede.identity",
          "This purchase is recorded against your EduOS account and the student profile you selected.",
        )}
      </p>

      {query.isLoading ? (
        <Skeleton className="mt-8 h-64 w-full" />
      ) : query.isError ? (
        <div className="mt-8">
          <QueryError
            title={t("checkout.error.notFound", "This order could not be found")}
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        </div>
      ) : !order ? null : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4 text-primary" />
                {t("checkout.owner", "Account and student")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 rounded-lg border p-4 text-sm">
                <Row label={t("checkout.row.parent", "Parent account")} value={profile?.fullName || "—"} />
                <Row label={t("checkout.row.email", "Email")} value={profile?.email || "—"} />
                <Row label={t("checkout.row.mobile", "Mobile")} value={profile?.phone || "—"} />
                <Separator />
                <Row label={t("checkout.row.student", "Student")} value={order.childFirstName ?? "—"} />
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  {t(
                    "checkout.secureNote",
                    "Payments are processed securely by Razorpay. EduOS never sees or stores your card details — the diagnostic is built the moment the payment is confirmed.",
                  )}
                </AlertDescription>
              </Alert>

              <Button className="w-full" size="lg" onClick={payAndStart} disabled={stage !== "idle"}>
                {stage !== "idle" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="mr-2 h-4 w-4" />
                )}
                {stage === "paying"
                  ? t("checkout.paying", "Confirming payment…")
                  : stage === "provisioning"
                    ? t("checkout.provisioning", "Building the diagnostic…")
                    : t("checkout.pay", `Pay ${formatInr(order.amountPaise)} and start`, {
                        price: formatInr(order.amountPaise),
                      })}
              </Button>
            </CardContent>
          </Card>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-base">{t("checkout.summary", "Order summary")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row
                label={t("checkout.row.board", "Board & class")}
                value={`${order.board ?? "CBSE"} Class ${order.grade ?? 10}`}
              />
              <Row label={t("checkout.row.subject", "Subject")} value={order.subject ?? "—"} />
              <Row label={t("checkout.row.unit", "Chapter group")} value={order.unitTitle ?? "—"} />
              <Separator />
              <Row label={t("checkout.row.diagnostic", "Diagnostic")} value={formatInr(order.amountPaise)} strong />
              <p className="text-xs text-muted-foreground">
                {t(
                  "checkout.refund",
                  "One-time. No auto-renew. Full refund within 7 days if the diagnostic is never submitted.",
                )}
              </p>
              <div className="space-y-2 pt-1 text-xs text-muted-foreground">
                {[
                  "Outcome-mapped questions, allocated by board weight",
                  "Server-side scoring against CBSE outcomes",
                  "Ranked gap report you keep permanently",
                ].map((line, i) => (
                  <p key={line} className="flex items-start gap-1.5">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    {t(`checkout.bullet.${i}`, line)}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "text-base font-semibold" : "font-medium"}>{value}</span>
    </div>
  );
}

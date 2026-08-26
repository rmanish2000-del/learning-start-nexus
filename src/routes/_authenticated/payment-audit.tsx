import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { CreditCard, ReceiptText, ShieldCheck, Webhook } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import { Mono, Pass, fmt } from "@/components/audit-shared";
import { getPaymentAuditFn } from "@/lib/payment-audit.functions";
import { ACCEPTANCE_SCENARIOS } from "@/lib/payment-audit-shared";

export const Route = createFileRoute("/_authenticated/payment-audit")({
  head: () => ({
    meta: [
      { title: "Payment Audit Dashboard — EduOS" },
      {
        name: "description",
        content:
          "Live payment validation: orders, captures, failures, webhook deliveries, duplicate events and entitlement grants for the parent diagnostic and Board Success Plan.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Payment Audit Dashboard — EduOS" },
      {
        property: "og:description",
        content: "Live payment validation and entitlement audit for EduOS parent purchases.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaymentAuditPage,
});

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;

function PaymentAuditPage() {
  const load = useServerFn(getPaymentAuditFn);
  const { data, isLoading, error } = useQuery({
    queryKey: ["payment-audit"],
    queryFn: () => load({}),
  });

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Payment Audit Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Read-only verification of the Razorpay capture path. No business logic runs from this
          page.
        </p>
      </header>

      {error ? (
        <Card>
          <CardContent className="pt-6 text-sm text-destructive">
            {(error as Error).message}
          </CardContent>
        </Card>
      ) : null}

      {isLoading || !data ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.metrics.map((m) => (
              <Card key={m.key}>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">{m.label}</CardDescription>
                  <CardTitle className="text-3xl tabular-nums">{m.value}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground">{m.hint}</p>
                </CardContent>
              </Card>
            ))}
          </section>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4" /> Entitlement audit
              </CardTitle>
              <CardDescription>
                For every paid purchase: payment exists, order exists, entitlement exists, and it
                was granted exactly once.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.entitlementAudit.length === 0 ? (
                <p className="text-sm text-muted-foreground">No captured payments yet.</p>
              ) : (
                <>
                  <div className="mb-3">
                    <Badge variant={data.allEntitlementsOk ? "secondary" : "destructive"}>
                      {data.allEntitlementsOk
                        ? `All ${data.entitlementAudit.length} purchases verified`
                        : "Discrepancies found"}
                    </Badge>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Purpose</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Gateway order</TableHead>
                        <TableHead>Entitlement</TableHead>
                        <TableHead>Granted once</TableHead>
                        <TableHead>Credit applied</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.entitlementAudit.map((r) => (
                        <TableRow key={r.orderRef}>
                          <TableCell>
                            <Mono>{r.orderRef}</Mono>
                            <div className="text-xs text-muted-foreground">
                              {rupees(r.amountPaise)}
                            </div>
                            {r.issues.map((i) => (
                              <p key={i} className="text-xs text-destructive">
                                {i}
                              </p>
                            ))}
                          </TableCell>
                          <TableCell className="text-xs">{r.purpose}</TableCell>
                          <TableCell>
                            <Pass pass={r.paymentExists} />
                          </TableCell>
                          <TableCell>
                            <Pass pass={r.orderExists} />
                          </TableCell>
                          <TableCell>
                            <Pass pass={r.entitlementExists} />
                          </TableCell>
                          <TableCell>
                            <Pass pass={r.grantedOnce} />
                          </TableCell>
                          <TableCell>
                            {r.creditApplied === null ? (
                              <span className="text-xs text-muted-foreground">n/a</span>
                            ) : (
                              <Pass pass={r.creditApplied} />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ReceiptText className="h-4 w-4" /> Recent orders
                </CardTitle>
                <CardDescription>Latest 25 parent orders, newest first.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.recentOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No orders yet.</p>
                ) : (
                  data.recentOrders.map((o) => (
                    <div
                      key={o.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          <Mono>{o.orderRef}</Mono> · {rupees(o.amountPaise)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {o.purpose} · {fmt(o.createdAt)}
                          {o.failureReason ? ` · ${o.failureReason}` : ""}
                        </p>
                      </div>
                      <Badge
                        variant={
                          o.status === "paid"
                            ? "secondary"
                            : o.status === "failed"
                              ? "destructive"
                              : "outline"
                        }
                      >
                        {o.status}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Webhook className="h-4 w-4" /> Recent webhook events
                </CardTitle>
                <CardDescription>
                  Every delivery logged after signature verification, replays included.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.recentEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No webhook deliveries recorded yet.</p>
                ) : (
                  data.recentEvents.map((e) => (
                    <div
                      key={e.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{e.eventType}</p>
                        <p className="text-xs text-muted-foreground">
                          <Mono>{e.providerOrderId ?? "—"}</Mono> · {e.outcome} · {fmt(e.createdAt)}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {e.isDuplicate ? <Badge variant="outline">duplicate</Badge> : null}
                        <Badge variant={e.signatureValid ? "secondary" : "destructive"}>
                          {e.signatureValid ? "signed" : "rejected"}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4" /> Acceptance scenarios
              </CardTitle>
              <CardDescription>
                Covered by the automated suite (<Mono>bunx vitest run</Mono>) and recorded in
                EDUOS_PAYMENT_ACCEPTANCE_REPORT.md.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {ACCEPTANCE_SCENARIOS.map((s) => (
                <div key={s.id} className="rounded-lg border p-3">
                  <p className="text-sm font-medium">
                    {s.id}. {s.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{s.expectation}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">Generated {fmt(data.generatedAt)}</p>
        </>
      )}
    </div>
  );
}

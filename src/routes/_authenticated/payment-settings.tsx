import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { History, KeyRound, Radio, ShieldCheck, Webhook } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  clearPaymentSettingsFn,
  getPaymentSettingsFn,
  getWebhookStatusFn,
  listPaymentAuditFn,
  savePaymentSettingsFn,
  testPaymentSettingsFn,
} from "@/lib/payment-settings.functions";

export const Route = createFileRoute("/_authenticated/payment-settings")({
  head: () => ({
    meta: [
      { title: "Payment Settings — EduOS" },
      {
        name: "description",
        content:
          "Admin-only payment configuration: store the Razorpay key id, key secret and webhook secret, and see whether test or live mode is active.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Payment Settings — EduOS" },
      {
        property: "og:description",
        content: "Admin-only Razorpay key management and environment status for EduOS.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaymentSettingsPage,
});

const authRoute = getRouteApi("/_authenticated");

const SOURCE_LABEL: Record<string, string> = {
  database: "Stored in EduOS (admin-managed)",
  environment: "Platform environment secret",
  missing: "Not configured",
};

function PaymentSettingsPage() {
  const { role } = authRoute.useRouteContext();
  const queryClient = useQueryClient();

  const load = useServerFn(getPaymentSettingsFn);
  const save = useServerFn(savePaymentSettingsFn);
  const clear = useServerFn(clearPaymentSettingsFn);
  const test = useServerFn(testPaymentSettingsFn);

  const [keyId, setKeyId] = useState("");
  const [keySecret, setKeySecret] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["payment-settings"],
    queryFn: () => load({}),
    enabled: role === "admin",
  });

  const auditLoad = useServerFn(listPaymentAuditFn);
  const { data: auditEntries } = useQuery({
    queryKey: ["payment-settings-audit"],
    queryFn: () => auditLoad({}),
    enabled: role === "admin",
  });

  const webhookLoad = useServerFn(getWebhookStatusFn);
  const { data: webhook, isLoading: webhookLoading } = useQuery({
    queryKey: ["payment-webhook-status"],
    queryFn: () => webhookLoad({}),
    enabled: role === "admin",
    refetchInterval: 30_000,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["payment-settings"] });
    queryClient.invalidateQueries({ queryKey: ["payment-settings-audit"] });
    queryClient.invalidateQueries({ queryKey: ["payment-webhook-status"] });
  };

  const saveMutation = useMutation({
    mutationFn: () => save({ data: { keyId, keySecret, webhookSecret } }),
    onSuccess: () => {
      setKeySecret("");
      setWebhookSecret("");
      toast.success("Payment keys saved. New checkouts use them immediately.");
      void refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const clearMutation = useMutation({
    mutationFn: () => clear({}),
    onSuccess: () => {
      toast.success("Stored keys removed — the platform environment keys are active again.");
      void refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const testMutation = useMutation({
    mutationFn: () => test({}),
    onSuccess: (result) => {
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
      void refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (role !== "admin") {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Payment settings are available to administrators only.
        </CardContent>
      </Card>
    );
  }

  const pendingMode = keyId.startsWith("rzp_live_")
    ? "live"
    : keyId.startsWith("rzp_test_")
      ? "test"
      : null;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Payment Settings</h1>
        <p className="text-sm text-muted-foreground">
          Store the Razorpay credentials EduOS uses for parent purchases and confirm which
          environment is live. Secrets are write-only — they are never sent back to this page.
        </p>
      </header>

      {error ? (
        <Card>
          <CardContent className="pt-6 text-sm text-destructive">
            {(error as Error).message}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Radio className="size-4" /> Active environment
          </CardTitle>
          <CardDescription>What the checkout and webhook are using right now.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading || !data ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={data.mode === "live" ? "default" : "secondary"}
                  className="uppercase tracking-wide"
                >
                  {data.mode === "live"
                    ? "Live mode"
                    : data.mode === "test"
                      ? "Test mode"
                      : "Not configured"}
                </Badge>
                {data.mode === "test" ? (
                  <span className="text-xs text-muted-foreground">
                    Real cards will not be charged while test keys are active.
                  </span>
                ) : null}
              </div>

              <dl className="grid gap-3 sm:grid-cols-2">
                <Field label="Key id" value={data.maskedKeyId ?? "—"} icon={<KeyRound className="size-3.5" />} />
                <Field label="Key source" value={SOURCE_LABEL[data.source] ?? data.source} />
                <Field
                  label="Key secret"
                  value={data.keySecretSet ? "Set" : "Missing"}
                  tone={data.keySecretSet ? "ok" : "bad"}
                />
                <Field
                  label="Webhook secret"
                  value={
                    data.webhookSecretSet
                      ? `Set — ${SOURCE_LABEL[data.webhookSecretSource] ?? data.webhookSecretSource}`
                      : "Missing — webhook deliveries will be rejected"
                  }
                  tone={data.webhookSecretSet ? "ok" : "bad"}
                  icon={<Webhook className="size-3.5" />}
                />
                <Field
                  label="Environment secret key id"
                  value={data.envKeyId ? `${data.envKeyId} (${data.envMode})` : "Not set"}
                />
                <Field
                  label="Last updated"
                  value={data.updatedAt ? new Date(data.updatedAt).toLocaleString("en-IN") : "—"}
                />
              </dl>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testMutation.mutate()}
                  disabled={testMutation.isPending || !data.configured}
                >
                  {testMutation.isPending ? "Checking…" : "Test connection"}
                </Button>
                {data.source === "database" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearMutation.mutate()}
                    disabled={clearMutation.isPending}
                  >
                    Remove stored keys
                  </Button>
                ) : null}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-4" /> Update Razorpay credentials
          </CardTitle>
          <CardDescription>
            Paste the key id, key secret and webhook secret from the Razorpay dashboard. Stored
            values override the platform environment secrets and take effect within seconds.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 sm:max-w-xl"
            onSubmit={(event) => {
              event.preventDefault();
              saveMutation.mutate();
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="key-id">Key id</Label>
              <Input
                id="key-id"
                autoComplete="off"
                spellCheck={false}
                placeholder="rzp_live_XXXXXXXXXXXX"
                value={keyId}
                onChange={(e) => setKeyId(e.target.value)}
                required
              />
              {pendingMode ? (
                <p className="text-xs text-muted-foreground">
                  This key will switch EduOS to <strong>{pendingMode}</strong> mode.
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="key-secret">Key secret</Label>
              <Input
                id="key-secret"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••••••"
                value={keySecret}
                onChange={(e) => setKeySecret(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="webhook-secret">Webhook secret</Label>
              <Input
                id="webhook-secret"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••••••"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Must match the secret configured on the Razorpay webhook pointing at{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                  /api/public/razorpay-webhook
                </code>
                . Leave blank to keep using the platform environment secret.
              </p>
            </div>

            <div>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving…" : "Save credentials"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="size-4" /> Credential audit log
          </CardTitle>
          <CardDescription>
            Append-only record of key updates, secret updates, environment switches and connection
            tests. Entries cannot be edited or deleted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!auditEntries || auditEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No credential changes recorded yet.</p>
          ) : (
            <ul className="divide-y">
              {auditEntries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        entry.action === "save"
                          ? "default"
                          : entry.action === "clear"
                            ? "destructive"
                            : "secondary"
                      }
                      className="uppercase"
                    >
                      {entry.action}
                    </Badge>
                    <span>
                      {entry.prevMode} / {entry.prevSource} → {entry.newMode} / {entry.newSource}
                      {entry.maskedKeyId ? ` · ${entry.maskedKeyId}` : ""}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleString("en-IN")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone?: "ok" | "bad";
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border p-3">
      <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd
        className={
          tone === "bad"
            ? "mt-1 text-sm font-medium text-destructive"
            : tone === "ok"
              ? "mt-1 text-sm font-medium text-primary"
              : "mt-1 text-sm font-medium"
        }
      >
        {value}
      </dd>
    </div>
  );
}

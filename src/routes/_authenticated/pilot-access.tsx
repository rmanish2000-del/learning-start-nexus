// Pilot access (admin only) — grant, extend and revoke free pilot journeys.
//
// Pilot access is deliberately NOT a ₹0 purchase: nothing here writes an
// order, a payment, an invoice or a discount, so pilot families never appear
// in revenue or conversion reporting.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, Copy, Link2, ShieldCheck, Ticket } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ContextHelp } from "@/components/context-help";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  createPilotInvitationFn,
  listPilotInvitationsFn,
  revokePilotInvitationFn,
} from "@/lib/pilot-invitations.functions";
import {
  extendPilotAccessFn,
  grantPilotAccessFn,
  listPilotGrantsFn,
  revokePilotAccessFn,
} from "@/lib/pilot-access.functions";
import { friendlyErrorMessage } from "@/lib/user-errors";

export const Route = createFileRoute("/_authenticated/pilot-access")({
  component: PilotAccessPage,
  head: () => ({
    meta: [
      { title: "Pilot access — free pilot grants | EduOS" },
      {
        name: "description",
        content:
          "Grant, extend and revoke free EduOS pilot access for selected families. No orders, no payments, no revenue impact.",
      },
      { property: "og:title", content: "Pilot access | EduOS" },
      {
        property: "og:description",
        content: "Administer free pilot journeys for selected families without any commercial record.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function fmtDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString() : "—";
}

function PilotAccessPage() {
  const queryClient = useQueryClient();
  const listFn = useServerFn(listPilotGrantsFn);
  const grantFn = useServerFn(grantPilotAccessFn);
  const extendFn = useServerFn(extendPilotAccessFn);
  const revokeFn = useServerFn(revokePilotAccessFn);

  const grants = useQuery({ queryKey: ["pilot-grants"], queryFn: () => listFn() });

  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [days, setDays] = useState("60");
  const [reason, setReason] = useState("");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["pilot-grants"] });

  const grant = useMutation({
    mutationFn: () =>
      grantFn({
        data: {
          parentEmail: email.trim(),
          subject: subject.trim() ? subject.trim() : null,
          days: Number(days),
          reason: reason.trim(),
        },
      }),
    onSuccess: async () => {
      toast.success("Pilot access granted.");
      setEmail("");
      setSubject("");
      setReason("");
      await refresh();
    },
    onError: (error) => toast.error(friendlyErrorMessage(error, "Could not grant pilot access.")),
  });

  const extend = useMutation({
    mutationFn: (grantId: string) =>
      extendFn({ data: { grantId, days: 30, reason: "Pilot extended by admin" } }),
    onSuccess: async () => {
      toast.success("Pilot access extended by 30 days.");
      await refresh();
    },
    onError: (error) => toast.error(friendlyErrorMessage(error, "Could not extend pilot access.")),
  });

  const revoke = useMutation({
    mutationFn: (grantId: string) =>
      revokeFn({ data: { grantId, reason: "Pilot access ended by admin" } }),
    onSuccess: async () => {
      toast.success("Pilot access revoked. History is preserved.");
      await refresh();
    },
    onError: (error) => toast.error(friendlyErrorMessage(error, "Could not revoke pilot access.")),
  });

  const createInviteFn = useServerFn(createPilotInvitationFn);
  const listInvitesFn = useServerFn(listPilotInvitationsFn);
  const revokeInviteFn = useServerFn(revokePilotInvitationFn);

  const invites = useQuery({ queryKey: ["pilot-invitations"], queryFn: () => listInvitesFn() });
  const refreshInvites = () => queryClient.invalidateQueries({ queryKey: ["pilot-invitations"] });

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteDays, setInviteDays] = useState("60");
  const [inviteValidDays, setInviteValidDays] = useState("7");
  const [inviteReason, setInviteReason] = useState("");
  // Shown exactly once: only the hash of the token is stored.
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const createInvite = useMutation({
    mutationFn: () =>
      createInviteFn({
        data: {
          parentEmail: inviteEmail.trim(),
          subject: subject.trim() ? subject.trim() : null,
          days: Number(inviteDays),
          validDays: Number(inviteValidDays),
          reason: inviteReason.trim(),
        },
      }),
    onSuccess: async (result) => {
      setInviteLink(`${window.location.origin}/pilot-invite/${result.token}`);
      setInviteEmail("");
      setInviteReason("");
      toast.success("Invitation created. Copy the link now — it is shown once.");
      await refreshInvites();
    },
    onError: (error) => toast.error(friendlyErrorMessage(error, "Could not create the invitation.")),
  });

  const revokeInvite = useMutation({
    mutationFn: (invitationId: string) =>
      revokeInviteFn({ data: { invitationId, reason: "Invitation withdrawn by admin" } }),
    onSuccess: async () => {
      toast.success("Invitation revoked.");
      await refreshInvites();
    },
    onError: (error) => toast.error(friendlyErrorMessage(error, "Could not revoke the invitation.")),
  });

  const rows = grants.data ?? [];
  const inviteRows = invites.data ?? [];

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Pilot access</h1>
          <ContextHelp page="/pilot-access" />
        </div>
        <p className="text-sm text-muted-foreground">
          Selected families get the complete journey — diagnostic, report, gaps, Study Plan, AI Tutor and
          reassessment — free. No order, payment or invoice is ever created.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Ticket className="h-4 w-4" /> Grant pilot access
          </CardTitle>
          <CardDescription>
            The family must already have an EduOS parent account. Leave the subject blank for both subjects.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pilot-email">Parent email</Label>
            <Input
              id="pilot-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="parent@example.com"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pilot-subject">Subject scope (optional)</Label>
            <Input
              id="pilot-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Mathematics"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pilot-days">Access length (days)</Label>
            <Input
              id="pilot-days"
              type="number"
              min={1}
              max={180}
              value={days}
              onChange={(e) => setDays(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="pilot-reason">Grant reason</Label>
            <Textarea
              id="pilot-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Pilot cohort 1 — Whitefield centre referral"
              rows={2}
            />
          </div>
          <div className="sm:col-span-2">
            <Button onClick={() => grant.mutate()} disabled={grant.isPending}>
              {grant.isPending ? "Granting…" : "Grant pilot access"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-4 w-4" /> Invite a pilot family
          </CardTitle>
          <CardDescription>
            Creates a secure link that works once, expires, and grants free access only to the
            invited email. Nothing commercial is ever recorded.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Parent email</Label>
            <Input
              id="invite-email"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="parent@example.com"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-days">Access length (days)</Label>
            <Input
              id="invite-days"
              type="number"
              min={1}
              max={180}
              value={inviteDays}
              onChange={(e) => setInviteDays(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-valid">Link valid for (days)</Label>
            <Input
              id="invite-valid"
              type="number"
              min={1}
              max={30}
              value={inviteValidDays}
              onChange={(e) => setInviteValidDays(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="invite-reason">Invitation reason</Label>
            <Textarea
              id="invite-reason"
              value={inviteReason}
              onChange={(e) => setInviteReason(e.target.value)}
              placeholder="Internal pilot cohort 1"
              rows={2}
            />
          </div>
          <div className="sm:col-span-2 space-y-3">
            <Button onClick={() => createInvite.mutate()} disabled={createInvite.isPending}>
              {createInvite.isPending ? "Creating…" : "Create invitation link"}
            </Button>
            {inviteLink ? (
              <div className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center">
                <code className="flex-1 break-all text-xs" data-testid="invite-link">
                  {inviteLink}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void navigator.clipboard.writeText(inviteLink);
                    toast.success("Link copied.");
                  }}
                >
                  <Copy className="mr-1 h-3 w-3" /> Copy
                </Button>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Ticket className="h-4 w-4" /> Invitations
          </CardTitle>
          <CardDescription>Every link\'s current state, kept for audit.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {invites.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : inviteRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invitations yet.</p>
          ) : (
            inviteRows.map((row) => (
              <div
                key={row.id}
                className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{row.parentEmail}</span>
                    <Badge
                      variant={
                        row.state === "valid"
                          ? "default"
                          : row.state === "revoked"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {row.state}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {row.days} days of access · link expires {fmtDate(row.expiresAt)}
                    {row.acceptedAt ? ` · accepted ${fmtDate(row.acceptedAt)}` : ""}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={row.state !== "valid" || revokeInvite.isPending}
                  onClick={() => revokeInvite.mutate(row.id)}
                >
                  Revoke link
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" /> Pilot grants
          </CardTitle>
          <CardDescription>
            Revoking or letting a grant expire removes access immediately; the family's history stays intact.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {grants.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pilot access has been granted yet.</p>
          ) : (
            rows.map((row) => (
              <div
                key={row.id}
                className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{row.parentName ?? row.parentEmail ?? "Parent"}</span>
                    <Badge
                      variant={
                        row.status === "active" ? "default" : row.status === "revoked" ? "destructive" : "secondary"
                      }
                    >
                      {row.status}
                    </Badge>
                    <Badge variant="outline">{row.subject ?? "All subjects"}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {row.parentEmail ?? "—"} · {row.learnerName ?? "All students on the account"} ·{" "}
                    {row.runCount} run{row.runCount === 1 ? "" : "s"}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarClock className="h-3 w-3" />
                    Granted {fmtDate(row.grantedAt)} · expires {fmtDate(row.expiresAt)}
                    {row.revokedAt ? ` · revoked ${fmtDate(row.revokedAt)}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">Reason: {row.reason}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={row.status === "revoked" || extend.isPending}
                    onClick={() => extend.mutate(row.id)}
                  >
                    Extend 30 days
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={row.status !== "active" || revoke.isPending}
                    onClick={() => revoke.mutate(row.id)}
                  >
                    Revoke
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

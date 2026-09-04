// Pilot invitations — server-only implementation.
//
// Product law: accepting an invitation writes ONLY to pilot_invitations,
// pilot_grants and the append-only pilot_grant_events log. No order, payment,
// invoice, discount or entitlement is ever created, and no new auth user,
// profile, role, family or organisation is created — the invitation resolves
// the parent's EXISTING verified account and nothing else.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  invitationState,
  maskEmail,
  type InvitationPreview,
  type PilotInvitationView,
} from "./pilot-invitations-shared";

const SELECT =
  "id, parent_email, learner_id, subject, days, reason, expires_at, accepted_at, accepted_by, revoked_at, created_at, created_by, grant_id";

function toBase64Url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** 32 bytes of CSPRNG entropy — the raw token is shown exactly once. */
export function newInvitationToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

/** Only the hash is stored, so a database read can never replay a link. */
export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token.trim()));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createPilotInvitation(input: {
  actorUserId: string;
  parentEmail: string;
  learnerId?: string | null | undefined;
  subject?: string | null | undefined;
  days: number;
  reason: string;
  validDays: number;
}): Promise<{ invitationId: string; token: string }> {
  const email = input.parentEmail.trim().toLowerCase();
  const token = newInvitationToken();

  const { data, error } = await supabaseAdmin
    .from("pilot_invitations")
    .insert({
      parent_email: email,
      learner_id: input.learnerId ?? null,
      subject: input.subject ?? null,
      days: input.days,
      reason: input.reason,
      token_hash: await hashToken(token),
      expires_at: new Date(Date.now() + input.validDays * 86_400_000).toISOString(),
      created_by: input.actorUserId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  return { invitationId: data.id, token };
}

/** Unauthenticated link preview: state plus masked, non-identifying detail. */
export async function previewInvitation(token: string): Promise<InvitationPreview> {
  const { data } = await supabaseAdmin
    .from("pilot_invitations")
    .select(SELECT)
    .eq("token_hash", await hashToken(token))
    .maybeSingle();

  if (!data) {
    return { state: "invalid", maskedEmail: null, subject: null, days: null, expiresAt: null };
  }
  return {
    state: invitationState(data),
    maskedEmail: maskEmail(data.parent_email),
    subject: data.subject,
    days: data.days,
    expiresAt: data.expires_at,
  };
}

/**
 * Single-use acceptance. The claim is a conditional UPDATE, so two concurrent
 * clicks (or a replayed link) can never produce two grants.
 */
export async function acceptInvitation(input: {
  token: string;
  userId: string;
  email: string | null;
}): Promise<{ state: "accepted"; grantId: string }> {
  const { data: row } = await supabaseAdmin
    .from("pilot_invitations")
    .select(SELECT)
    .eq("token_hash", await hashToken(input.token))
    .maybeSingle();
  if (!row) throw new Error("This invitation link is not valid.");

  const state = invitationState(row);
  if (state === "revoked") throw new Error("This invitation was withdrawn. Ask your centre for a new one.");
  if (state === "expired") throw new Error("This invitation has expired. Ask your centre for a new one.");
  if (state === "accepted") {
    if (row.accepted_by !== input.userId) {
      throw new Error("This invitation has already been used.");
    }
    if (row.grant_id) return { state: "accepted", grantId: row.grant_id };
    throw new Error("This invitation has already been used.");
  }

  // Identity: the invitation belongs to one verified email, whichever sign-in
  // method (Google or password) that account uses.
  if ((input.email ?? "").trim().toLowerCase() !== row.parent_email.trim().toLowerCase()) {
    throw new Error(
      "You're signed in with a different email than this invitation was sent to. Sign out and use the invited account.",
    );
  }

  if (row.learner_id) {
    const { assertStudentOwned } = await import("./parent-account.server");
    await assertStudentOwned(input.userId, row.learner_id);
  }

  // Claim the link before anything is granted.
  const { data: claimed, error: claimError } = await supabaseAdmin
    .from("pilot_invitations")
    .update({ accepted_at: new Date().toISOString(), accepted_by: input.userId })
    .eq("id", row.id)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();
  if (claimError) throw new Error(claimError.message);
  if (!claimed) throw new Error("This invitation has already been used.");

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("org_id")
    .eq("id", input.userId)
    .maybeSingle();

  const { data: grant, error: grantError } = await supabaseAdmin
    .from("pilot_grants")
    .insert({
      org_id: profile?.org_id ?? null,
      parent_user_id: input.userId,
      learner_id: row.learner_id,
      subject: row.subject,
      grant_reason: row.reason,
      granted_by: row.created_by,
      expires_at: new Date(Date.now() + row.days * 86_400_000).toISOString(),
    })
    .select("id")
    .single();
  if (grantError) throw new Error(grantError.message);

  await supabaseAdmin
    .from("pilot_grant_events")
    .insert({
      grant_id: grant.id,
      action: "granted",
      actor_user_id: input.userId,
      detail: `Invitation accepted · ${row.days} day(s) · ${row.subject ?? "all subjects"} · ${row.reason}`,
    });

  await supabaseAdmin.from("pilot_invitations").update({ grant_id: grant.id }).eq("id", row.id);

  return { state: "accepted", grantId: grant.id };
}

export async function revokeInvitation(input: {
  invitationId: string;
  actorUserId: string;
  reason: string;
}): Promise<void> {
  const { error } = await supabaseAdmin
    .from("pilot_invitations")
    .update({
      revoked_at: new Date().toISOString(),
      revoked_by: input.actorUserId,
      revoke_reason: input.reason,
    })
    .eq("id", input.invitationId)
    .is("revoked_at", null)
    .is("accepted_at", null);
  if (error) throw new Error(error.message);
}

export async function listInvitations(): Promise<PilotInvitationView[]> {
  const { data, error } = await supabaseAdmin
    .from("pilot_invitations")
    .select(SELECT)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    parentEmail: r.parent_email,
    learnerId: r.learner_id,
    subject: r.subject,
    days: r.days,
    reason: r.reason,
    expiresAt: r.expires_at,
    acceptedAt: r.accepted_at,
    revokedAt: r.revoked_at,
    createdAt: r.created_at,
    state: invitationState(r),
  }));
}

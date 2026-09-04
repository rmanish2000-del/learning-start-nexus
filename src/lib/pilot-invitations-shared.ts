// Pilot invitations — shared contracts.
//
// An invitation is a secure, single-use, expiring link that turns into a
// NON-COMMERCIAL pilot grant when the invited parent accepts it. Accepting
// never creates an order, payment, invoice, discount or entitlement record.

import { z } from "zod";

import { PILOT_MAX_DAYS } from "./pilot-access-shared";

/** How long the link itself stays usable, independent of the granted days. */
export const INVITE_MAX_VALID_DAYS = 30;

export const createPilotInvitationSchema = z.object({
  parentEmail: z.string().trim().email().max(200),
  learnerId: z.string().uuid().nullable().optional(),
  subject: z.string().trim().min(2).max(80).nullable().optional(),
  days: z.number().int().min(1).max(PILOT_MAX_DAYS),
  reason: z.string().trim().min(5).max(500),
  validDays: z.number().int().min(1).max(INVITE_MAX_VALID_DAYS).default(7),
});

export const invitationTokenSchema = z.object({
  token: z.string().trim().min(20).max(200),
});

export const revokePilotInvitationSchema = z.object({
  invitationId: z.string().uuid(),
  reason: z.string().trim().min(5).max(500),
});

export type InvitationState = "valid" | "accepted" | "expired" | "revoked" | "invalid";

/** What an unauthenticated visitor is allowed to learn from a link. */
export type InvitationPreview = {
  state: InvitationState;
  /** Masked so a leaked link never discloses a full address. */
  maskedEmail: string | null;
  subject: string | null;
  days: number | null;
  expiresAt: string | null;
};

export type PilotInvitationView = {
  id: string;
  parentEmail: string;
  learnerId: string | null;
  subject: string | null;
  days: number;
  reason: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  state: InvitationState;
};

export function invitationState(row: {
  revoked_at: string | null;
  accepted_at: string | null;
  expires_at: string;
}): Exclude<InvitationState, "invalid"> {
  if (row.revoked_at) return "revoked";
  if (row.accepted_at) return "accepted";
  return new Date(row.expires_at).getTime() > Date.now() ? "valid" : "expired";
}

export function maskEmail(email: string): string {
  const [name = "", domain = ""] = email.split("@");
  const head = name.slice(0, 2);
  return `${head}${"•".repeat(Math.max(1, name.length - 2))}@${domain}`;
}

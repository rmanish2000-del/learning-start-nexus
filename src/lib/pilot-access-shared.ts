// Pilot access — shared contracts.
//
// Pilot access is a NON-COMMERCIAL entitlement. It never creates an order, a
// payment, an invoice, a discount or a ₹0 charge, so pilot families can never
// appear in revenue, conversion or paid-customer reporting.

import { z } from "zod";

export const PILOT_MAX_DAYS = 180;

export const grantPilotAccessSchema = z.object({
  parentEmail: z.string().trim().email().max(200),
  learnerId: z.string().uuid().nullable().optional(),
  subject: z.string().trim().min(2).max(80).nullable().optional(),
  days: z.number().int().min(1).max(PILOT_MAX_DAYS),
  reason: z.string().trim().min(5).max(500),
});

export const extendPilotAccessSchema = z.object({
  grantId: z.string().uuid(),
  days: z.number().int().min(1).max(PILOT_MAX_DAYS),
  reason: z.string().trim().min(5).max(500),
});

export const revokePilotAccessSchema = z.object({
  grantId: z.string().uuid(),
  reason: z.string().trim().min(5).max(500),
});

export const startPilotRunSchema = z.object({
  learnerId: z.string().uuid(),
  bookId: z.string().uuid(),
  unitId: z.string().uuid(),
});

export type PilotGrantView = {
  id: string;
  parentEmail: string | null;
  parentName: string | null;
  learnerId: string | null;
  learnerName: string | null;
  subject: string | null;
  reason: string;
  grantedByName: string | null;
  grantedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  revokeReason: string | null;
  status: "active" | "expired" | "revoked";
  runCount: number;
};

export function grantStatus(row: {
  revoked_at: string | null;
  expires_at: string;
}): "active" | "expired" | "revoked" {
  if (row.revoked_at) return "revoked";
  return new Date(row.expires_at).getTime() > Date.now() ? "active" : "expired";
}

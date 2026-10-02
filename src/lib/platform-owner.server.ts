// Platform-owner gate — server only.
//
// Every platform-level server function calls requirePlatformOwner() before
// doing anything. The identity comes from the verified JWT claims produced by
// requireSupabaseAuth (supabase.auth.getClaims), never from request input.
// PLATFORM_OWNER_EMAIL may be overridden through the server secret store for
// a staging project; it defaults to the production owner.

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { isPlatformOwnerEmail, PLATFORM_OWNER_EMAIL } from "./platform-owner-shared";

export function platformOwnerEmail(): string {
  const configured = process.env["PLATFORM_OWNER_EMAIL"];
  return (configured && configured.trim() ? configured : PLATFORM_OWNER_EMAIL).trim().toLowerCase();
}

export type OwnerContext = {
  supabase: SupabaseClient<Database>;
  userId: string;
  claims?: unknown;
};

async function callerEmail(context: OwnerContext): Promise<string | null> {
  const fromClaims = (context.claims as { email?: unknown } | null | undefined)?.email;
  if (typeof fromClaims === "string" && fromClaims) return fromClaims;
  const { data } = await context.supabase.auth.getUser();
  return data.user?.email ?? null;
}

export async function isPlatformOwner(context: OwnerContext): Promise<boolean> {
  return isPlatformOwnerEmail(await callerEmail(context), platformOwnerEmail());
}

/** Throws unless the signed-in caller is the platform owner. */
export async function requirePlatformOwner(context: OwnerContext): Promise<void> {
  if (await isPlatformOwner(context)) return;
  throw new Error("You do not have permission to perform this action.");
}

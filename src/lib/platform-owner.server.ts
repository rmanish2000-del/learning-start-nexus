// Platform-owner gate — server only. The single authority for every
// platform-level server function (payment settings, payment audit, pilot
// access, pilot invitations, feedback review, centre approval).
//
// Identity is re-validated with the auth server on every call
// (supabase.auth.getUser), never taken from request input or unverified
// claims. Access requires the exact owner email AND a confirmed email.
// Role is deliberately not an input. Denials throw a generic HTTP 403 and are
// recorded with actor id + operation name only — never secrets or reasons.

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { isPlatformOwnerUser } from "./platform-owner-shared";

export type OwnerContext = {
  supabase: SupabaseClient<Database>;
  userId: string;
  claims?: unknown;
};

export async function isPlatformOwner(context: OwnerContext): Promise<boolean> {
  const { data, error } = await context.supabase.auth.getUser();
  if (error || !data?.user) return false;
  if (data.user.id !== context.userId) return false;
  return isPlatformOwnerUser(data.user);
}

/** Throws a generic 403 Response unless the caller is the confirmed platform owner. */
export async function requirePlatformOwner(
  context: OwnerContext,
  operation = "platform",
): Promise<void> {
  if (await isPlatformOwner(context)) return;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("founder_access_denials")
      .insert({ actor_id: context.userId ?? null, operation: operation.slice(0, 80) });
  } catch {
    // Denial logging must never change the response.
  }
  throw new Response("Forbidden", { status: 403 });
}

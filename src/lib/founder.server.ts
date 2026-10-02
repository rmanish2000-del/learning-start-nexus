import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { isFounderUser } from "./founder";

/**
 * Server-side founder gate — the single authority for Payment Settings and
 * centre approval. Re-validates the caller with the auth server (getUser, not
 * JWT claims) and throws a generic 403 otherwise. Denials are recorded with
 * the actor id and operation name only; nothing secret is logged or returned.
 */
export async function requireFounder(
  supabase: SupabaseClient<Database>,
  operation: string,
): Promise<void> {
  const { data, error } = await supabase.auth.getUser();
  if (!error && isFounderUser(data?.user)) return;

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("founder_access_denials")
      .insert({ actor_id: data?.user?.id ?? null, operation: operation.slice(0, 80) });
  } catch {
    // Denial logging must never change the response.
  }
  throw new Response("Forbidden", { status: 403 });
}

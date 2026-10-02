import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { isFounderUser } from "./founder";

/**
 * Server-side founder gate. Re-validates the caller with the auth server
 * (getUser, not the JWT claims alone) and throws a generic 403 otherwise.
 * Nothing about the caller or the reason is logged or returned.
 */
export async function requireFounder(supabase: SupabaseClient<Database>): Promise<void> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !isFounderUser(data?.user)) {
    throw new Response("Forbidden", { status: 403 });
  }
}

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

// Role gate for privileged server functions. Runs as the caller (RLS applies):
// the caller can read their own user_roles rows, which is all this check needs.
// Callers always pass their own context.userId.
export async function requireAnyRole(
  supabase: SupabaseClient<Database>,
  userId: string,
  roles: AppRole[],
): Promise<void> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", roles);
  if (!error && data && data.length > 0) return;
  throw new Error("You do not have permission to perform this action.");
}

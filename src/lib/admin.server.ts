import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

// Role gate for privileged server functions. Runs as the caller (RLS applies);
// has_role is a security-definer function readable by authenticated users.
export async function requireAnyRole(
  supabase: SupabaseClient<Database>,
  userId: string,
  roles: AppRole[],
): Promise<void> {
  for (const role of roles) {
    const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: role });
    if (!error && data) return;
  }
  throw new Error("You do not have permission to perform this action.");
}

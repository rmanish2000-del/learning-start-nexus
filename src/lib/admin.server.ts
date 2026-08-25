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

  if (error) {
    console.error("Admin role verification failed", {
      code: error.code,
      message: error.message,
    });
    throw new Error("We couldn't verify your permissions. Please refresh and try again.");
  }

  if ((data ?? []).some((row) => roles.includes(row.role))) return;
  throw new Error("You do not have permission to perform this action.");
}

// Resolve the caller's org via their own session (RLS-scoped read).
export async function callerOrgId(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Caller organization lookup failed", {
      code: error.code,
      message: error.message,
    });
    throw new Error("We couldn't load your organization. Please refresh and try again.");
  }

  if (!data?.org_id) throw new Error("Your account is not linked to an organization.");
  return data.org_id;
}

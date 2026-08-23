import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/roles";
import { clearSessionMarker, setSessionMarker } from "@/lib/session-marker";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      clearSessionMarker();
      throw redirect({ to: "/auth" });
    }

    // Renew the document-gate marker for the server middleware in start.ts.
    setSessionMarker();

    const [{ data: roleRow }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", data.user.id).limit(1).maybeSingle(),
      supabase.from("profiles").select("full_name, org_id").eq("id", data.user.id).maybeSingle(),
    ]);

    return {
      user: data.user,
      role: (roleRow?.role as AppRole | undefined) ?? "student",
      profile: profile ?? null,
    };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

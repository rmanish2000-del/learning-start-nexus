import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { isReviewerAllowedPath, roleHome, type AppRole } from "@/lib/roles";
import { clearSessionMarker, setSessionMarker } from "@/lib/session-marker";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
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
    const role = (roleRow?.role as AppRole | undefined) ?? "student";

    // Sprint 5A: reviewers are audit-only. Bounce them from any workspace
    // route to the launch audit (their home).
    if (role === "reviewer" && !isReviewerAllowedPath(location.pathname)) {
      throw redirect({ to: "/launch-audit" });
    }

    // Sprint 5B: parents get the read-only portal plus the support pages
    // (quick start, help center); everyone else is bounced away from /parent.
    if (
      role === "parent" &&
      !PARENT_ALLOWED_PATHS.some(
        (p) => location.pathname === p || location.pathname.startsWith(p + "/"),
      )
    ) {
      throw redirect({ to: "/parent" });
    }
    if (role !== "parent" && location.pathname === "/parent") {
      throw redirect({ to: roleHome(role) });
    }

    return {
      user: data.user,
      role,
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

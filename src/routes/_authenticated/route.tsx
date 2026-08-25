import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";

import { supabase } from "@/integrations/supabase/client";
import { isReviewerAllowedPath, roleHome, type AppRole } from "@/lib/roles";
import { clearSessionMarker, setSessionMarker } from "@/lib/session-marker";
import { AppShell } from "@/components/app-shell";

/** Parents are portal-only, but support pages stay open to them. */
const PARENT_ALLOWED_PATHS = ["/parent", "/quick-start", "/help"] as const;

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
  errorComponent: WorkspaceError,
  notFoundComponent: WorkspaceNotFound,
});

/** Any unhandled failure inside the workspace still renders a way forward. */
function WorkspaceError({ error }: { error: Error }) {
  return (
    <div className="mx-auto max-w-lg space-y-4 p-8 text-center">
      <h1 className="text-xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">
        {error?.message?.includes("Unauthorized")
          ? "Your session expired. Sign in again to continue."
          : "We couldn't load this page. Try again, or head back to your workspace."}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={() => window.location.reload()}>Try again</Button>
        <Button asChild variant="outline">
          <Link to="/auth">Sign in</Link>
        </Button>
      </div>
    </div>
  );
}

function WorkspaceNotFound() {
  return (
    <div className="mx-auto max-w-lg space-y-4 p-8 text-center">
      <h1 className="text-xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-sm text-muted-foreground">
        This page doesn't exist or you don't have access to it.
      </p>
      <Button asChild>
        <Link to="/">Go home</Link>
      </Button>
    </div>
  );
}

function AuthenticatedLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

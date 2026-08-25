// Live proof that the server gate rejects anonymous document requests.
// Each probe fetches the app's own protected routes with NO cookies, exactly
// like an incognito browser visiting the URL directly.

import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAuditRole } from "./admin.server";
import { PROTECTED_ROUTES } from "@/lib/protected-routes";

export type RouteProbe = {
  route: string;
  status: number;
  location: string | null;
  redirectedToAuth: boolean;
};

export const probeRouteProtection = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAuditRole(context.supabase, context.userId);
    const request = getRequest();
    const origin = new URL(request.url).origin;

    const results: RouteProbe[] = [];
    for (const route of PROTECTED_ROUTES) {
      const response = await fetch(origin + route, {
        method: "GET",
        redirect: "manual",
        headers: { accept: "text/html" },
      });
      const location = response.headers.get("location");
      const isRedirect = response.status >= 300 && response.status < 400;
      results.push({
        route,
        status: response.status,
        location,
        redirectedToAuth: isRedirect && (location ?? "").replace(/\/$/, "").endsWith("/auth"),
      });
    }

    return { origin, probedAt: new Date().toISOString(), results };
  });

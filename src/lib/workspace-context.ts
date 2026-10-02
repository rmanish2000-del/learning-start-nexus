import type { User } from "@supabase/supabase-js";
import { getRouteApi } from "@tanstack/react-router";

import type { AppRole } from "./roles";

/** Context returned by the /_authenticated beforeLoad gate. */
export type WorkspaceContext = {
  user: User;
  role: AppRole;
  platformOwner: boolean;
  profile: { full_name: string | null; org_id: string | null } | null;
};

const authRoute = getRouteApi("/_authenticated");

/**
 * Typed accessor for the workspace route context. TanStack's inferred type for
 * this pathless layout currently collapses to the root context, so the shape
 * is asserted here once instead of at every call site.
 */
export function useWorkspaceContext(): WorkspaceContext {
  return authRoute.useRouteContext() as unknown as WorkspaceContext;
}

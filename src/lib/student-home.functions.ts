// UX Phase 1 · UX-01 — thin server-function wrapper for the gap-first student
// home. Runtime logic lives in ./student-home.server.ts.

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAnyRole } from "./admin.server";
import { fetchStudentHomeView } from "./student-home.server";

export const getMyGapQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAnyRole(context.supabase, context.userId, ["student"]);
    return fetchStudentHomeView(context.supabase, context.userId);
  });

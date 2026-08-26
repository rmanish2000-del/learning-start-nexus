// UX Phase 1 · Wave 2 — thin server-function wrappers for the educator board.
// Runtime logic lives in educator-board.server.ts / educator-board-shared.ts.

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAnyRole } from "./admin.server";
import { fetchClassBoard, fetchInterventionQueue } from "./educator-board.server";

export const getClassBoard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin", "educator", "reviewer"]);
    return fetchClassBoard(context.supabase);
  });

export const getInterventionQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin", "educator", "reviewer"]);
    return fetchInterventionQueue(context.supabase);
  });

// Sprint 6G: server functions for curriculum-aware gap detection.
// Thin wrappers only — runtime logic lives in gap.server.ts / gap-shared.ts.

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAnyRole } from "./admin.server";
import { gapBookSchema, gapSessionSchema } from "./gap-shared";
import { fetchGapAnalysis, fetchGapBooks, fetchGapSessions } from "./gap.server";

export const getGapBooksFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin", "educator", "reviewer"]);
    return fetchGapBooks(context.supabase);
  });

export const getGapSessionsFn = createServerFn({ method: "GET" })
  .inputValidator((data) => gapBookSchema.parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin", "educator", "reviewer"]);
    return fetchGapSessions(context.supabase, data.bookId);
  });

export const getGapAnalysisFn = createServerFn({ method: "GET" })
  .inputValidator((data) => gapSessionSchema.parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin", "educator", "reviewer"]);
    return fetchGapAnalysis(context.supabase, data.sessionId);
  });

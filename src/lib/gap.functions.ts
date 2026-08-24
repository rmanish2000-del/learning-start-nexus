// Sprint 6G: server functions for curriculum-aware gap detection.
// Thin wrappers only — runtime logic lives in gap.server.ts / gap-shared.ts.

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { gapBookSchema, gapSessionSchema } from "./gap-shared";
import { fetchGapAnalysis, fetchGapBooks, fetchGapSessions } from "./gap.server";

export const getGapBooksFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => fetchGapBooks(context.supabase));

export const getGapSessionsFn = createServerFn({ method: "GET" })
  .inputValidator((data) => gapBookSchema.parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => fetchGapSessions(context.supabase, data.bookId));

export const getGapAnalysisFn = createServerFn({ method: "GET" })
  .inputValidator((data) => gapSessionSchema.parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => fetchGapAnalysis(context.supabase, data.sessionId));

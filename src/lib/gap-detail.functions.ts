// Thin server-function wrapper for the gap detail view.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getGapDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ gapId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { fetchGapDetail } = await import("./gap-detail.server");
    return fetchGapDetail(context.supabase, context.userId, data.gapId);
  });

// Outcome Proof Dashboard — thin server-function wrappers.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAnyRole } from "./admin.server";
import { fetchCentreView, fetchParentView, fetchSchoolView } from "./outcome-dashboard.server";

const centreInputSchema = z.object({ centreId: z.string().uuid().nullable().optional() });

// School (organization-wide) executive view — leadership only.
export const getSchoolOutcomeView = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin", "reviewer"]);
    return fetchSchoolView(context.supabase);
  });

// Centre view — one educator's cohort. Educators default to their own cohort.
export const getCentreOutcomeView = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => centreInputSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin", "educator", "reviewer"]);
    return fetchCentreView(context.supabase, data.centreId ?? null, context.userId);
  });

// Parent view — only the caller's linked children.
export const getParentOutcomeView = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAnyRole(context.supabase, context.userId, ["parent", "admin"]);
    return fetchParentView(context.supabase, context.userId);
  });

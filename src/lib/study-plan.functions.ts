import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fetchStudyPlan, startSelfServeDiagnostic } from "./study-plan.server";

// The learner's own AI-generated study plan. Educator-free by design.
export const getMyStudyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => fetchStudyPlan(context.supabase, context.userId));

// Self-serve diagnostic start — no educator assignment required.
export const startMyDiagnostic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => startSelfServeDiagnostic(context.supabase, context.userId));

// Public Guidance · Feedback + analytics server functions.
//
// Submission and event recording are deliberately public (visitors are not
// signed in), but they write through server-only code into locked tables.
// Review functions are admin-only.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { feedbackListSchema, feedbackReviewUpdateSchema, feedbackSubmissionSchema } from "./feedback-shared";
import { guidanceEventSchema } from "./guidance-analytics";

const submitInput = feedbackSubmissionSchema.extend({ isAuthenticated: z.boolean().default(false) });

export const submitFeedbackFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => submitInput.parse(data))
  .handler(async ({ data }) => {
    const { submitFeedback } = await import("./feedback.server");
    return submitFeedback(data);
  });

export const recordGuidanceEventFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => guidanceEventSchema.parse(data))
  .handler(async ({ data }) => {
    const { recordGuidanceEvent } = await import("./feedback.server");
    await recordGuidanceEvent(data);
    return { ok: true as const };
  });

async function assertAdmin(context: { supabase: unknown; userId: string }) {
  const { requireAnyRole } = await import("./admin.server");
  await requireAnyRole(context.supabase as never, context.userId, ["admin"]);
}

export const listFeedbackFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => feedbackListSchema.parse(data ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { listFeedback } = await import("./feedback.server");
    return listFeedback(data.status, data.limit);
  });

export const updateFeedbackFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => feedbackReviewUpdateSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { updateFeedback } = await import("./feedback.server");
    await updateFeedback(data);
    return { ok: true as const };
  });

export const feedbackScreenshotUrlFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { screenshotUrl } = await import("./feedback.server");
    return { url: await screenshotUrl(data.id) };
  });

export const guidanceCountsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ days: z.number().int().min(1).max(180).default(30) }).parse(data ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { guidanceEventCounts } = await import("./feedback.server");
    return guidanceEventCounts(data.days);
  });

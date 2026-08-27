// Free Learning Check — authenticated RPC surface.
//
// Thin wrappers only: validate with zod, then delegate. Role separation is
// enforced inside free-check.server.ts (parent starts and previews, learner
// answers), never by the shape of these wrappers.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  freeCheckAnswerSchema,
  freeCheckIdSchema,
  startFreeCheckSchema,
} from "./free-check-shared";
import { z } from "zod";

const learnerIdSchema = z.object({ learnerId: z.string().uuid() });

export const startFreeLearningCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => startFreeCheckSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { startFreeCheck } = await import("./free-check.server");
    return startFreeCheck({ ...data, parentUserId: context.userId });
  });

export const getFreeCheckStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => learnerIdSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { loadFreeCheckStatus } = await import("./free-check.server");
    return loadFreeCheckStatus(context.userId, data.learnerId);
  });

export const getFreeCheckRun = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => freeCheckIdSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { loadFreeCheckRun } = await import("./free-check.server");
    return loadFreeCheckRun(data.checkId, context.userId);
  });

export const saveFreeCheckResponse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => freeCheckAnswerSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { saveFreeCheckAnswer } = await import("./free-check.server");
    return saveFreeCheckAnswer({ ...data, userId: context.userId });
  });

export const submitFreeLearningCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => freeCheckIdSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { submitFreeCheck } = await import("./free-check.server");
    return submitFreeCheck(data.checkId, context.userId);
  });

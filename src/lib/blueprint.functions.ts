// Sprint 6C: thin server-function wrappers for the Assessment Blueprint
// Engine. All logic lives in blueprint.server.ts; RLS enforces org isolation,
// requireAnyRole enforces the staff/reviewer split, and mastery-framework
// writes are admin-only.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAnyRole } from "./admin.server";
import {
  blueprintBookSchema,
  masteryPreviewSchema,
  updateMasteryLevelSchema,
} from "./blueprint-shared";
import {
  fetchBlueprintWorkspace,
  fetchLearnerOptions,
  fetchMasteryLevels,
  fetchMasteryPreview,
  updateMasteryLevel,
} from "./blueprint.server";

const READERS = ["admin", "educator", "reviewer"] as const;
const STAFF = ["admin", "educator"] as const;

export const getBlueprintWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => blueprintBookSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, [...READERS]);
    return fetchBlueprintWorkspace(context.supabase, data.bookId);
  });

export const getMasteryLevels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAnyRole(context.supabase, context.userId, [...READERS]);
    return fetchMasteryLevels(context.supabase);
  });

export const updateMasteryLevelFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateMasteryLevelSchema.parse(input))
  .handler(async ({ data, context }) => {
    // Mastery framework is org configuration — admin only.
    await requireAnyRole(context.supabase, context.userId, ["admin"]);
    await updateMasteryLevel(context.supabase, data);
    return { ok: true };
  });

export const getLearnerOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Learner data is staff-only; reviewers get an empty picker.
    await requireAnyRole(context.supabase, context.userId, [...STAFF]);
    return fetchLearnerOptions(context.supabase);
  });

export const getMasteryPreview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => masteryPreviewSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, [...STAFF]);
    return fetchMasteryPreview(context.supabase, data);
  });

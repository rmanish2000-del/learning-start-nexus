// Sprint 6E: thin server-function wrappers for the Assessment Builder.
// All logic lives in builder.server.ts; RLS enforces org isolation and
// requireAnyRole enforces the staff/reviewer split.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAnyRole } from "./admin.server";
import { getMyOrgId } from "./assessments.server";
import {
  buildAssessmentSchema,
  builderUnitSchema,
  builtAssessmentSchema,
} from "./builder-shared";
import {
  buildAssessment,
  fetchAssessmentCoverage,
  fetchBuilderBooks,
  fetchBuilderWorkspace,
} from "./builder.server";

const READERS = ["admin", "educator", "reviewer"] as const;
const STAFF = ["admin", "educator"] as const;

export const getBuilderBooksFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAnyRole(context.supabase, context.userId, [...READERS]);
    return fetchBuilderBooks(context.supabase);
  });

export const getBuilderWorkspaceFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => builderUnitSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, [...READERS]);
    return fetchBuilderWorkspace(context.supabase, data.bookId, data.unitId);
  });

export const buildAssessmentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => buildAssessmentSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, [...STAFF]);
    const orgId = await getMyOrgId(context.supabase, context.userId);
    return buildAssessment(context.supabase, { orgId, userId: context.userId }, data);
  });

export const getAssessmentCoverageFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => builtAssessmentSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, [...READERS]);
    return fetchAssessmentCoverage(context.supabase, data.assessmentId);
  });

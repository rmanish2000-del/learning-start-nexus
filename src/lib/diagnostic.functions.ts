// Sprint 6F: thin server-function wrappers for the Diagnostic Engine.
// All logic lives in diagnostic.server.ts; RLS enforces org isolation and
// requireAnyRole enforces the staff/reviewer split.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAnyRole } from "./admin.server";
import { getMyOrgId } from "./assessments.server";
import { diagnosticWorkspaceSchema, generateDiagnosticSchema } from "./diagnostic-shared";
import { fetchDiagnosticWorkspace, generateDiagnostic } from "./diagnostic.server";
import { fetchBuilderBooks } from "./builder.server";

const READERS = ["admin", "educator", "reviewer"] as const;
const STAFF = ["admin", "educator"] as const;

export const getDiagnosticBooksFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAnyRole(context.supabase, context.userId, [...READERS]);
    return fetchBuilderBooks(context.supabase);
  });

export const getDiagnosticWorkspaceFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => diagnosticWorkspaceSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, [...READERS]);
    return fetchDiagnosticWorkspace(context.supabase, data.bookId, data.unitId);
  });

export const generateDiagnosticFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => generateDiagnosticSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, [...STAFF]);
    const orgId = await getMyOrgId(context.supabase, context.userId);
    return generateDiagnostic(context.supabase, { orgId, userId: context.userId }, data);
  });

// Authenticated RPC surface for the identity-first parent flow.
// Every function here requires a valid bearer token — there is no anonymous
// path into account, student, or purchase state.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { addStudentSchema, claimParentSchema, registerParentSchema } from "./parent-account-shared";

function callerEmail(claims: unknown): string {
  const value = (claims as { email?: unknown } | null)?.email;
  return typeof value === "string" ? value : "";
}

export const registerParent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => registerParentSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { ensureParentAccount } = await import("./parent-account.server");
    return ensureParentAccount(context.userId, data);
  });

export const getParentAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { loadParentAccount } = await import("./parent-account.server");
    return loadParentAccount(context.userId, callerEmail(context.claims));
  });

export const createStudentProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => addStudentSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { addStudent } = await import("./parent-account.server");
    return addStudent(context.userId, data);
  });

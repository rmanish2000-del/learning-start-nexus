// Authenticated RPC surface for the identity-first parent flow.
// Every function here requires a valid bearer token — there is no anonymous
// path into account, student, or purchase state.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import {
  addStudentSchema,
  claimParentSchema,
  registerParentSchema,
  setStudentPinSchema,
} from "./parent-account-shared";

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

/**
 * Assigns the `parent` role to a self-service account that finished email
 * confirmation before the profile could be written (the signup tab could not
 * sign in immediately because confirmation was pending).
 */
export const claimParentRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => claimParentSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { ensureParentAccount } = await import("./parent-account.server");
    return ensureParentAccount(context.userId, {
      fullName: data.fullName || callerEmail(context.claims).split("@")[0] || "Parent",
      ...(data.phone ? { phone: data.phone } : {}),
    });
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

/**
 * Parent-assisted student credential recovery: sets (or resets) the 6-digit
 * PIN for one of the caller's own linked students, creating the student login
 * on first use. This removes the "check with your educator" dead end for
 * families whose student profile has no educator yet.
 */
export const setStudentLoginPin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => setStudentPinSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { setStudentPin } = await import("./parent-account.server");
    return setStudentPin(context.userId, data);
  });

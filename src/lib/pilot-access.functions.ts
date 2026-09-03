// Pilot access — authenticated RPC surface.
//
// Grant, extend and revoke are admin-only and re-checked server-side: the
// route gate is convenience, this is the authority.

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAnyRole } from "./admin.server";
import {
  extendPilotAccessSchema,
  grantPilotAccessSchema,
  revokePilotAccessSchema,
  startPilotRunSchema,
} from "./pilot-access-shared";

export const listPilotGrantsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin"]);
    const { listPilotGrants } = await import("./pilot-access.server");
    return listPilotGrants();
  });

export const grantPilotAccessFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => grantPilotAccessSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin"]);
    const { grantPilotAccess } = await import("./pilot-access.server");
    return grantPilotAccess({ ...data, actorUserId: context.userId });
  });

export const extendPilotAccessFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => extendPilotAccessSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin"]);
    const { extendPilotAccess } = await import("./pilot-access.server");
    await extendPilotAccess({ ...data, actorUserId: context.userId });
    return { ok: true };
  });

export const revokePilotAccessFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => revokePilotAccessSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin"]);
    const { revokePilotAccess } = await import("./pilot-access.server");
    await revokePilotAccess({ ...data, actorUserId: context.userId });
    return { ok: true };
  });

/** What the signed-in parent may run for free right now. */
export const myPilotAccessFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { listMyPilotAccess } = await import("./pilot-access.server");
    return listMyPilotAccess(context.supabase, context.userId);
  });

/** Starts the free pilot journey — no order, no checkout, no payment. */
export const startPilotRunFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => startPilotRunSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { startPilotRun } = await import("./pilot-access.server");
    return startPilotRun({ ...data, userId: context.userId });
  });

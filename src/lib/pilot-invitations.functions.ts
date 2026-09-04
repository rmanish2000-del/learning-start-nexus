// Pilot invitations — RPC surface.
//
// Creating and revoking an invitation is admin-only and re-checked server-side.
// Previewing a link is deliberately public (the visitor is not signed in yet)
// and returns only masked, non-identifying detail. Accepting requires the
// invited account to be signed in.

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAnyRole } from "./admin.server";
import {
  createPilotInvitationSchema,
  invitationTokenSchema,
  revokePilotInvitationSchema,
} from "./pilot-invitations-shared";

export const createPilotInvitationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createPilotInvitationSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin"]);
    const { createPilotInvitation } = await import("./pilot-invitations.server");
    return createPilotInvitation({ ...data, actorUserId: context.userId });
  });

export const listPilotInvitationsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin"]);
    const { listInvitations } = await import("./pilot-invitations.server");
    return listInvitations();
  });

export const revokePilotInvitationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => revokePilotInvitationSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin"]);
    const { revokeInvitation } = await import("./pilot-invitations.server");
    await revokeInvitation({ ...data, actorUserId: context.userId });
    return { ok: true };
  });

/** Public: tells a visitor whether their link still works, nothing more. */
export const previewPilotInvitationFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => invitationTokenSchema.parse(data))
  .handler(async ({ data }) => {
    const { previewInvitation } = await import("./pilot-invitations.server");
    return previewInvitation(data.token);
  });

export const acceptPilotInvitationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => invitationTokenSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { acceptInvitation } = await import("./pilot-invitations.server");
    const email =
      (context.claims as { email?: string } | null)?.email ??
      (await context.supabase.auth.getUser()).data.user?.email ??
      null;
    return acceptInvitation({ token: data.token, userId: context.userId, email });
  });

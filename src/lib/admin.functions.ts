import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  createStaffUserSchema,
  parentLinkSchema,
  parentUnlinkSchema,
  updateUserRoleSchema,
} from "./schemas";
import type { AppRole } from "./roles";
import { requireAnyRole } from "./admin.server";

// Resolve the caller's org via their own session (RLS-scoped read).
async function callerOrgId(
  supabase: Parameters<typeof requireAnyRole>[0],
  userId: string,
): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", userId)
    .single();
  if (!data?.org_id) throw new Error("Your account is not linked to an organization.");
  return data.org_id;
}

export const listStaffUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin"]);
    const orgId = await callerOrgId(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Scope every listing to the caller's organization.
    const { data: orgProfiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .eq("org_id", orgId);
    if (profilesError) throw new Error(profilesError.message);

    const orgUserIds = new Set((orgProfiles ?? []).map((p) => p.id));
    const nameByUser = new Map((orgProfiles ?? []).map((p) => [p.id, p.full_name]));

    const [{ data: usersPage, error }, { data: roles }] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);
    if (error) throw new Error(error.message);

    const roleByUser = new Map((roles ?? []).map((r) => [r.user_id, r.role]));

    return usersPage.users
      .filter((u) => orgUserIds.has(u.id))
      .map((u) => ({
        id: u.id,
        email: u.email ?? "",
        fullName: nameByUser.get(u.id) || (u.user_metadata?.["full_name"] as string) || "",
        role: (roleByUser.get(u.id) ?? "student") as "admin" | "educator" | "student",
        createdAt: u.created_at,
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  });

export const createStaffUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createStaffUserSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin"]);
    const orgId = await callerOrgId(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const tempPassword = `EduOS-${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}!`;

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (error) throw new Error(error.message);

    // Attach the new staff member to the caller's organization, not the default.
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ org_id: orgId })
      .eq("id", created.user.id);
    if (profileError) throw new Error(profileError.message);

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: created.user.id, role: data.role });
    if (roleError) throw new Error(roleError.message);

    return { id: created.user.id, tempPassword };
  });

export const updateUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateUserRoleSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin"]);
    if (data.userId === context.userId && data.role !== "admin") {
      throw new Error("You cannot remove your own admin role.");
    }

    // Org-scoped profiles RLS: the target is only readable inside the caller's org.
    const { data: targetProfile } = await context.supabase
      .from("profiles")
      .select("id")
      .eq("id", data.userId)
      .maybeSingle();
    if (!targetProfile) throw new Error("That user is not part of your organization.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: deleteError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId);
    if (deleteError) throw new Error(deleteError.message);

    const { error: insertError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role });
    if (insertError) throw new Error(insertError.message);

    return { ok: true };
  });

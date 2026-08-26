import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  createStaffUserSchema,
  parentLinkSchema,
  parentUnlinkSchema,
  resetStaffPasswordSchema,
  updateUserRoleSchema,
} from "./schemas";
import type { AppRole } from "./roles";
import { callerOrgId, requireAnyRole } from "./admin.server";

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
        role: (roleByUser.get(u.id) ?? "student") as AppRole,
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

// Issue a fresh temporary password for a staff account in the caller's org.
// This is the recovery path when the one-time password from creation was lost.
export const resetStaffPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => resetStaffPasswordSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin"]);

    // Org-scoped profiles RLS: the target is only readable inside the caller's org.
    const { data: targetProfile } = await context.supabase
      .from("profiles")
      .select("id")
      .eq("id", data.userId)
      .maybeSingle();
    if (!targetProfile) throw new Error("That user is not part of your organization.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tempPassword = `EduOS-${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}!`;

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: tempPassword,
    });
    if (error) throw new Error(error.message);

    return { tempPassword };
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

// ---------------------------------------------------------------------------
// Parent access: link a provisioned parent account to a learner in the org.
// Reads/writes go through the caller's RLS-scoped client (links_admin_insert /
// links_admin_delete already require an admin in the same organization).
// ---------------------------------------------------------------------------

export const listParentLinks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin"]);

    const [{ data: links, error }, { data: learners }, { data: profiles }, { data: roles }] =
      await Promise.all([
        context.supabase.from("parent_learner_links").select("id, parent_user_id, learner_id"),
        context.supabase.from("learners").select("id, full_name, grade"),
        context.supabase.from("profiles").select("id, full_name"),
        context.supabase.from("user_roles").select("user_id, role"),
      ]);
    if (error) throw new Error(error.message);

    const nameByUser = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
    const learnerById = new Map((learners ?? []).map((l) => [l.id, l]));

    return {
      links: (links ?? []).map((row) => ({
        id: row.id,
        parentUserId: row.parent_user_id,
        parentName: nameByUser.get(row.parent_user_id) ?? "Unknown parent",
        learnerId: row.learner_id,
        learnerName: learnerById.get(row.learner_id)?.full_name ?? "Unknown learner",
      })),
      parents: (roles ?? [])
        .filter((r) => r.role === "parent" && nameByUser.has(r.user_id))
        .map((r) => ({ id: r.user_id, name: nameByUser.get(r.user_id) ?? "" }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      learners: (learners ?? [])
        .map((l) => ({ id: l.id, name: l.full_name, grade: l.grade }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  });

export const linkParentToLearner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => parentLinkSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin"]);
    const orgId = await callerOrgId(context.supabase, context.userId);

    // Both sides must be visible under the caller's org-scoped RLS.
    const [{ data: parentProfile }, { data: learner }] = await Promise.all([
      context.supabase.from("profiles").select("id").eq("id", data.parentUserId).maybeSingle(),
      context.supabase.from("learners").select("id").eq("id", data.learnerId).maybeSingle(),
    ]);
    if (!parentProfile) throw new Error("That parent account is not part of your organization.");
    if (!learner) throw new Error("That learner is not part of your organization.");

    const { data: parentRole } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.parentUserId)
      .eq("role", "parent")
      .maybeSingle();
    if (!parentRole) throw new Error("That account does not have the parent role.");

    const { data: existing } = await context.supabase
      .from("parent_learner_links")
      .select("id")
      .eq("parent_user_id", data.parentUserId)
      .eq("learner_id", data.learnerId)
      .maybeSingle();
    if (existing) return { ok: true as const, linkId: existing.id };

    const { data: row, error } = await context.supabase
      .from("parent_learner_links")
      .insert({ org_id: orgId, parent_user_id: data.parentUserId, learner_id: data.learnerId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true as const, linkId: row.id };
  });

export const unlinkParentFromLearner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => parentUnlinkSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin"]);
    const { error } = await context.supabase
      .from("parent_learner_links")
      .delete()
      .eq("id", data.linkId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

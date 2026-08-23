import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assignEducatorSchema, createLearnerSchema, resetPinSchema } from "./schemas";
import { studentEmail, studentPassword } from "./auth-utils";
import { requireAnyRole } from "./admin.server";

export const createLearner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createLearnerSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin", "educator"]);

    // Read the caller's own role row (RLS allows self-read) instead of the
    // internal security-definer RPC, which is not exposed via the API.
    const { data: adminRole } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    // Educators always own the learners they create; admins may assign anyone
    // in the same org (org-scoped profiles RLS makes other orgs unreadable).
    let educatorId = context.userId;
    if (adminRole && data.educatorId) {
      const { data: educatorProfile } = await context.supabase
        .from("profiles")
        .select("id")
        .eq("id", data.educatorId)
        .maybeSingle();
      if (!educatorProfile) throw new Error("That educator is not part of your organization.");
      educatorId = data.educatorId;
    }

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("org_id")
      .eq("id", context.userId)
      .single();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: studentEmail(data.handle),
      password: studentPassword(data.handle, data.pin),
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (error) {
      throw new Error(
        error.message.toLowerCase().includes("already")
          ? `The handle "${data.handle}" is already taken.`
          : error.message,
      );
    }

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: created.user.id, role: "student" });
    if (roleError) throw new Error(roleError.message);

    const { data: learner, error: learnerError } = await supabaseAdmin
      .from("learners")
      .insert({
        org_id: profile?.org_id ?? null,
        student_user_id: created.user.id,
        educator_id: educatorId,
        full_name: data.fullName,
        handle: data.handle,
        grade: data.grade,
        subject: data.subject,
        status: "active",
      })
      .select("id")
      .single();
    if (learnerError) throw new Error(learnerError.message);

    return { id: learner.id };
  });

export const resetLearnerPin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => resetPinSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin", "educator"]);

    // RLS scopes this read: admins see their org's learners, educators only their own.
    const { data: learner, error } = await context.supabase
      .from("learners")
      .select("id, student_user_id, handle")
      .eq("id", data.learnerId)
      .single();
    if (error || !learner) throw new Error("Learner not found.");
    if (!learner.student_user_id) throw new Error("This learner has no linked student account.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      learner.student_user_id,
      { password: studentPassword(learner.handle, data.pin) },
    );
    if (updateError) throw new Error(updateError.message);

    return { ok: true };
  });

// Reassign a learner to a different educator. Admin-only; both records must
// belong to the caller's organization (enforced via org-scoped RLS reads).
export const assignEducator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => assignEducatorSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin"]);

    const [{ data: learner }, { data: educatorProfile }, { data: educatorRole }] =
      await Promise.all([
        context.supabase.from("learners").select("id").eq("id", data.learnerId).maybeSingle(),
        context.supabase.from("profiles").select("id").eq("id", data.educatorId).maybeSingle(),
        context.supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.educatorId)
          .eq("role", "educator")
          .maybeSingle(),
      ]);
    if (!learner) throw new Error("Learner not found in your organization.");
    if (!educatorProfile) throw new Error("Educator not found in your organization.");
    if (!educatorRole) throw new Error("That staff member is not an educator.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("learners")
      .update({ educator_id: data.educatorId })
      .eq("id", data.learnerId);
    if (error) throw new Error(error.message);

    return { ok: true };
  });

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { studentEmail, studentPassword } from "./auth-utils";
import type { LearnerImportRow } from "./centre-onboarding-shared";

type Admin = SupabaseClient<Database>;

/**
 * Turn an approved pilot application into a live centre: a new organization
 * plus its first centre admin. Platform-admin only (checked by the caller).
 */
export async function approveCentreLeadImpl(
  supabaseAdmin: Admin,
  approverId: string,
  input: {
    leadId: string;
    orgName: string;
    adminFullName: string;
    adminEmail: string;
    phone?: string | undefined;
    timezone?: string | undefined;
  },
) {
  const { data: lead, error: leadError } = await supabaseAdmin
    .from("pilot_leads")
    .select("id, status, approved_org_id")
    .eq("id", input.leadId)
    .maybeSingle();
  if (leadError) throw new Error(leadError.message);
  if (!lead) throw new Error("That centre application no longer exists.");
  if (lead.approved_org_id) throw new Error("This application has already been approved.");

  const { data: org, error: orgError } = await supabaseAdmin
    .from("organizations")
    .insert({
      name: input.orgName,
      email: input.adminEmail,
      phone: input.phone ?? null,
      timezone: input.timezone || "Asia/Kolkata",
    })
    .select("id, name")
    .single();
  if (orgError) throw new Error(orgError.message);

  const tempPassword = `EduOS-${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}!`;
  const { data: created, error: userError } = await supabaseAdmin.auth.admin.createUser({
    email: input.adminEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: input.adminFullName, signup_role: "admin" },
  });
  if (userError) {
    // Roll the empty organization back so a retry starts clean.
    await supabaseAdmin.from("organizations").delete().eq("id", org.id);
    throw new Error(
      userError.message.toLowerCase().includes("already")
        ? "An account already exists for that email. Use a different centre admin email."
        : userError.message,
    );
  }

  // The signup trigger attaches new profiles to the first organization; move
  // the centre admin into the organization we just created for them.
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .upsert(
      { id: created.user.id, org_id: org.id, full_name: input.adminFullName },
      { onConflict: "id" },
    );
  if (profileError) throw new Error(profileError.message);

  const { error: roleError } = await supabaseAdmin
    .from("user_roles")
    .upsert({ user_id: created.user.id, role: "admin" }, { onConflict: "user_id,role" });
  if (roleError) throw new Error(roleError.message);

  const { error: updateError } = await supabaseAdmin
    .from("pilot_leads")
    .update({
      status: "approved",
      approved_org_id: org.id,
      approved_at: new Date().toISOString(),
      approved_by: approverId,
    })
    .eq("id", input.leadId);
  if (updateError) throw new Error(updateError.message);

  return {
    orgId: org.id,
    orgName: org.name,
    adminEmail: input.adminEmail,
    tempPassword,
  };
}

/**
 * Bulk-create centre learners with sign-in credentials. Rows are processed
 * independently so one bad handle never blocks the rest of the roster.
 */
export async function importLearnersImpl(
  supabaseAdmin: Admin,
  input: { orgId: string; educatorId: string; rows: LearnerImportRow[] },
) {
  const created: { fullName: string; handle: string }[] = [];
  const failed: { handle: string; message: string }[] = [];

  for (const row of input.rows) {
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: studentEmail(row.handle),
      password: studentPassword(row.handle, row.pin),
      email_confirm: true,
      user_metadata: { full_name: row.fullName, signup_role: "student" },
    });
    if (userError || !user?.user) {
      failed.push({
        handle: row.handle,
        message: (userError?.message ?? "").toLowerCase().includes("already")
          ? "Handle already taken"
          : (userError?.message ?? "Could not create the login"),
      });
      continue;
    }

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: user.user.id, role: "student" }, { onConflict: "user_id,role" });
    if (roleError) {
      failed.push({ handle: row.handle, message: roleError.message });
      continue;
    }

    const { error: learnerError } = await supabaseAdmin.from("learners").insert({
      org_id: input.orgId,
      student_user_id: user.user.id,
      educator_id: input.educatorId,
      full_name: row.fullName,
      handle: row.handle,
      grade: row.grade,
      subject: row.subject,
      status: "active",
      learner_mode: "centre_managed",
    });
    if (learnerError) {
      failed.push({ handle: row.handle, message: learnerError.message });
      continue;
    }

    created.push({ fullName: row.fullName, handle: row.handle });
  }

  return { created, failed };
}

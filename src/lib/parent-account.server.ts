// Identity-first purchase flow — server-only account layer.
//
// A parent is an authenticated auth user with the `parent` role, a profile
// (name + mobile), and at least one student profile linked through
// parent_learner_links. Purchases are refused until all of that exists.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type {
  ParentAccount,
  ParentPurchase,
  ParentStudent,
} from "./parent-account-shared";

export async function defaultOrgId(): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("organizations")
    .select("id")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No organization is configured.");
  return data.id;
}

function handleFor(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 10) || "student";
  return `${slug}-${crypto.randomUUID().slice(0, 8)}`;
}

/** Creates or refreshes the parent profile and guarantees the `parent` role. */
export async function ensureParentAccount(
  userId: string,
  input: { fullName: string; email?: string; phone?: string | null },
): Promise<{ ok: true }> {
  const orgId = await defaultOrgId();

  const { error: pError } = await supabaseAdmin.from("profiles").upsert(
    {
      id: userId,
      org_id: orgId,
      full_name: input.fullName,
      ...(input.phone ? { phone: input.phone } : {}),
    },
    { onConflict: "id" },
  );
  if (pError) throw new Error(pError.message);

  const { data: existingRole } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "parent")
    .maybeSingle();
  if (!existingRole) {
    const { error: rError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "parent" });
    if (rError && !rError.message.includes("duplicate")) throw new Error(rError.message);
  }

  return { ok: true };
}

export async function parentProfileExists(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, phone")
    .eq("id", userId)
    .maybeSingle();
  return Boolean(data?.full_name && data.phone);
}

export async function listStudents(userId: string): Promise<ParentStudent[]> {
  const { data: links, error } = await supabaseAdmin
    .from("parent_learner_links")
    .select("learner_id")
    .eq("parent_user_id", userId);
  if (error) throw new Error(error.message);
  const ids = (links ?? []).map((l) => l.learner_id);
  if (ids.length === 0) return [];

  const { data: learners, error: lError } = await supabaseAdmin
    .from("learners")
    .select(
      "id, full_name, grade, board, subject, mastery_score, created_at, handle, student_user_id, educator_id",
    )
    .in("id", ids)
    // Stable, deterministic order: bulk-created siblings can share created_at,
    // and an unstable list shuffles the child tabs between refetches.
    .order("created_at")
    .order("id");
  if (lError) throw new Error(lError.message);

  // Educator names power the "Awaiting educator assignment / Educator assigned"
  // status parents see — no parent should have to guess what happens next.
  const educatorIds = [
    ...new Set((learners ?? []).map((l) => l.educator_id).filter((v): v is string => !!v)),
  ];
  const educatorNames = new Map<string, string>();
  if (educatorIds.length > 0) {
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .in("id", educatorIds);
    for (const p of profiles ?? []) educatorNames.set(p.id, p.full_name);
  }

  return (learners ?? []).map((l) => ({
    id: l.id,
    fullName: l.full_name,
    grade: l.grade,
    board: l.board ?? "CBSE",
    subject: l.subject,
    masteryScore: l.mastery_score,
    createdAt: l.created_at,
    handle: l.handle,
    hasLogin: !!l.student_user_id,
    assignmentStatus: l.educator_id ? ("assigned" as const) : ("awaiting_assignment" as const),
    educatorName: l.educator_id ? (educatorNames.get(l.educator_id) ?? null) : null,
  }));
}

/**
 * Parent-assisted credential recovery. Creates the student login on first use
 * (parent-created profiles have no auth user until someone sets a PIN) and
 * resets the PIN afterwards. Scoped to the parent's own linked students.
 */
export async function setStudentPin(
  userId: string,
  input: { learnerId: string; pin: string },
): Promise<{ handle: string; created: boolean }> {
  await assertStudentOwned(userId, input.learnerId);
  return setStudentPinAsAdmin(input.learnerId, input.pin);
}

/**
 * Same credential recovery without the parent ownership check — callers must
 * already have verified admin authority and organization scope.
 */
export async function setStudentPinAsAdmin(
  learnerId: string,
  pin: string,
): Promise<{ handle: string; created: boolean }> {
  const input = { learnerId, pin };
  const { data: learner, error } = await supabaseAdmin
    .from("learners")
    .select("id, org_id, handle, full_name, student_user_id")
    .eq("id", input.learnerId)
    .single();
  if (error || !learner) throw new Error("Student profile not found.");


  const { studentEmail, studentPassword } = await import("./auth-utils");
  const password = studentPassword(learner.handle, input.pin);

  if (learner.student_user_id) {
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      learner.student_user_id,
      { password },
    );
    if (updateError) throw new Error(updateError.message);
    return { handle: learner.handle, created: false };
  }

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: studentEmail(learner.handle),
    password,
    email_confirm: true,
    user_metadata: { full_name: learner.full_name, signup_role: "student" },
  });
  if (createError || !created.user) {
    throw new Error(createError?.message ?? "Could not create the student login.");
  }

  await supabaseAdmin
    .from("user_roles")
    .insert({ user_id: created.user.id, role: "student" })
    .then(() => undefined, () => undefined);

  // The signup trigger homes every new profile to the first organisation, so a
  // student created for a learner in any other org is hidden from their own
  // account by the org-scoped learner policy ("profile isn't linked yet").
  await supabaseAdmin
    .from("profiles")
    .upsert(
      { id: created.user.id, org_id: learner.org_id, full_name: learner.full_name },
      { onConflict: "id" },
    );

  const { error: linkError } = await supabaseAdmin
    .from("learners")
    .update({ student_user_id: created.user.id })
    .eq("id", learner.id);
  if (linkError) throw new Error(linkError.message);

  return { handle: learner.handle, created: true };
}


/** Throws unless the student profile belongs to this parent account. */
export async function assertStudentOwned(userId: string, learnerId: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("parent_learner_links")
    .select("id")
    .eq("parent_user_id", userId)
    .eq("learner_id", learnerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("That student profile does not belong to your account.");
}

export async function addStudent(
  userId: string,
  input: { fullName: string; grade: number; board: string },
): Promise<ParentStudent> {
  if (!(await parentProfileExists(userId))) {
    throw new Error("Complete your parent details before adding a student.");
  }
  const orgId = await defaultOrgId();

  const { data: learner, error } = await supabaseAdmin
    .from("learners")
    .insert({
      org_id: orgId,
      full_name: input.fullName,
      handle: handleFor(input.fullName),
      grade: input.grade,
      board: input.board,
      subject: "Mathematics",
      status: "active",
      mastery_score: 0,
      focus_note: "Parent-created student profile.",
      is_demo: false,
    })
    .select("id, full_name, grade, board, subject, mastery_score, created_at, handle")
    .single();
  if (error) throw new Error(error.message);

  const { error: linkError } = await supabaseAdmin
    .from("parent_learner_links")
    .insert({ org_id: orgId, parent_user_id: userId, learner_id: learner.id });
  if (linkError) {
    await supabaseAdmin.from("learners").delete().eq("id", learner.id);
    throw new Error(linkError.message);
  }

  return {
    id: learner.id,
    fullName: learner.full_name,
    grade: learner.grade,
    board: learner.board ?? input.board,
    subject: learner.subject,
    masteryScore: learner.mastery_score,
    createdAt: learner.created_at,
    handle: learner.handle,
    hasLogin: false,
    // Parent-created profiles always start unassigned; admin picks the educator.
    assignmentStatus: "awaiting_assignment",
    educatorName: null,
  };
}

export async function loadParentAccount(
  userId: string,
  email: string,
): Promise<ParentAccount> {
  const [{ data: profile }, students] = await Promise.all([
    supabaseAdmin.from("profiles").select("full_name, phone").eq("id", userId).maybeSingle(),
    listStudents(userId),
  ]);

  const { data: orders, error } = await supabaseAdmin
    .from("parent_orders")
    .select(
      "order_ref, purpose, status, amount_paise, subject, unit_id, learner_id, child_first_name, access_token, session_id, paid_at, created_at",
    )
    .eq("parent_user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const sessionIds = (orders ?? []).map((o) => o.session_id).filter((v): v is string => v != null);
  const unitIds = (orders ?? []).map((o) => o.unit_id).filter((v): v is string => v != null);

  const [sessionsRes, unitsRes] = await Promise.all([
    sessionIds.length > 0
      ? supabaseAdmin.from("assessment_sessions").select("id, status, score_pct").in("id", sessionIds)
      : Promise.resolve({ data: [] as { id: string; status: string; score_pct: number | null }[] }),
    unitIds.length > 0
      ? supabaseAdmin.from("curriculum_units").select("id, title").in("id", unitIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
  ]);

  const sessionById = new Map((sessionsRes.data ?? []).map((s) => [s.id, s]));
  const unitById = new Map((unitsRes.data ?? []).map((u) => [u.id, u.title]));
  const studentById = new Map(students.map((s) => [s.id, s.fullName]));

  const purchases: ParentPurchase[] = (orders ?? []).map((o) => {
    const session = o.session_id ? sessionById.get(o.session_id) : undefined;
    return {
      orderRef: o.order_ref,
      purpose: o.purpose,
      status: o.status,
      amountPaise: o.amount_paise,
      subject: o.subject,
      unitTitle: o.unit_id ? (unitById.get(o.unit_id) ?? null) : null,
      studentId: o.learner_id,
      studentName: (o.learner_id ? studentById.get(o.learner_id) : null) ?? o.child_first_name,
      accessToken: o.status === "paid" ? o.access_token : null,
      sessionStatus: !session ? "not_started" : session.status === "submitted" ? "submitted" : "in_progress",
      scorePct: session?.score_pct ?? null,
      paidAt: o.paid_at,
      createdAt: o.created_at,
    };
  });

  return {
    profile: {
      userId,
      fullName: profile?.full_name ?? "",
      email,
      phone: profile?.phone ?? null,
    },
    students,
    purchases,
  };
}

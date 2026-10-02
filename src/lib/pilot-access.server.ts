// Pilot access — server-only implementation.
//
// Product law: a pilot grant is an administrative, non-commercial entitlement.
// Granting, extending or revoking it writes ONLY to pilot_grants and the
// append-only pilot_grant_events log. It never touches parent_orders,
// parent_entitlements, payment records or Razorpay, so no pilot family can be
// counted as revenue, a conversion or a paid customer.

import type { SupabaseClient } from "@supabase/supabase-js";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";
import { grantStatus, type PilotGrantView } from "./pilot-access-shared";

type Client = SupabaseClient<Database>;

async function logEvent(
  grantId: string,
  action: "granted" | "extended" | "revoked",
  actorUserId: string,
  detail: string,
): Promise<void> {
  await supabaseAdmin
    .from("pilot_grant_events")
    .insert({ grant_id: grantId, action, actor_user_id: actorUserId, detail });
}

function inDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

async function resolveParent(email: string): Promise<{ userId: string; orgId: string | null }> {
  const wanted = email.trim().toLowerCase();
  const { data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw new Error(listError.message);
  const user = list.users.find((u) => (u.email ?? "").toLowerCase() === wanted);
  if (!user) {
    throw new Error("No EduOS account uses that email. Ask the family to sign up first.");
  }
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, org_id")
    .eq("id", user.id)
    .maybeSingle();
  return { userId: user.id, orgId: profile?.org_id ?? null };
}

async function emailsFor(userIds: string[]): Promise<Map<string, string>> {
  const { data } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  const map = new Map<string, string>();
  for (const u of data?.users ?? []) {
    if (userIds.includes(u.id) && u.email) map.set(u.id, u.email);
  }
  return map;
}

export async function grantPilotAccess(input: {
  actorUserId: string;
  parentEmail: string;
  learnerId?: string | null | undefined;
  subject?: string | null | undefined;
  days: number;
  reason: string;
}): Promise<{ grantId: string }> {
  const parent = await resolveParent(input.parentEmail);

  if (input.learnerId) {
    // Ownership stays exactly where it already lives: the parent↔learner link.
    const { assertStudentOwned } = await import("./parent-account.server");
    await assertStudentOwned(parent.userId, input.learnerId);
  }

  const { data, error } = await supabaseAdmin
    .from("pilot_grants")
    .insert({
      org_id: parent.orgId,
      parent_user_id: parent.userId,
      learner_id: input.learnerId ?? null,
      subject: input.subject ?? null,
      grant_reason: input.reason,
      granted_by: input.actorUserId,
      expires_at: inDays(input.days),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await logEvent(
    data.id,
    "granted",
    input.actorUserId,
    `${input.days} day(s) · ${input.subject ?? "all subjects"} · ${input.reason}`,
  );
  return { grantId: data.id };
}

export async function extendPilotAccess(input: {
  actorUserId: string;
  grantId: string;
  days: number;
  reason: string;
}): Promise<void> {
  const { data: grant, error } = await supabaseAdmin
    .from("pilot_grants")
    .select("id, expires_at, revoked_at")
    .eq("id", input.grantId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!grant) throw new Error("That pilot grant could not be found.");
  if (grant.revoked_at) throw new Error("This grant was revoked. Issue a new grant instead.");

  // Extending a lapsed grant restarts from today, never from the stale date.
  const base = Math.max(Date.now(), new Date(grant.expires_at).getTime());
  const next = new Date(base + input.days * 86_400_000).toISOString();

  const { error: uError } = await supabaseAdmin
    .from("pilot_grants")
    .update({ expires_at: next, updated_at: new Date().toISOString() })
    .eq("id", input.grantId);
  if (uError) throw new Error(uError.message);

  await logEvent(input.grantId, "extended", input.actorUserId, `+${input.days} day(s) · ${input.reason}`);
}

export async function revokePilotAccess(input: {
  actorUserId: string;
  grantId: string;
  reason: string;
}): Promise<void> {
  // History is preserved: the grant row, its runs, sessions, gaps and reports
  // all stay. Only access stops.
  const { error } = await supabaseAdmin
    .from("pilot_grants")
    .update({
      revoked_at: new Date().toISOString(),
      revoked_by: input.actorUserId,
      revoke_reason: input.reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.grantId)
    .is("revoked_at", null);
  if (error) throw new Error(error.message);

  await logEvent(input.grantId, "revoked", input.actorUserId, input.reason);
}

export async function listPilotGrants(): Promise<PilotGrantView[]> {
  const { data, error } = await supabaseAdmin
    .from("pilot_grants")
    .select(
      "id, parent_user_id, learner_id, subject, grant_reason, granted_by, granted_at, expires_at, revoked_at, revoke_reason",
    )
    .order("granted_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  if (rows.length === 0) return [];

  const userIds = [...new Set(rows.flatMap((r) => [r.parent_user_id, r.granted_by]))];
  const learnerIds = [...new Set(rows.map((r) => r.learner_id).filter(Boolean))] as string[];

  const [{ data: profiles }, emails, { data: learners }, { data: runs }] = await Promise.all([
    supabaseAdmin.from("profiles").select("id, full_name").in("id", userIds),
    emailsFor(userIds),
    learnerIds.length
      ? supabaseAdmin.from("learners").select("id, full_name").in("id", learnerIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    supabaseAdmin.from("pilot_diagnostic_runs").select("grant_id"),
  ]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const learnerById = new Map((learners ?? []).map((l) => [l.id, l]));
  const runCounts = new Map<string, number>();
  for (const r of runs ?? []) runCounts.set(r.grant_id, (runCounts.get(r.grant_id) ?? 0) + 1);

  return rows.map((r) => ({
    id: r.id,
    parentEmail: emails.get(r.parent_user_id) ?? null,
    parentName: profileById.get(r.parent_user_id)?.full_name ?? null,
    learnerId: r.learner_id,
    learnerName: r.learner_id ? (learnerById.get(r.learner_id)?.full_name ?? null) : null,
    subject: r.subject,
    reason: r.grant_reason,
    grantedByName: profileById.get(r.granted_by)?.full_name ?? null,
    grantedAt: r.granted_at,
    expiresAt: r.expires_at,
    revokedAt: r.revoked_at,
    revokeReason: r.revoke_reason,
    status: grantStatus(r),
    runCount: runCounts.get(r.id) ?? 0,
  }));
}

/** Active grants a signed-in parent holds, used to unlock the free journey. */
export async function listMyPilotAccess(
  supabase: Client,
  userId: string,
): Promise<{ id: string; learnerId: string | null; subject: string | null; expiresAt: string }[]> {
  const { data, error } = await supabase
    .from("pilot_grants")
    .select("id, learner_id, subject, expires_at, revoked_at")
    .eq("parent_user_id", userId)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((g) => ({
    id: g.id,
    learnerId: g.learner_id,
    subject: g.subject,
    expiresAt: g.expires_at,
  }));
}

/** The grant that authorises a specific parent + learner (+ subject) journey. */
export async function activeGrantFor(
  parentUserId: string,
  learnerId: string,
  subject: string | null,
): Promise<{ id: string; orgId: string | null } | null> {
  const { data, error } = await supabaseAdmin
    .from("pilot_grants")
    .select("id, org_id, subject, learner_id")
    .eq("parent_user_id", parentUserId)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString());
  if (error) throw new Error(error.message);
  const match = (data ?? []).find(
    (g) =>
      (g.learner_id == null || g.learner_id === learnerId) &&
      (g.subject == null || subject == null || g.subject === subject),
  );
  return match ? { id: match.id, orgId: match.org_id } : null;
}

/** Expiry or revocation removes access immediately, everywhere. */
export async function assertPilotRunActive(runId: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("pilot_diagnostic_runs")
    .select("id, pilot_grants!inner(expires_at, revoked_at)")
    .eq("id", runId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const grant = (data as { pilot_grants?: { expires_at: string; revoked_at: string | null } } | null)
    ?.pilot_grants;
  if (!grant || grant.revoked_at || new Date(grant.expires_at).getTime() <= Date.now()) {
    throw new Error("This pilot access has ended. Ask EduOS to extend it, or buy the diagnostic.");
  }
}

export async function activePilotRunIds(runIds: string[]): Promise<Set<string>> {
  if (runIds.length === 0) return new Set();
  const { data, error } = await supabaseAdmin
    .from("pilot_diagnostic_runs")
    .select("id, pilot_grants!inner(expires_at, revoked_at)")
    .in("id", runIds);
  if (error) throw new Error(error.message);
  const now = Date.now();
  const live = new Set<string>();
  for (const row of (data ?? []) as {
    id: string;
    pilot_grants: { expires_at: string; revoked_at: string | null };
  }[]) {
    if (!row.pilot_grants.revoked_at && new Date(row.pilot_grants.expires_at).getTime() > now) {
      live.add(row.id);
    }
  }
  return live;
}

/**
 * Starts a pilot diagnostic. No order, no payment intent, no amount — the
 * journey record is a pilot run, and the learner then gets the real
 * diagnostic → report → gaps → Study Plan → AI Tutor → reassessment journey.
 */
export async function startPilotRun(input: {
  userId: string;
  learnerId: string;
  bookId: string;
  unitId: string;
}): Promise<{ accessToken: string }> {
  const { assertStudentOwned } = await import("./parent-account.server");
  await assertStudentOwned(input.userId, input.learnerId);

  const { data: book, error: bookError } = await supabaseAdmin
    .from("books")
    .select("id, org_id, board, grade, subject, archived_at")
    .eq("id", input.bookId)
    .maybeSingle();
  if (bookError) throw new Error(bookError.message);
  if (!book || book.archived_at) throw new Error("That subject is not available.");

  const grant = await activeGrantFor(input.userId, input.learnerId, book.subject);
  if (!grant) throw new Error("This account does not have active pilot access for that student.");

  const { data: unit, error: unitError } = await supabaseAdmin
    .from("curriculum_units")
    .select("id, title")
    .eq("id", input.unitId)
    .eq("book_id", input.bookId)
    .maybeSingle();
  if (unitError) throw new Error(unitError.message);
  if (!unit) throw new Error("That chapter group is not available.");

  const { data: learner } = await supabaseAdmin
    .from("learners")
    .select("id, full_name")
    .eq("id", input.learnerId)
    .maybeSingle();
  if (!learner) throw new Error("That student profile could not be found.");

  const { newAccessToken, newRunRef, setupPilotDiagnosticRun } = await import(
    "./parent-diagnostic.server"
  );

  const { data: run, error } = await supabaseAdmin
    .from("pilot_diagnostic_runs")
    .insert({
      grant_id: grant.id,
      run_ref: newRunRef(),
      access_token: newAccessToken(),
      board: book.board ?? "CBSE",
      grade: book.grade,
      subject: book.subject,
      book_id: book.id,
      unit_id: unit.id,
      child_first_name: learner.full_name,
      org_id: book.org_id,
      parent_user_id: input.userId,
      learner_id: learner.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  return setupPilotDiagnosticRun(run.id);
}

// Centre setup + sample workspace — server-only implementation.
//
// Everything here is scoped to one organization (the caller's). Sample data is
// created and removed by two SECURITY DEFINER database functions so each action
// is a single transaction: all-or-nothing, and logged in
// sample_workspace_events with the acting user.

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import {
  deriveCentreSetup,
  type CentreProfileInput,
  type CentreSetupSignals,
  type CentreSetupState,
} from "./centre-setup-shared";

type Admin = SupabaseClient<Database>;

async function count(
  q: PromiseLike<{ count: number | null; error: { message: string } | null }>,
): Promise<number> {
  const { count: n, error } = await q;
  if (error) throw new Error(error.message);
  return n ?? 0;
}

export async function loadCentreSetupSignals(
  admin: Admin,
  orgId: string,
): Promise<CentreSetupSignals> {
  const [{ data: org, error: orgError }, { data: progress }, { data: orgProfiles }] =
    await Promise.all([
      admin.from("organizations").select("name, email, phone").eq("id", orgId).maybeSingle(),
      admin
        .from("centre_setup_progress")
        .select("report_reviewed_at, completed_at")
        .eq("org_id", orgId)
        .maybeSingle(),
      admin.from("profiles").select("id").eq("org_id", orgId),
    ]);
  if (orgError) throw new Error(orgError.message);

  const profileIds = (orgProfiles ?? []).map((p) => p.id);
  let educatorCount = 0;
  if (profileIds.length > 0) {
    educatorCount = await count(
      admin
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .eq("role", "educator")
        .in("user_id", profileIds),
    );
  }

  const [realLearnerCount, sampleLearnerCount, sessionCount, submittedSessionCount] =
    await Promise.all([
      count(
        admin
          .from("learners")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("is_sample", false),
      ),
      count(
        admin
          .from("learners")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("is_sample", true),
      ),
      count(
        admin
          .from("assessment_sessions")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId),
      ),
      count(
        admin
          .from("assessment_sessions")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("status", "submitted"),
      ),
    ]);

  return {
    orgName: org?.name ?? null,
    orgEmail: org?.email ?? null,
    orgPhone: org?.phone ?? null,
    educatorCount,
    realLearnerCount,
    sampleLearnerCount,
    sessionCount,
    submittedSessionCount,
    reportReviewedAt: progress?.report_reviewed_at ?? null,
  };
}

/** Current checklist state; records completion server-side the first time all steps are done. */
export async function getCentreSetup(admin: Admin, orgId: string): Promise<CentreSetupState> {
  const signals = await loadCentreSetupSignals(admin, orgId);
  const state = deriveCentreSetup(signals);
  if (state.complete) {
    await admin
      .from("centre_setup_progress")
      .upsert(
        {
          org_id: orgId,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "org_id", ignoreDuplicates: false },
      );
  }
  return state;
}

export async function markReportReviewed(admin: Admin, orgId: string): Promise<void> {
  const submitted = await count(
    admin
      .from("assessment_sessions")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "submitted"),
  );
  if (submitted === 0) throw new Error("No submitted diagnostic to review yet.");
  const now = new Date().toISOString();
  const { error } = await admin
    .from("centre_setup_progress")
    .upsert({ org_id: orgId, report_reviewed_at: now, updated_at: now }, { onConflict: "org_id" });
  if (error) throw new Error(error.message);
}

export async function updateCentreProfile(
  admin: Admin,
  orgId: string,
  input: CentreProfileInput,
): Promise<void> {
  const { error } = await admin
    .from("organizations")
    .update({
      name: input.name,
      email: input.email,
      phone: input.phone,
      tagline: input.tagline?.trim() ? input.tagline.trim() : null,
      website: input.website?.trim() ? input.website.trim() : null,
    })
    .eq("id", orgId);
  if (error) throw new Error(error.message);
}

export type SampleWorkspaceResult = { learners: number; assessments: number; sessions: number };

function parseCounts(value: unknown): SampleWorkspaceResult {
  const v = (value ?? {}) as Partial<Record<keyof SampleWorkspaceResult, unknown>>;
  const n = (x: unknown) => (typeof x === "number" ? x : 0);
  return { learners: n(v.learners), assessments: n(v.assessments), sessions: n(v.sessions) };
}

export async function createSampleWorkspace(
  admin: Admin,
  orgId: string,
  actorId: string,
): Promise<SampleWorkspaceResult> {
  const { data, error } = await admin.rpc("create_sample_workspace", {
    p_org: orgId,
    p_actor: actorId,
  });
  if (error) {
    if (error.message.includes("already exists")) {
      throw new Error("The sample workspace is already loaded for your centre.");
    }
    console.error("[sample-workspace] create failed", error.code, error.message);
    throw new Error("We couldn't load the sample workspace. Please try again.");
  }
  return parseCounts(data);
}

export async function removeSampleWorkspace(
  admin: Admin,
  orgId: string,
  actorId: string,
): Promise<SampleWorkspaceResult> {
  const { data, error } = await admin.rpc("remove_sample_workspace", {
    p_org: orgId,
    p_actor: actorId,
  });
  if (error) {
    console.error("[sample-workspace] remove failed", error.code, error.message);
    throw new Error(
      "We couldn't remove the sample workspace. Nothing was changed — please try again.",
    );
  }
  return parseCounts(data);
}

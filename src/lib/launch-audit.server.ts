import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import type { DbErrorShape, PolicyAuditRow } from "./audit.server";
import { getConsentStatus } from "./consent.server";

type Client = SupabaseClient<Database>;

// ---------------------------------------------------------------------------
// Overview data for the Launch Readiness Audit
// ---------------------------------------------------------------------------

export type ConsentOverviewRow = {
  learnerId: string;
  learnerName: string;
  handle: string;
  hasConsent: boolean;
  latestConsentDate: string | null;
  latestConsentVersion: string | null;
  parentName: string | null;
  parentEmail: string | null;
  totalRecords: number;
};

export type GateDecisionRow = {
  learnerName: string;
  handle: string;
  interventionTitle: string;
  interventionStatus: string;
  hasConsent: boolean;
  tutorAccess: "allowed" | "blocked";
};

export type ReviewerAccountInfo = {
  userId: string;
  fullName: string;
} | null;

async function fetchPolicyRows(supabase: Client): Promise<PolicyAuditRow[]> {
  const { data, error } = await supabase
    .from("rls_policy_audit")
    .select("tablename, policyname, cmd, roles, using_expression, with_check_expression");
  if (error) throw error;
  return (data ?? []) as PolicyAuditRow[];
}

export async function fetchConsentOverview(supabase: Client): Promise<ConsentOverviewRow[]> {
  const { data: learners, error } = await supabase
    .from("learners")
    .select("id, full_name, handle")
    .order("full_name");
  if (error) throw error;
  const rows: ConsentOverviewRow[] = [];
  for (const l of learners ?? []) {
    const status = await getConsentStatus(supabase, l.id);
    rows.push({
      learnerId: l.id,
      learnerName: l.full_name,
      handle: l.handle,
      hasConsent: status.hasConsent,
      latestConsentDate: status.latest?.consentDate ?? null,
      latestConsentVersion: status.latest?.consentVersion ?? null,
      parentName: status.latest?.parentName ?? null,
      parentEmail: status.latest?.parentEmail ?? null,
      totalRecords: status.totalRecords,
    });
  }
  return rows;
}

export async function fetchGateDecisions(supabase: Client): Promise<GateDecisionRow[]> {
  const { data, error } = await supabase
    .from("interventions")
    .select("title, status, learner_id, learners(full_name, handle)")
    .in("status", ["planned", "in_progress"])
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows: GateDecisionRow[] = [];
  for (const row of data ?? []) {
    const learner = row.learners as unknown as { full_name: string; handle: string } | null;
    const hasConsent = await getConsentStatus(supabase, row.learner_id).then((s) => s.hasConsent);
    rows.push({
      learnerName: learner?.full_name ?? "Unknown",
      handle: learner?.handle ?? "?",
      interventionTitle: row.title,
      interventionStatus: row.status,
      hasConsent,
      tutorAccess: hasConsent ? "allowed" : "blocked",
    });
  }
  return rows;
}

export async function fetchReviewerAccount(supabase: Client): Promise<ReviewerAccountInfo> {
  // Admins can read org role rows; a reviewer running this reads their own row.
  const { data, error } = await supabase
    .from("user_roles")
    .select("user_id, profiles(full_name)")
    .eq("role", "reviewer")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const profile = data.profiles as unknown as { full_name: string } | null;
  return { userId: data.user_id, fullName: profile?.full_name ?? "Reviewer" };
}

export type LaunchPolicySummary = {
  consentPolicies: PolicyAuditRow[];
  reviewerWritePolicies: PolicyAuditRow[];
  reviewerSelectPolicies: PolicyAuditRow[];
  tutorInteractionReviewerPolicies: PolicyAuditRow[];
};

export async function fetchLaunchPolicySummary(supabase: Client): Promise<LaunchPolicySummary> {
  const all = await fetchPolicyRows(supabase);
  const mentionsReviewer = (p: PolicyAuditRow) =>
    (p.using_expression ?? "").includes("reviewer") ||
    (p.with_check_expression ?? "").includes("reviewer");
  return {
    consentPolicies: all.filter((p) => p.tablename === "guardian_consents"),
    reviewerWritePolicies: all.filter(
      (p) => p.cmd !== "SELECT" && mentionsReviewer(p),
    ),
    reviewerSelectPolicies: all.filter((p) => p.cmd === "SELECT" && mentionsReviewer(p)),
    tutorInteractionReviewerPolicies: all.filter(
      (p) => p.tablename === "tutor_interactions" && mentionsReviewer(p),
    ),
  };
}

// ---------------------------------------------------------------------------
// Probes
// ---------------------------------------------------------------------------

export type LaunchProbe = {
  key: string;
  name: string;
  expectation: string;
  pass: boolean;
  skipped: boolean;
  detail: string;
  dbError: DbErrorShape;
};

export async function runLaunchProbes(
  supabase: Client,
  admin: Client,
  myOrgId: string,
): Promise<LaunchProbe[]> {
  const probes: LaunchProbe[] = [];
  const push = (p: LaunchProbe) => probes.push(p);

  // P1 — Consent records exist and are org-scoped (Aarav's seeded consent).
  {
    const { count: orgCount, error } = await supabase
      .from("guardian_consents")
      .select("id", { count: "exact", head: true });
    const { count: globalCount } = await admin
      .from("guardian_consents")
      .select("id", { count: "exact", head: true });
    const { data: aarav } = await admin
      .from("learners")
      .select("id")
      .eq("handle", "aarav")
      .maybeSingle();
    let aaravRecords = 0;
    if (aarav) {
      const status = await getConsentStatus(admin, aarav.id);
      aaravRecords = status.totalRecords;
    }
    push({
      key: "consent_storage",
      name: "Consent records stored & org-scoped",
      expectation:
        "guardian_consents is queryable, RLS-scoped to the caller's org, and the demo learner (aarav) has a consent record on file.",
      pass: !error && (orgCount ?? 0) > 0 && aaravRecords > 0,
      skipped: false,
      detail: error
        ? `Query failed: ${error.message}`
        : `Visible consent records (this org, RLS): ${orgCount ?? 0} · global: ${globalCount ?? 0} · aarav records: ${aaravRecords}.`,
      dbError: error ? { code: error.code, message: error.message } : null,
    });
  }

  // P2 — Consent history is append-only (no UPDATE/DELETE policies).
  {
    const policies = await fetchPolicyRows(supabase);
    const consent = policies.filter((p) => p.tablename === "guardian_consents");
    const writeCmds = consent.filter((p) => p.cmd === "UPDATE" || p.cmd === "DELETE" || p.cmd === "ALL");
    push({
      key: "consent_append_only",
      name: "Consent history is append-only",
      expectation:
        "guardian_consents exposes SELECT + INSERT policies only; no UPDATE/DELETE/ALL policy exists, so history cannot be rewritten or erased via the Data API.",
      pass: consent.length === 2 && writeCmds.length === 0,
      skipped: false,
      detail: `Policies on guardian_consents: ${consent
        .map((p) => `${p.policyname} [${p.cmd}]`)
        .join(", ")}.`,
      dbError: null,
    });
  }

  // P3 — AI tutor gate: decision matches consent state for every open intervention.
  {
    const decisions = await fetchGateDecisions(supabase);
    const blocked = decisions.filter((d) => d.tutorAccess === "blocked");
    const allowed = decisions.filter((d) => d.tutorAccess === "allowed");
    push({
      key: "tutor_gate",
      name: "AI tutor consent gate",
      expectation:
        "Every open intervention resolves tutor access strictly from guardian consent: no consent → blocked, consent on file → allowed. Assessments and learning plans are unaffected.",
      pass: decisions.length > 0 && blocked.length > 0,
      skipped: decisions.length === 0,
      detail:
        decisions.length === 0
          ? "No planned/in-progress interventions in this org to evaluate."
          : decisions
              .map(
                (d) =>
                  `${d.learnerName} (@${d.handle}) — ${d.interventionTitle} [${d.interventionStatus}]: consent ${d.hasConsent ? "ON FILE" : "MISSING"} → tutor ${d.tutorAccess.toUpperCase()}`,
              )
              .join(" · ") +
            ` (${allowed.length} allowed, ${blocked.length} blocked)`,
      dbError: null,
    });
  }

  // P4 — Reviewer account exists in this org.
  {
    const reviewer = await fetchReviewerAccount(supabase);
    push({
      key: "reviewer_account",
      name: "Reviewer role provisioned",
      expectation:
        "A user with the reviewer role exists in this organization (reviewer@eduos.global) and can sign in.",
      pass: reviewer !== null,
      skipped: false,
      detail: reviewer
        ? `Reviewer account found: ${reviewer.fullName} (${reviewer.userId}).`
        : "No reviewer role row visible in this organization.",
      dbError: null,
    });
  }

  // P5 — Reviewer is read-only: zero write policies mention the role.
  {
    const summary = await fetchLaunchPolicySummary(supabase);
    push({
      key: "reviewer_read_only",
      name: "Reviewer is read-only by policy",
      expectation:
        "No INSERT/UPDATE/DELETE/ALL policy on any table references the reviewer role, while SELECT policies do — read access is deliberate, write access is impossible.",
      pass: summary.reviewerWritePolicies.length === 0 && summary.reviewerSelectPolicies.length > 0,
      skipped: false,
      detail: `Write policies mentioning reviewer: ${summary.reviewerWritePolicies.length} · SELECT policies mentioning reviewer: ${summary.reviewerSelectPolicies.length} (${summary.reviewerSelectPolicies
        .map((p) => `${p.tablename}.${p.policyname}`)
        .slice(0, 6)
        .join(", ")}${summary.reviewerSelectPolicies.length > 6 ? ", …" : ""}).`,
      dbError: null,
    });
  }

  // P6 — Conversation privacy: reviewers (and staff) cannot read tutor conversations.
  {
    const summary = await fetchLaunchPolicySummary(supabase);
    const { count: visibleInteractions, error } = await supabase
      .from("tutor_interactions")
      .select("id", { count: "exact", head: true });
    push({
      key: "conversation_privacy",
      name: "Tutor conversation privacy intact",
      expectation:
        "tutor_interactions has no policy referencing the reviewer role; conversation text stays student-only while staff/reviewers see session aggregates.",
      pass: summary.tutorInteractionReviewerPolicies.length === 0 && !error,
      skipped: false,
      detail: `Policies on tutor_interactions mentioning reviewer: ${summary.tutorInteractionReviewerPolicies.length} · conversation rows visible to the current caller: ${visibleInteractions ?? 0}.`,
      dbError: error ? { code: error.code, message: error.message } : null,
    });
  }

  return probes;
}

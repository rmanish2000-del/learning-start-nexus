import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

export interface ConsentRecord {
  id: string;
  learnerId: string;
  parentName: string;
  parentEmail: string;
  parentMobile: string;
  consentDate: string;
  consentVersion: string;
  recordedAt: string;
  action: "granted" | "revoked";
  recordedByName: string | null;
}

export interface ConsentStatus {
  hasConsent: boolean;
  latest: ConsentRecord | null;
  totalRecords: number;
}

type ConsentRow = Database["public"]["Tables"]["guardian_consents"]["Row"];

function mapConsent(row: ConsentRow, nameByUser?: Map<string, string | null>): ConsentRecord {
  return {
    id: row.id,
    learnerId: row.learner_id,
    parentName: row.parent_name,
    parentEmail: row.parent_email,
    parentMobile: row.parent_mobile,
    consentDate: row.consent_date,
    consentVersion: row.consent_version,
    recordedAt: row.created_at,
    action: row.action === "revoked" ? "revoked" : "granted",
    recordedByName: (row.recorded_by && nameByUser?.get(row.recorded_by)) || null,
  };
}

// Latest consent record for a learner. Consent history is append-only, so the
// newest row (by creation time) is the current state — a revocation row after
// a grant means consent is withdrawn.
export async function getConsentStatus(
  supabase: SupabaseClient<Database>,
  learnerId: string,
): Promise<ConsentStatus> {
  const { data, error } = await supabase
    .from("guardian_consents")
    .select("*")
    .eq("learner_id", learnerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  const first = rows[0];
  return {
    hasConsent: !!first && first.action !== "revoked",
    latest: first ? mapConsent(first) : null,
    totalRecords: rows.length,
  };
}

export async function hasGuardianConsent(
  supabase: SupabaseClient<Database>,
  learnerId: string,
): Promise<boolean> {
  const status = await getConsentStatus(supabase, learnerId);
  return status.hasConsent;
}

export async function listConsentHistory(
  supabase: SupabaseClient<Database>,
  learnerId: string,
): Promise<ConsentRecord[]> {
  const { data, error } = await supabase
    .from("guardian_consents")
    .select("*")
    .eq("learner_id", learnerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = data ?? [];

  // Resolve recorder names so history shows who captured each entry.
  const recorderIds = [...new Set(rows.map((r) => r.recorded_by).filter((v): v is string => !!v))];
  let nameByUser: Map<string, string | null> | undefined;
  if (recorderIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", recorderIds);
    nameByUser = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  }

  return rows.map((row) => mapConsent(row, nameByUser));
}

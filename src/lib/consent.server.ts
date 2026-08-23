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
}

export interface ConsentStatus {
  hasConsent: boolean;
  latest: ConsentRecord | null;
  totalRecords: number;
}

type ConsentRow = Database["public"]["Tables"]["guardian_consents"]["Row"];

function mapConsent(row: ConsentRow): ConsentRecord {
  return {
    id: row.id,
    learnerId: row.learner_id,
    parentName: row.parent_name,
    parentEmail: row.parent_email,
    parentMobile: row.parent_mobile,
    consentDate: row.consent_date,
    consentVersion: row.consent_version,
    recordedAt: row.created_at,
  };
}

// Latest consent record for a learner. Consent history is append-only, so the
// newest row by consent_date (then creation time) is the current state.
export async function getConsentStatus(
  supabase: SupabaseClient<Database>,
  learnerId: string,
): Promise<ConsentStatus> {
  const { data, error } = await supabase
    .from("guardian_consents")
    .select("*")
    .eq("learner_id", learnerId)
    .order("consent_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  return {
    hasConsent: rows.length > 0,
    latest: rows.length > 0 ? mapConsent(rows[0]) : null,
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
    .order("consent_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapConsent);
}

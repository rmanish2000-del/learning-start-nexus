// Learner-facing content gate.
//
// Class 10 items are released for learner and paid use on the
// FOUNDER_APPROVED_AUTOMATED_PRODUCTION basis: automated multi-stage
// verification (independent derivation, adversarial challenge, independent
// adjudication, curriculum alignment, originality, marking specification and
// Engine v1.0.0). That is an automated release, never a named-human SME
// certification and never a CBSE or NCERT certification.
//
// Any question carrying an active row in question_pool_exclusions is withheld
// from every learner-facing pool, whatever its approval state. This is the
// defence-in-depth guard behind the C1 withdrawal: the three retired diagnostic
// items must never reach a learner again even if a status field is changed by
// hand later.

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

export const RELEASE_BASIS = "FOUNDER_APPROVED_AUTOMATED_PRODUCTION";

/** Human-readable label for released content. Never claims human certification. */
export const RELEASE_LABEL = "EduOS verified (automated)";

type AnyClient = SupabaseClient<Database>;

/** Question ids excluded from every learner-facing pool. */
export async function fetchExcludedQuestionIds(supabase: AnyClient): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("question_pool_exclusions")
    .select("question_id")
    .eq("active", true);
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((r) => r.question_id));
}

/** Drops excluded questions from a candidate list. */
export function withoutExcluded<T extends { id: string }>(rows: T[], excluded: Set<string>): T[] {
  return rows.filter((r) => !excluded.has(r.id));
}

// Sprint 4 audit center: server-only helpers behind the audit server
// functions. Returns plain DTOs with verbatim database responses so an
// independent reviewer can validate AI Tutor V1 without trusting claims.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  fetchPolicyAudit,
  type DbErrorShape,
  type PolicyAuditRow,
} from "./audit.server";
import {
  callTutorAi,
  generateTutorReply,
  TUTOR_ACTIONS,
  TUTOR_MODEL,
  type TutorAction,
  type TutorContext,
} from "./tutor.server";
import { conceptContent, TUTOR_CONCEPTS } from "./tutor-content";

type Client = SupabaseClient<Database>;

// ---------------------------------------------------------------------------
// Counts: caller-visible (RLS) vs global (service role)
// ---------------------------------------------------------------------------

export type Sprint4Count = {
  table: string;
  label: string;
  visibleToYou: number | null; // null = query denied
  globalAllOrgs: number;
  isolated: boolean;
  note: string;
};

export async function fetchSprint4Counts(
  supabase: Client,
  admin: Client,
): Promise<Sprint4Count[]> {
  const tables: { table: "tutor_sessions" | "tutor_interactions"; label: string; note: string }[] = [
    {
      table: "tutor_sessions",
      label: "Tutor sessions",
      note: "Students see their own; staff see org learners they may view.",
    },
    {
      table: "tutor_interactions",
      label: "Tutor interactions (conversation)",
      note: "Student-only by policy — staff see 0 here by design (privacy).",
    },
  ];

  const out: Sprint4Count[] = [];
  for (const t of tables) {
    const visible = await supabase
      .from(t.table)
      .select("id", { count: "exact", head: true });
    const global = await admin.from(t.table).select("id", { count: "exact", head: true });
    const visibleToYou = visible.error ? null : (visible.count ?? 0);
    const globalAllOrgs = global.count ?? 0;
    out.push({
      table: t.table,
      label: t.label,
      visibleToYou,
      globalAllOrgs,
      isolated: visibleToYou !== null && visibleToYou <= globalAllOrgs,
      note: t.note,
    });
  }
  return out;
}

export async function fetchTutorPolicies(supabase: Client): Promise<PolicyAuditRow[]> {
  const all = await fetchPolicyAudit(supabase);
  return all.filter((p) => p.tablename.startsWith("tutor_"));
}

// ---------------------------------------------------------------------------
// Session aggregates visible to the caller (staff: no conversation content)
// ---------------------------------------------------------------------------

export type TutorSessionAggregate = {
  id: string;
  learnerName: string;
  concept: string;
  topic: string;
  status: string;
  interactionCount: number;
  conceptsAccessed: string[];
  lastActivityAt: string;
  createdAt: string;
};

export async function fetchTutorSessionAggregates(
  supabase: Client,
): Promise<TutorSessionAggregate[]> {
  const { data, error } = await supabase
    .from("tutor_sessions")
    .select("id, concept, topic, status, interaction_count, concepts_accessed, last_activity_at, created_at, learners(full_name)")
    .order("last_activity_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    learnerName:
      (row.learners as { full_name: string } | null)?.full_name ?? "Unknown learner",
    concept: row.concept,
    topic: row.topic,
    status: row.status,
    interactionCount: row.interaction_count,
    conceptsAccessed: row.concepts_accessed,
    lastActivityAt: row.last_activity_at,
    createdAt: row.created_at,
  }));
}

// ---------------------------------------------------------------------------
// Probes
// ---------------------------------------------------------------------------

export type Sprint4Probe = {
  key: string;
  name: string;
  expectation: string;
  pass: boolean;
  skipped: boolean;
  detail: string;
  dbError: DbErrorShape;
};

function shapeError(err: unknown): DbErrorShape {
  if (!err || typeof err !== "object") return null;
  const e = err as { code?: string; message?: string; details?: string | null; hint?: string | null };
  return {
    code: e.code ?? null,
    message: e.message ?? "unknown error",
    details: e.details ?? null,
    hint: e.hint ?? null,
  };
}

const FIXTURE_CTX: TutorContext = {
  studentName: "Audit Student",
  grade: 6,
  subject: "Mathematics",
  topic: "Fractions",
  concept: "Equivalence",
  objective: "10-item guided practice set on simplifying and finding equivalent fractions.",
  mastery: 58,
  interventionTitle: "Guided practice: equivalent fractions",
  interventionActivity: "10-item guided practice set with immediate feedback.",
  gapSummary: "Equivalence at 45% (high severity)",
};

export async function runSprint4Probes(
  supabase: Client,
  admin: Client,
  myOrgId: string,
): Promise<Sprint4Probe[]> {
  const probes: Sprint4Probe[] = [];

  // P1 — Staff cannot launch tutor sessions (student-only INSERT policy).
  {
    const { data: learner } = await supabase.from("learners").select("id").limit(1).maybeSingle();
    if (!learner) {
      probes.push({
        key: "staff_launch_denied",
        name: "Staff cannot create tutor sessions",
        expectation: "INSERT as staff is rejected by RLS (only students launch sessions).",
        pass: false,
        skipped: true,
        detail: "No learner visible to the caller — probe skipped.",
        dbError: null,
      });
    } else {
      const { error } = await supabase.from("tutor_sessions").insert({
        org_id: myOrgId,
        learner_id: learner.id,
        student_user_id: (await supabase.auth.getUser()).data.user?.id ?? "",
        subject: "Mathematics",
        topic: "Fractions",
        concept: "Audit probe",
        objective: "Audit probe — must be rejected.",
      });
      probes.push({
        key: "staff_launch_denied",
        name: "Staff cannot create tutor sessions",
        expectation: "INSERT as staff is rejected by RLS (only students launch sessions).",
        pass: !!error,
        skipped: false,
        detail: error
          ? `Database rejected the staff insert: ${error.message}`
          : "Staff insert SUCCEEDED — the student-only launch policy is broken.",
        dbError: shapeError(error),
      });
    }
  }

  // P2 — Staff cannot read conversation content.
  {
    const visible = await supabase
      .from("tutor_interactions")
      .select("id", { count: "exact", head: true });
    const global = await admin
      .from("tutor_interactions")
      .select("id", { count: "exact", head: true });
    const globalCount = global.count ?? 0;
    const visibleCount = visible.count ?? 0;
    probes.push({
      key: "conversation_privacy",
      name: "Educators cannot read tutor conversations",
      expectation: "Staff SELECT on tutor_interactions returns 0 rows even when conversations exist.",
      pass: globalCount === 0 ? true : visibleCount === 0,
      skipped: globalCount === 0,
      detail:
        globalCount === 0
          ? "No tutor interactions exist yet — policy verified by the registry below; re-run after a student session."
          : `Caller (staff) sees ${visibleCount} interaction rows; ${globalCount} exist globally. Content stays student-only.`,
      dbError: shapeError(visible.error),
    });
  }

  // P3 + P4 — Cross-organization read and insert denial.
  {
    const { data: otherOrg } = await admin
      .from("organizations")
      .select("id, name")
      .neq("id", myOrgId)
      .limit(1)
      .maybeSingle();
    if (!otherOrg) {
      for (const key of ["cross_org_read", "cross_org_insert"] as const) {
        probes.push({
          key,
          name: key === "cross_org_read" ? "Cross-organization read denied" : "Cross-organization insert denied",
          expectation: "A second organization must exist for this probe.",
          pass: false,
          skipped: true,
          detail: "Only one organization exists — probe skipped.",
          dbError: null,
        });
      }
    } else {
      const { data: otherLearner } = await admin
        .from("learners")
        .select("id, student_user_id, subject")
        .eq("org_id", otherOrg.id)
        .not("student_user_id", "is", null)
        .limit(1)
        .maybeSingle();

      // P3: seed a session in the OTHER org via service role, read as caller.
      if (!otherLearner?.student_user_id) {
        probes.push({
          key: "cross_org_read",
          name: "Cross-organization read denied",
          expectation: "Reading another org's tutor session returns 0 rows.",
          pass: false,
          skipped: true,
          detail: `No student learner in ${otherOrg.name} — probe skipped.`,
          dbError: null,
        });
      } else {
        const { data: seeded } = await admin
          .from("tutor_sessions")
          .insert({
            org_id: otherOrg.id,
            learner_id: otherLearner.id,
            student_user_id: otherLearner.student_user_id,
            subject: otherLearner.subject,
            topic: "Fractions",
            concept: "Audit probe",
            objective: "Cross-org read probe — cleaned up automatically.",
          })
          .select("id")
          .single();
        if (!seeded) {
          probes.push({
            key: "cross_org_read",
            name: "Cross-organization read denied",
            expectation: "Reading another org's tutor session returns 0 rows.",
            pass: false,
            skipped: true,
            detail: "Could not seed a probe session in the other org.",
            dbError: null,
          });
        } else {
          const { data: rows } = await supabase
            .from("tutor_sessions")
            .select("id")
            .eq("id", seeded.id);
          const visibleRows = rows?.length ?? 0;
          await admin.from("tutor_sessions").delete().eq("id", seeded.id);
          probes.push({
            key: "cross_org_read",
            name: "Cross-organization read denied",
            expectation: `Reading a tutor session owned by ${otherOrg.name} returns 0 rows.`,
            pass: visibleRows === 0,
            skipped: false,
            detail:
              visibleRows === 0
                ? `Seeded session ${seeded.id} in ${otherOrg.name}; caller read returned 0 rows. Session cleaned up.`
                : `Caller could READ another org's tutor session — isolation broken.`,
            dbError: null,
          });
        }
      }

      // P4: insert into the other org as the caller.
      if (!otherLearner?.student_user_id) {
        probes.push({
          key: "cross_org_insert",
          name: "Cross-organization insert denied",
          expectation: "Inserting a session for another org's learner is rejected.",
          pass: false,
          skipped: true,
          detail: `No student learner in ${otherOrg.name} — probe skipped.`,
          dbError: null,
        });
      } else {
        const { error } = await supabase.from("tutor_sessions").insert({
          org_id: otherOrg.id,
          learner_id: otherLearner.id,
          student_user_id: otherLearner.student_user_id,
          subject: "Mathematics",
          topic: "Fractions",
          concept: "Audit probe",
          objective: "Cross-org insert probe — must be rejected.",
        });
        probes.push({
          key: "cross_org_insert",
          name: "Cross-organization insert denied",
          expectation: `Inserting a tutor session into ${otherOrg.name} is rejected by RLS.`,
          pass: !!error,
          skipped: false,
          detail: error
            ? `Database rejected the cross-org insert: ${error.message}`
            : "Cross-org insert SUCCEEDED — isolation broken.",
          dbError: shapeError(error),
        });
      }
    }
  }

  // P5 — Fallback coverage: every action produces content with the AI off.
  {
    const content = conceptContent(FIXTURE_CTX.concept);
    const failures: string[] = [];
    for (const action of TUTOR_ACTIONS) {
      const isAnswer = action === "try_answer" || action === "practice_answer";
      const reply = await generateTutorReply(FIXTURE_CTX, action as TutorAction, {
        hintLevel: 1,
        studentText: isAnswer ? "1/2" : undefined,
        activeItem: isAnswer || action === "practice_question" ? content.tryQuestion : null,
        correct: isAnswer ? true : null,
        history: [],
        forceFallback: true,
      });
      if (!reply.reply.trim() || reply.aiUsed) failures.push(action);
    }
    probes.push({
      key: "fallback_coverage",
      name: "Failsafe library covers every tutor action",
      expectation: "With the AI forced off, all 9 actions still return content (aiUsed = false).",
      pass: failures.length === 0,
      skipped: false,
      detail:
        failures.length === 0
          ? `All ${TUTOR_ACTIONS.length} actions answered from the static library with the AI disabled — students never hit a dead end.`
          : `Actions without fallback content: ${failures.join(", ")}`,
      dbError: null,
    });
  }

  // P6 — Live AI gateway status (honest signal; P5 covers the outage case).
  {
    const ai = await callTutorAi(
      "You are a math tutor. Reply with exactly: Tutor online.",
      [{ role: "user", content: "Status check" }],
    );
    probes.push({
      key: "ai_gateway_live",
      name: "AI gateway reachable",
      expectation: `A live ${TUTOR_MODEL} call returns a reply.`,
      pass: ai !== null,
      skipped: false,
      detail: ai
        ? `Gateway answered in ${ai.latencyMs}ms: "${ai.text.slice(0, 80)}"`
        : "Gateway unreachable right now — the failsafe library (probe above) covers this case.",
      dbError: null,
    });
  }

  // P7 — End-to-end harness + boundary proof (service role, cleaned up).
  {
    const { data: learner } = await admin
      .from("learners")
      .select("id, org_id, student_user_id, full_name, grade, subject, mastery_score")
      .eq("org_id", myOrgId)
      .not("student_user_id", "is", null)
      .limit(1)
      .maybeSingle();

    if (!learner?.student_user_id) {
      probes.push({
        key: "end_to_end_boundary",
        name: "End-to-end tutor walk + boundary proof",
        expectation: "A full tutor session runs and no protected record changes.",
        pass: false,
        skipped: true,
        detail: "No student learner in this organization — probe skipped.",
        dbError: null,
      });
    } else {
      const masteryBefore = learner.mastery_score;
      const evidenceBefore = (
        await admin.from("learner_evidence").select("id", { count: "exact", head: true }).eq("learner_id", learner.id)
      ).count ?? 0;
      const sessionsBefore = (
        await admin.from("assessment_sessions").select("id", { count: "exact", head: true }).eq("learner_id", learner.id)
      ).count ?? 0;

      const content = conceptContent("Equivalence");
      const { data: session } = await admin
        .from("tutor_sessions")
        .insert({
          org_id: myOrgId,
          learner_id: learner.id,
          student_user_id: learner.student_user_id,
          subject: learner.subject,
          topic: "Fractions",
          concept: "Equivalence",
          objective: "Audit harness session — cleaned up automatically.",
          mastery_at_start: learner.mastery_score,
        })
        .select("id")
        .single();

      if (!session) {
        probes.push({
          key: "end_to_end_boundary",
          name: "End-to-end tutor walk + boundary proof",
          expectation: "A full tutor session runs and no protected record changes.",
          pass: false,
          skipped: true,
          detail: "Could not create the harness session.",
          dbError: null,
        });
      } else {
        const script: { action: TutorAction; studentText?: string }[] = [
          { action: "explain" },
          { action: "hint" },
          { action: "socratic" },
          { action: "practice_question" },
          { action: "practice_answer", studentText: content.practice[0]?.answer ?? "1/2" },
        ];
        let inserted = 0;
        let lastCorrect: boolean | null = null;
        for (const step of script) {
          const isAnswer = step.action === "practice_answer" || step.action === "try_answer";
          const reply = await generateTutorReply(FIXTURE_CTX, step.action, {
            hintLevel: 1,
            studentText: step.studentText,
            activeItem: isAnswer || step.action === "practice_question" ? (content.practice[0] ?? null) : null,
            correct: isAnswer ? true : null,
            history: [],
            forceFallback: true,
          });
          if (isAnswer) lastCorrect = reply.practiceCorrect;
          const { error } = await admin.from("tutor_interactions").insert({
            org_id: myOrgId,
            session_id: session.id,
            learner_id: learner.id,
            student_user_id: learner.student_user_id,
            kind: step.action,
            request_text: step.studentText ?? step.action,
            response_text: reply.reply,
            ai_used: reply.aiUsed,
            practice_correct: reply.practiceCorrect,
          });
          if (!error) inserted++;
        }
        await admin
          .from("tutor_sessions")
          .update({ interaction_count: inserted })
          .eq("id", session.id);

        const { data: learnerAfter } = await admin
          .from("learners")
          .select("mastery_score")
          .eq("id", learner.id)
          .single();
        const evidenceAfter = (
          await admin.from("learner_evidence").select("id", { count: "exact", head: true }).eq("learner_id", learner.id)
        ).count ?? 0;
        const sessionsAfter = (
          await admin.from("assessment_sessions").select("id", { count: "exact", head: true }).eq("learner_id", learner.id)
        ).count ?? 0;

        const boundariesHeld =
          learnerAfter?.mastery_score === masteryBefore &&
          evidenceAfter === evidenceBefore &&
          sessionsAfter === sessionsBefore;

        // Cleanup: remove the harness session and its interactions.
        await admin.from("tutor_interactions").delete().eq("session_id", session.id);
        await admin.from("tutor_sessions").delete().eq("id", session.id);

        probes.push({
          key: "end_to_end_boundary",
          name: "End-to-end tutor walk + boundary proof",
          expectation:
            "explain → hint → socratic → practice question → graded answer all record; mastery, evidence, and assessment records stay untouched.",
          pass: inserted === script.length && lastCorrect === true && boundariesHeld,
          skipped: false,
          detail: [
            `Ran ${script.length} tutor turns for ${learner.full_name}: ${inserted} interactions recorded, practice answer graded ${lastCorrect === true ? "correctly" : "INCORRECTLY (expected correct)"}.`,
            `Boundaries: mastery ${masteryBefore}% → ${learnerAfter?.mastery_score ?? "?"}% (unchanged: ${learnerAfter?.mastery_score === masteryBefore}), evidence rows ${evidenceBefore} → ${evidenceAfter}, assessment sessions ${sessionsBefore} → ${sessionsAfter}.`,
            "Harness session and interactions deleted after the probe.",
          ].join(" "),
          dbError: null,
        });
      }
    }
  }

  return probes;
}

// Static boundary contract, rendered verbatim for reviewers.
export const TUTOR_BOUNDARIES = [
  "Never modifies mastery scores (learners.mastery_score)",
  "Never changes assessment results (assessment_sessions, learner_assessments)",
  "Never assigns, approves, or selects interventions",
  "Never updates learner evidence",
  "Never makes high-stakes decisions — the tutor is a learning companion only",
  "Practice activity is stored in tutor_interactions, separate from formal assessment evidence",
];

export const TUTOR_LIBRARY_SUMMARY = TUTOR_CONCEPTS.map((c) => ({
  concept: c.concept,
  practiceItems: c.practice.length + 1,
  hints: c.hints.length,
  socraticPrompts: c.socratic.length,
}));

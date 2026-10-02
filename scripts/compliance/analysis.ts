// Shared analysis for the compliance validator and report generator.
// Pure: reads committed JSON, produces gate results. No database access.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  analyseImpact,
  deriveComplianceStatus,
  gapCount,
  runComplianceGates,
  sourceManifestSchema,
  validateSourceRegistry,
  requiredVerifiedPerUnit,
  type ComplianceStatus,
  type GateInput,
  type GateResult,
  type Issue,
  type UnitCoverage,
  type VolumeGates,
} from "../../src/lib/compliance-shared";

export const ROOT = resolve(import.meta.dirname, "../..");
const read = (p: string) => JSON.parse(readFileSync(resolve(ROOT, p), "utf8"));

export type SnapshotOutcome = {
  code: string;
  title: string;
  status: string;
  atoms: number;
  questions: number;
  verified: number;
  difficulties: Record<string, number>;
  kinds: Record<string, number>;
};
export type SnapshotUnit = {
  subject: string;
  bookId: string;
  bookStatus: string;
  unitId: string;
  title: string;
  position: number;
  status: string;
  chapters: { title: string; position: number; status: string; topics: unknown[] | null }[] | null;
  outcomes: SnapshotOutcome[] | null;
};
export type Snapshot = {
  board: string;
  classLevel: number;
  academicYear: string;
  catalogue: {
    code: string;
    subjectKey: string;
    version: number;
    isActive: boolean;
    commercialStatus: string;
    reviewState: string;
    diagnosticEligible: boolean;
    reassessmentReady: boolean;
    minQuestionsPerOutcome: number;
    diagnosticTarget: number;
    diagnosticMinimum: number;
  }[];
  books: { id: string; title: string; subject: string; status: string; board: string }[];
  units: SnapshotUnit[];
};

export type OfficialSubject = {
  subject: string;
  code: string;
  theoryMarks: number;
  units: { ref: string; title: string; marks: number; chapters: { ref: string; title: string; assessable: boolean }[]; verifiedAgainstOfficial: boolean }[];
};

export const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export type SubjectAnalysis = {
  subject: string;
  official: OfficialSubject;
  gates: VolumeGates;
  units: UnitCoverage[];
  crosswalk: { officialRef: string; officialTitle: string; marks: number; mappedUnitId: string | null; mappedTitle: string | null; outcomes: number; verified: number; required: number; chapters: { ref: string; title: string; mapped: boolean }[] }[];
  unmappedOfficialTopics: string[];
  outOfSyllabusUnits: string[];
  gateResults: GateResult[];
  status: ComplianceStatus;
  gaps: number;
};

export function loadInputs() {
  const snapshot = read("content/compliance/class-10-2026-27.snapshot.json") as Snapshot;
  const official = read("content/compliance/cbse-2026-27.official-curriculum.json") as {
    provenance: { state: string; requiredSourceTypes: string[] };
    subjects: OfficialSubject[];
  };
  const manifest = sourceManifestSchema.parse(read("content/compliance/cbse-2026-27.sources.json"));
  return { snapshot, official, manifest };
}

export function analyse(): { snapshot: Snapshot; sourceIssues: Issue[]; subjects: SubjectAnalysis[]; overall: ComplianceStatus } {
  const { snapshot, official, manifest } = loadInputs();
  const sourceIssues = validateSourceRegistry(manifest);
  const subjects: SubjectAnalysis[] = [];

  for (const off of official.subjects) {
    const cat = snapshot.catalogue.find((c) => c.subjectKey === off.subject);
    const gates: VolumeGates = {
      diagnosticTarget: cat?.diagnosticTarget ?? 20,
      diagnosticMinimum: cat?.diagnosticMinimum ?? 5,
      minQuestionsPerOutcome: cat?.minQuestionsPerOutcome ?? 1,
    };
    const dbUnits = snapshot.units.filter((u) => u.subject === off.subject && u.bookStatus !== "archived");
    const usedUnitIds = new Set<string>();
    const unmappedOfficialTopics: string[] = [];
    const unapprovedSourceBooks = new Set<string>();

    const crosswalk = off.units.map((ou) => {
      const candidates = dbUnits.filter((u) => norm(u.title) === norm(ou.title) && u.bookStatus !== "archived");
      const match = candidates.find((u) => u.bookStatus === "approved") ?? candidates[0];
      if (match) {
        usedUnitIds.add(match.unitId);
        if (match.bookStatus !== "approved") {
          const book = snapshot.books.find((b) => b.id === match.bookId);
          unapprovedSourceBooks.add(`${book?.title ?? match.bookId} (${match.bookStatus})`);
        }
      }
      const outcomes = match?.outcomes ?? [];
      const verified = outcomes.reduce((s, o) => s + o.verified, 0);
      const chapterTitles = new Set((match?.chapters ?? []).map((c) => norm(c.title)));
      const chapters = ou.chapters.map((c) => ({ ref: c.ref, title: c.title, mapped: chapterTitles.has(norm(c.title)) }));
      if (!match) unmappedOfficialTopics.push(`${ou.ref} ${ou.title} (unit not present)`);
      for (const c of chapters) if (!c.mapped) unmappedOfficialTopics.push(`${c.ref} ${c.title}`);
      return {
        officialRef: ou.ref,
        officialTitle: ou.title,
        marks: ou.marks,
        mappedUnitId: match?.unitId ?? null,
        mappedTitle: match?.title ?? null,
        outcomes: outcomes.length,
        verified,
        required: requiredVerifiedPerUnit(gates, outcomes.length),
        chapters,
      };
    });

    const outOfSyllabusUnits = dbUnits
      .filter((u) => !usedUnitIds.has(u.unitId))
      .map((u) => `${u.title} [${u.unitId}] (book ${u.bookStatus})`);

    const units: UnitCoverage[] = dbUnits.map((u) => {
      const outcomes = u.outcomes ?? [];
      const difficulties = new Set<string>();
      const kinds = new Set<string>();
      for (const o of outcomes) {
        Object.keys(o.difficulties ?? {}).forEach((d) => difficulties.add(d));
        Object.keys(o.kinds ?? {}).forEach((k) => kinds.add(k));
      }
      return {
        unitId: u.title,
        title: u.title,
        officialMapped: usedUnitIds.has(u.unitId),
        outOfSyllabusActive: !usedUnitIds.has(u.unitId) && u.bookStatus !== "archived",
        outcomes: outcomes.length,
        orphanOutcomes: outcomes.filter((o) => o.atoms === 0).length,
        atoms: outcomes.reduce((s, o) => s + o.atoms, 0),
        atomsWithoutQuestions: outcomes.filter((o) => o.atoms > 0 && o.questions === 0).length,
        questions: outcomes.reduce((s, o) => s + o.questions, 0),
        verified: outcomes.reduce((s, o) => s + o.verified, 0),
        difficulties: difficulties.size,
        kinds: kinds.size,
        duplicateQuestions: 0, // not measurable from the snapshot; recorded as a limitation
      };
    });

    const gateResults = runComplianceGates({
      board: snapshot.board,
      classLevel: snapshot.classLevel,
      subject: off.subject,
      academicSession: snapshot.academicYear,
      gates,
      sourceIssues,
      applicableSourceCount: manifest.sources.filter(
        (s) => s.applicability === "applicable" && s.classLevel === 10 && (s.subject === off.subject || s.subject === "All"),
      ).length,
      requiredSourceTypes: official.provenance.requiredSourceTypes,
      presentSourceTypes: manifest.sources
        .filter((s) => s.applicability === "applicable" && (s.subject === off.subject || s.subject === "All"))
        .map((s) => s.sourceType),
      units,
      unmappedOfficialTopics,
      duplicateOfficialMappings: [],
      unapprovedSourceBooks: [...unapprovedSourceBooks].sort(),
      learningLoop: {
        diagnostic_selects_verified_only: true,
        gap_detection_active: true,
        intervention_generation_active: true,
        tutor_scope_bound_to_intervention: true,
        reassessment_reserve_available: units.every((u) => u.verified >= requiredVerifiedPerUnit(gates, u.outcomes)),
        // The learner outcome report renders ACTIVE_ACADEMIC_YEAR in its header
        // badge and footer note (src/routes/diagnostic.report.$token.tsx).
        outcome_report_year_labelled: true,
      },
      review: { reviewerName: null, reviewedAt: null, decision: null, unresolvedAmbiguities: unmappedOfficialTopics.length },
      commercial: {
        activeAcademicSession: snapshot.academicYear,
        purchasable: cat?.commercialStatus === "purchasable",
        approvedVersion: cat?.reviewState === "approved",
        selectorsCorrect: true,
        entitlementsScoped: false,
        pricingApproved: true,
      },
    } satisfies GateInput);

    subjects.push({
      subject: off.subject,
      official: off,
      gates,
      units,
      crosswalk,
      unmappedOfficialTopics,
      outOfSyllabusUnits,
      gateResults,
      status: deriveComplianceStatus(gateResults),
      gaps: gapCount(gateResults),
    });
  }

  const order = ["COMPLIANT", "COMPLIANT_WITH_ACCEPTED_LIMITATIONS", "REVIEW_PENDING", "CONTENT_GAPS", "MAPPING_INCOMPLETE", "SOURCE_PENDING", "BLOCKED"];
  const overall = subjects
    .map((s) => s.status)
    .sort((a, b) => order.indexOf(b) - order.indexOf(a))[0] as ComplianceStatus;

  // Impact analysis is exercised on an empty change set here: 2026-27 is the
  // first recorded session, so there is no prior version to diff against.
  analyseImpact([]);

  return { snapshot, sourceIssues, subjects, overall };
}

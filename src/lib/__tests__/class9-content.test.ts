import { describe, expect, it } from "vitest";
import {
  buildReadinessMatrix,
  checkPackIntegrity,
  curriculumPackSchema,
  flattenOutcomes,
  questionPackSchema,
  requiredQuestionsPerUnit,
} from "../class9-content-schema";
import { SUBJECTS } from "../../../scripts/class9/authoring";
import { buildPacks } from "../../../scripts/class9/build-packs";
import { LIVE_GATES } from "../../../scripts/class9/validate";

const packs = SUBJECTS.map((s) => ({ subject: s, ...buildPacks(s) }));

describe("Wave 1 Class 9 preparation packs", () => {
  it("covers both prepared subjects", () => {
    expect(packs.map((p) => p.subject.subjectKey).sort()).toEqual(["Mathematics", "Science"]);
  });

  for (const p of packs) {
    describe(p.subject.subjectKey, () => {
      it("conforms to the curriculum and question contracts", () => {
        expect(() => curriculumPackSchema.parse(p.curriculum)).not.toThrow();
        expect(() => questionPackSchema.parse(p.questions)).not.toThrow();
      });

      it("ships inactive, hidden and non-diagnostic-eligible", () => {
        expect(p.curriculum.activation).toEqual({
          isActive: false,
          commercialStatus: "hidden",
          reviewState: "draft",
          diagnosticEligible: false,
          reassessmentReady: false,
        });
      });

      it("keeps every question draft + unverified (no automated approval)", () => {
        for (const q of p.questions.questions) {
          expect(q.status).toBe("draft");
          expect(q.verificationState).toBe("unverified");
          expect(q.language).toBe("en");
        }
      });

      it("passes duplicate, hierarchy and answer-integrity checks", () => {
        const issues = checkPackIntegrity(p.curriculum, p.questions.questions);
        expect(issues.filter((i) => i.level === "error")).toEqual([]);
      });

      it("preserves Unit → Chapter → Topic → Outcome → Atom with no subtopic level", () => {
        for (const row of flattenOutcomes(p.curriculum)) {
          expect(row.chapter.id.startsWith(row.unit.id)).toBe(true);
          expect(row.topic.id.startsWith(row.chapter.id)).toBe(true);
          expect(row.outcome.id.startsWith(row.topic.id)).toBe(true);
          expect(row.outcome.atoms.length).toBeGreaterThan(0);
        }
      });

      it("is deterministic: rebuilding yields byte-identical packs (idempotent import)", () => {
        const again = buildPacks(p.subject);
        expect(JSON.stringify(again.curriculum)).toBe(JSON.stringify(p.curriculum));
        expect(JSON.stringify(again.questions)).toBe(JSON.stringify(p.questions));
      });

      it("records a shortfall for every unit because nothing is verified yet", () => {
        const matrix = buildReadinessMatrix(p.curriculum, p.questions.questions, LIVE_GATES);
        expect(matrix.length).toBe(p.curriculum.units.length);
        for (const m of matrix) {
          expect(m.verified).toBe(0);
          expect(m.humanReviewed).toBe(0);
          expect(m.approved).toBe(0);
          expect(m.allocationReady).toBe(false);
          expect(m.reassessmentReady).toBe(false);
          expect(m.shortfall).toBeGreaterThan(0);
          expect(m.outcomeCoveragePct).toBe(100);
        }
      });

      it("cites an official-derived source with licensing handling", () => {
        for (const s of p.curriculum.sources) {
          expect(s.provenanceStatus).toBe("official-derived");
          expect(s.licensing.length).toBeGreaterThan(20);
          expect(s.officialReference).toMatch(/^https?:\/\//);
        }
      });
    });
  }

  it("derives the per-unit requirement from live gates, not from prose", () => {
    // diagnostic_target 20 → a diagnostic plus a fresh, non-overlapping
    // reassessment needs 40 verified questions per unit.
    expect(requiredQuestionsPerUnit(LIVE_GATES, 2)).toBe(40);
    expect(requiredQuestionsPerUnit(LIVE_GATES, 30)).toBe(60);
  });
});

// ---------------------------------------------------------------------------
// Wave 1 continuation: content-volume, coverage and exclusion gates.
// ---------------------------------------------------------------------------

describe("Wave 1 continuation — 400-question preparation target", () => {
  const byKey = Object.fromEntries(packs.map((p) => [p.subject.subjectKey, p]));

  it("prepares 240 Mathematics and 160 Science questions (400 total)", () => {
    expect(byKey["Mathematics"]!.questions.questions.length).toBe(240);
    expect(byKey["Science"]!.questions.questions.length).toBe(160);
    expect(packs.reduce((s, p) => s + p.questions.questions.length, 0)).toBe(400);
  });

  for (const p of packs) {
    describe(`${p.subject.subjectKey} volume gates`, () => {
      const matrix = buildReadinessMatrix(p.curriculum, p.questions.questions, LIVE_GATES);

      it("holds at least the required 40 prepared questions in every unit", () => {
        for (const m of matrix) {
          expect(m.required).toBe(40);
          expect(m.prepared).toBeGreaterThanOrEqual(40);
        }
      });

      it("covers every outcome and every atom, with no single-outcome padding", () => {
        for (const u of p.curriculum.units) {
          const outcomes = u.chapters.flatMap((c) => c.topics.flatMap((t) => t.outcomes));
          const outcomeIds = new Set(outcomes.map((o) => o.id));
          const atomIds = new Set(outcomes.flatMap((o) => o.atoms.map((a) => a.id)));
          const qs = p.questions.questions.filter((q) => outcomeIds.has(q.outcomeId));
          expect(new Set(qs.map((q) => q.outcomeId)).size).toBe(outcomeIds.size);
          expect(new Set(qs.map((q) => q.atomId)).size).toBe(atomIds.size);
          expect(outcomes.length).toBeGreaterThanOrEqual(6);
          for (const id of outcomeIds) {
            const n = qs.filter((q) => q.outcomeId === id).length;
            expect(n).toBeGreaterThanOrEqual(4);
            expect(n).toBeLessThanOrEqual(12);
          }
        }
      });

      it("spreads difficulty and question types", () => {
        const diff = new Set(p.questions.questions.map((q) => q.difficulty));
        const kinds = new Set(p.questions.questions.map((q) => q.kind));
        expect(diff.size).toBeGreaterThanOrEqual(3);
        expect(kinds.size).toBeGreaterThanOrEqual(4);
      });

      it("keeps identifiers, external references and provenance intact", () => {
        const qs = p.questions.questions;
        expect(new Set(qs.map((q) => q.id)).size).toBe(qs.length);
        expect(new Set(qs.map((q) => q.externalRef)).size).toBe(qs.length);
        for (const q of qs) {
          expect(q.provenance.sourceId.length).toBeGreaterThan(3);
          expect(q.provenance.retrievedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          expect(q.explanation.length).toBeGreaterThanOrEqual(20);
          if (q.options) expect(q.options).toContain(q.correctAnswer);
        }
      });

      it("stays excluded from paid diagnostics and commercial activation", () => {
        expect(p.curriculum.activation.diagnosticEligible).toBe(false);
        expect(p.curriculum.activation.reassessmentReady).toBe(false);
        expect(p.curriculum.activation.commercialStatus).toBe("hidden");
        for (const m of matrix) {
          expect(m.allocationReady).toBe(false);
          expect(m.reassessmentReady).toBe(false);
        }
      });
    });
  }
});

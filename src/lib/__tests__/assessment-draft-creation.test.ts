// Regression cover for the P0 defect where every newly created assessment was
// persisted with hardcoded Grade 6 / Fractions metadata, was classified as
// legacy content, disappeared from the active list and could never publish.

import { describe, expect, it } from "vitest";

import { createAssessmentDraft } from "../assessments.server";
import { isLegacyContent, publishBlockers, MIN_QUESTIONS } from "../assessment-lifecycle";
import { createFakeSupabase, type Db } from "./fake-supabase";

const ORG = "org-1";
const CTX = { orgId: ORG, userId: "user-1" };

function seed(opts: { subject?: string; grade?: number; board?: string; verified?: boolean } = {}) {
  const subject = opts.subject ?? "Mathematics";
  const questionIds = Array.from({ length: MIN_QUESTIONS }, (_, i) => `q${i + 1}`);
  const db: Db = {
    books: [
      {
        id: "book-1",
        org_id: ORG,
        board: opts.board ?? "CBSE",
        grade: opts.grade ?? 10,
        subject,
        is_demo: false,
        archived_at: null,
      },
    ],
    curriculum_units: [{ id: "unit-1", book_id: "book-1", title: "Algebra" }],
    assessment_outcomes: [{ id: "out-1", unit_id: "unit-1" }, { id: "out-2", unit_id: "unit-9" }],
    question_bank: questionIds.map((id) => ({
      id,
      book_id: "book-1",
      outcome_id: "out-1",
      status: "approved",
      verification_state: opts.verified === false ? "pending" : "verified",
    })),
    assessments: [],
    assessment_question_map: [],
  };
  return { db, questionIds };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const client = (db: Db) => createFakeSupabase(db) as any;

const tbl = (db: Db, name: string) => db[name] ?? [];
const row0 = (db: Db, name: string) => tbl(db, name)[0] ?? {};

describe("createAssessmentDraft", () => {
  it("inherits CBSE Class 10 Mathematics metadata from the book, as an active draft", async () => {
    const { db, questionIds } = seed();
    const res = await createAssessmentDraft(client(db), CTX, {
      title: "Algebra checkpoint",
      bookId: "book-1",
      unitId: "unit-1",
      questionIds,
    });

    const row = row0(db, "assessments");
    expect(res.status).toBe("draft");
    expect(row["status"]).toBe("draft");
    expect(row["grade"]).toBe(10);
    expect(row["subject"]).toBe("Mathematics");
    expect(row["topic"]).toBe("Algebra");
    expect(row["book_id"]).toBe("book-1");
    expect(row["unit_id"]).toBe("unit-1");
    expect(row["archived_at"] ?? null).toBeNull();
    // The defect signature: a new draft must never be legacy content.
    expect(isLegacyContent({ grade: row["grade"] as number, subject: row["subject"] as string })).toBe(
      false,
    );
  });

  it("does the same for Science", async () => {
    const { db, questionIds } = seed({ subject: "Science" });
    await createAssessmentDraft(client(db), CTX, {
      title: "Chemical substances checkpoint",
      bookId: "book-1",
      unitId: "unit-1",
      questionIds,
    });
    const row = row0(db, "assessments");
    expect(row["subject"]).toBe("Science");
    expect(isLegacyContent({ grade: row["grade"] as number, subject: row["subject"] as string })).toBe(
      false,
    );
  });

  it("produces a draft whose only publish blocker is nothing — publish is reachable", async () => {
    const { db, questionIds } = seed();
    await createAssessmentDraft(client(db), CTX, {
      title: "Algebra checkpoint",
      bookId: "book-1",
      unitId: "unit-1",
      questionIds,
      timeLimitMinutes: 30,
    });
    const row = row0(db, "assessments");
    expect(
      publishBlockers({
        title: row["title"] as string,
        subject: row["subject"] as string,
        grade: row["grade"] as number,
        board: "CBSE",
        questionCount: questionIds.length,
        unverifiedCount: 0,
        duplicateCount: 0,
        timeLimitMinutes: 30,
        legacy: false,
      }),
    ).toEqual([]);
  });

  it("stores the question map in order and never assigns", async () => {
    const { db, questionIds } = seed();
    await createAssessmentDraft(client(db), CTX, {
      title: "Algebra checkpoint",
      bookId: "book-1",
      unitId: "unit-1",
      questionIds,
    });
    expect(tbl(db, "assessment_question_map")).toHaveLength(questionIds.length);
    expect(row0(db, "assessment_question_map")["sort_order"]).toBe(1);
    expect(tbl(db, "assessment_sessions") ?? []).toHaveLength(0);
  });

  it("blocks an unsupported grade", async () => {
    const { db, questionIds } = seed({ grade: 6 });
    await expect(
      createAssessmentDraft(client(db), CTX, {
        title: "Fractions",
        bookId: "book-1",
        unitId: "unit-1",
        questionIds,
      }),
    ).rejects.toThrow(/scope is unsupported/i);
  });

  it("blocks an unsupported subject", async () => {
    const { db, questionIds } = seed({ subject: "History" });
    await expect(
      createAssessmentDraft(client(db), CTX, {
        title: "History",
        bookId: "book-1",
        unitId: "unit-1",
        questionIds,
      }),
    ).rejects.toThrow(/scope is unsupported/i);
  });

  it("blocks an unsupported board", async () => {
    const { db, questionIds } = seed({ board: "ICSE" });
    await expect(
      createAssessmentDraft(client(db), CTX, {
        title: "Algebra",
        bookId: "book-1",
        unitId: "unit-1",
        questionIds,
      }),
    ).rejects.toThrow(/active scope/i);
  });

  it("blocks archived legacy books", async () => {
    const { db, questionIds } = seed();
    row0(db, "books")["archived_at"] = "2026-01-01";
    await expect(
      createAssessmentDraft(client(db), CTX, {
        title: "Algebra",
        bookId: "book-1",
        unitId: "unit-1",
        questionIds,
      }),
    ).rejects.toThrow(/read-only/i);
  });

  it("blocks unverified questions", async () => {
    const { db, questionIds } = seed({ verified: false });
    await expect(
      createAssessmentDraft(client(db), CTX, {
        title: "Algebra",
        bookId: "book-1",
        unitId: "unit-1",
        questionIds,
      }),
    ).rejects.toThrow(/approved and verified/i);
  });

  it("blocks duplicate question selections", async () => {
    const { db, questionIds } = seed();
    await expect(
      createAssessmentDraft(client(db), CTX, {
        title: "Algebra",
        bookId: "book-1",
        unitId: "unit-1",
        questionIds: [questionIds[0]!, questionIds[0]!],
      }),
    ).rejects.toThrow(/more than once/i);
  });

  it("blocks questions whose outcome sits outside the chosen unit", async () => {
    const { db, questionIds } = seed();
    row0(db, "question_bank")["outcome_id"] = "out-2";
    await expect(
      createAssessmentDraft(client(db), CTX, {
        title: "Algebra",
        bookId: "book-1",
        unitId: "unit-1",
        questionIds,
      }),
    ).rejects.toThrow(/belong to the selected unit/i);
  });
});

// Regression cover for the P0 defect where creating a second assessment with
// the same title within ~2 minutes silently returned the earlier draft and
// discarded the new description and question selection.
//
// Idempotency is now request-scoped: one intentional Create action carries one
// clientRequestId. Retries collapse; separate actions never do.

import { describe, expect, it } from "vitest";

import { createAssessmentDraft } from "../assessments.server";
import { MIN_QUESTIONS } from "../assessment-lifecycle";
import { createFakeSupabase, type Db } from "./fake-supabase";

const ORG = "org-1";
const OTHER_ORG = "org-2";
const CTX = { orgId: ORG, userId: "user-1" };

const idsA = Array.from({ length: MIN_QUESTIONS }, (_, i) => `qa${i + 1}`);
const idsB = Array.from({ length: MIN_QUESTIONS }, (_, i) => `qb${i + 1}`);

function seed(): Db {
  const question = (id: string) => ({
    id,
    book_id: "book-1",
    outcome_id: "out-1",
    status: "approved",
    verification_state: "verified",
  });
  return {
    books: [
      {
        id: "book-1",
        org_id: ORG,
        board: "CBSE",
        grade: 10,
        subject: "Mathematics",
        is_demo: false,
        archived_at: null,
      },
    ],
    curriculum_units: [{ id: "unit-1", book_id: "book-1", title: "Algebra" }],
    assessment_outcomes: [{ id: "out-1", unit_id: "unit-1" }],
    question_bank: [...idsA, ...idsB].map(question),
    assessments: [],
    assessment_question_map: [],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const client = (db: Db) => createFakeSupabase(db) as any;

const TITLE = "Same Title Regression Test";

const base = {
  title: TITLE,
  bookId: "book-1",
  unitId: "unit-1",
};

const submitA = (clientRequestId: string) => ({
  ...base,
  description: "description A",
  questionIds: idsA,
  clientRequestId,
});
const submitB = (clientRequestId: string) => ({
  ...base,
  description: "description B",
  questionIds: idsB,
  clientRequestId,
});

const mapFor = (db: Db, id: string) =>
  (db["assessment_question_map"] ?? [])
    .filter((r) => r["assessment_id"] === id)
    .map((r) => r["question_id"]);

describe("request-scoped assessment idempotency", () => {
  it("creates exactly one draft for one request", async () => {
    const db = seed();
    await createAssessmentDraft(client(db), CTX, submitA("req-a"));
    expect(db["assessments"]).toHaveLength(1);
  });

  it("returns the same draft when the identical request is retried", async () => {
    const db = seed();
    const first = await createAssessmentDraft(client(db), CTX, submitA("req-a"));
    const retry = await createAssessmentDraft(client(db), CTX, submitA("req-a"));
    expect(retry.id).toBe(first.id);
    expect(retry.deduped).toBe(true);
    expect(db["assessments"]).toHaveLength(1);
    expect(mapFor(db, first.id)).toEqual(idsA);
  });

  it("creates a second draft for the same title under a different request id", async () => {
    const db = seed();
    const a = await createAssessmentDraft(client(db), CTX, submitA("req-a"));
    const b = await createAssessmentDraft(client(db), CTX, submitB("req-b"));
    expect(b.id).not.toBe(a.id);
    expect(b.deduped).toBe(false);
    expect(db["assessments"]).toHaveLength(2);
  });

  it("preserves description A and question set A on draft A", async () => {
    const db = seed();
    const a = await createAssessmentDraft(client(db), CTX, submitA("req-a"));
    await createAssessmentDraft(client(db), CTX, submitB("req-b"));
    const rowA = (db["assessments"] ?? []).find((r) => r["id"] === a.id)!;
    expect(rowA["description"]).toBe("description A");
    expect(mapFor(db, a.id)).toEqual(idsA);
  });

  it("preserves description B and question set B on draft B, and returns draft B", async () => {
    const db = seed();
    await createAssessmentDraft(client(db), CTX, submitA("req-a"));
    const b = await createAssessmentDraft(client(db), CTX, submitB("req-b"));
    const rowB = (db["assessments"] ?? []).find((r) => r["id"] === b.id)!;
    expect(rowB["description"]).toBe("description B");
    expect(rowB["title"]).toBe(TITLE);
    expect(mapFor(db, b.id)).toEqual(idsB);
  });

  it("does not collide on the same title across different users", async () => {
    const db = seed();
    const a = await createAssessmentDraft(client(db), CTX, submitA("req-a"));
    const b = await createAssessmentDraft(
      client(db),
      { orgId: ORG, userId: "user-2" },
      submitB("req-b"),
    );
    expect(b.id).not.toBe(a.id);
    expect(db["assessments"]).toHaveLength(2);
  });

  it("does not collide on the same title across different organizations", async () => {
    const db = seed();
    const a = await createAssessmentDraft(client(db), CTX, submitA("req-a"));
    const b = await createAssessmentDraft(
      client(db),
      { orgId: OTHER_ORG, userId: "user-9" },
      submitB("req-b"),
    );
    expect(b.id).not.toBe(a.id);
    expect(db["assessments"]).toHaveLength(2);
  });

  it("keeps rapid consecutive intentional submissions separate", async () => {
    const db = seed();
    const results = [];
    for (const i of [1, 2, 3]) {
      results.push(await createAssessmentDraft(client(db), CTX, submitA(`req-${i}`)));
    }
    expect(new Set(results.map((r) => r.id)).size).toBe(3);
  });

  it("collapses a concurrent double-submit of one request into a single draft", async () => {
    const db = seed();
    const c = client(db);
    const [first, second] = await Promise.all([
      createAssessmentDraft(c, CTX, submitA("req-double")),
      createAssessmentDraft(c, CTX, submitA("req-double")),
    ]);
    expect(db["assessments"]).toHaveLength(1);
    expect(first.id).toBe(second.id);
  });

  it("does not let a request id bypass active-scope validation", async () => {
    const db = seed();
    db["books"]![0]!["grade"] = 6;
    await expect(createAssessmentDraft(client(db), CTX, submitA("req-a"))).rejects.toThrow(
      /scope is unsupported/i,
    );
    expect(db["assessments"]).toHaveLength(0);
  });

  it("does not let a request id bypass verified-question validation", async () => {
    const db = seed();
    for (const q of db["question_bank"] ?? []) q["verification_state"] = "pending";
    await expect(createAssessmentDraft(client(db), CTX, submitA("req-a"))).rejects.toThrow(
      /approved and verified/i,
    );
    expect(db["assessments"]).toHaveLength(0);
  });

  it("leaves no partial assessment when the question map insert fails", async () => {
    const db = seed();
    const c = createFakeSupabase(db);
    const realFrom = c.from.bind(c);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c as any).from = (table: string) => {
      if (table === "assessment_question_map") {
        return {
          ...realFrom(table),
          insert: () => Promise.resolve({ data: null, error: { code: "XX000", message: "map failed" } }),
        };
      }
      return realFrom(table);
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(createAssessmentDraft(c as any, CTX, submitA("req-a"))).rejects.toThrow("map failed");
    expect(db["assessments"]).toHaveLength(0);
  });
});

// Acceptance: only the learner whose student account is linked to the order
// may answer or submit a diagnostic. The paying parent owns the purchase and
// the report — never the attempt.

import { describe, expect, it, beforeEach, vi } from "vitest";
import { createFakeSupabase, type Db } from "./fake-supabase";

const db: Db = {};

vi.mock("@/integrations/supabase/client.server", () => ({
  get supabaseAdmin() {
    return createFakeSupabase(db);
  },
}));

const PARENT_USER = "parent-user-1";
const LEARNER_USER = "learner-user-1";
const OTHER_USER = "someone-else";

function seed() {
  for (const key of Object.keys(db)) delete db[key];
  db["parent_orders"] = [
    {
      id: "order-1",
      order_ref: "EDUDIAG9",
      access_token: "tok_run",
      purpose: "diagnostic",
      status: "paid",
      amount_paise: 19900,
      board: "CBSE",
      grade: 10,
      subject: "Mathematics",
      book_id: null,
      unit_id: null,
      child_first_name: "Aarav",
      contact_email: "p@example.com",
      org_id: "org_1",
      learner_id: "learner-1",
      parent_user_id: PARENT_USER,
      assessment_id: "assessment-1",
      session_id: "session-1",
      parent_order_id: null,
      paid_at: new Date().toISOString(),
      provider_order_id: "order_x",
      provider_payment_ref: "pay_x",
      failure_reason: null,
      created_at: new Date().toISOString(),
    },
  ];
  db["learners"] = [
    {
      id: "learner-1",
      full_name: "Aarav Sharma",
      handle: "aaravsharma-1234",
      student_user_id: LEARNER_USER,
      org_id: "org_1",
    },
  ];
  db["assessment_sessions"] = [
    {
      id: "session-1",
      status: "in_progress",
      answers: {},
      current_position: 0,
    },
  ];
}

describe("diagnostic answer ownership", () => {
  beforeEach(seed);

  it("rejects the paying parent when they try to answer", async () => {
    const { saveRunAnswer } = await import("../parent-diagnostic.server");
    await expect(
      saveRunAnswer({
        token: "tok_run",
        questionId: "q1",
        answer: "A",
        position: 0,
        userId: PARENT_USER,
      }),
    ).rejects.toThrow(/Only Aarav Sharma can answer this diagnostic/);
  });

  it("rejects an unrelated signed-in user", async () => {
    const { saveRunAnswer } = await import("../parent-diagnostic.server");
    await expect(
      saveRunAnswer({
        token: "tok_run",
        questionId: "q1",
        answer: "A",
        position: 0,
        userId: OTHER_USER,
      }),
    ).rejects.toThrow(/Only Aarav Sharma can answer this diagnostic/);
  });

  it("rejects an anonymous caller", async () => {
    const { saveRunAnswer } = await import("../parent-diagnostic.server");
    await expect(
      saveRunAnswer({ token: "tok_run", questionId: "q1", answer: "A", position: 0, userId: null }),
    ).rejects.toThrow(/Only Aarav Sharma can answer this diagnostic/);
  });

  it("lets the linked learner save an answer", async () => {
    const { saveRunAnswer } = await import("../parent-diagnostic.server");
    await expect(
      saveRunAnswer({
        token: "tok_run",
        questionId: "q1",
        answer: "A",
        position: 1,
        userId: LEARNER_USER,
      }),
    ).resolves.toEqual({ saved: true });
    expect(db["assessment_sessions"]?.[0]?.["answers"]).toEqual({ q1: "A" });
  });
});

// Sprint 6D: thin server-function wrappers for the Question Bank Engine.
// All logic lives in question-bank.server.ts; RLS enforces org isolation and
// requireAnyRole enforces the staff/reviewer split.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAnyRole } from "./admin.server";
import { getMyOrgId } from "./assessments.server";
import {
  bankBookSchema,
  batchGenerateSchema,
  createQuestionSchema,
  generateQuestionsSchema,
  questionIdSchema,
  setQuestionStatusSchema,
  updateQuestionSchema,
} from "./question-bank-shared";
import {
  batchGenerateQuestions,
  createQuestion,
  deleteQuestion,
  fetchQuestionBankWorkspace,
  generateQuestions,
  setQuestionStatus,
  updateQuestion,
} from "./question-bank.server";

const READERS = ["admin", "educator", "reviewer"] as const;
const STAFF = ["admin", "educator"] as const;

export const getQuestionBankWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => bankBookSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, [...READERS]);
    return fetchQuestionBankWorkspace(context.supabase, data.bookId);
  });

export const generateQuestionsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => generateQuestionsSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, [...STAFF]);
    const orgId = await getMyOrgId(context.supabase, context.userId);
    return generateQuestions(context.supabase, { orgId, userId: context.userId }, data);
  });

export const batchGenerateQuestionsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => batchGenerateSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, [...STAFF]);
    const orgId = await getMyOrgId(context.supabase, context.userId);
    return batchGenerateQuestions(context.supabase, { orgId, userId: context.userId }, data);
  });

export const createQuestionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createQuestionSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, [...STAFF]);
    const orgId = await getMyOrgId(context.supabase, context.userId);
    await createQuestion(context.supabase, { orgId, userId: context.userId }, data);
    return { ok: true };
  });

export const updateQuestionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateQuestionSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, [...STAFF]);
    const orgId = await getMyOrgId(context.supabase, context.userId);
    await updateQuestion(context.supabase, { orgId, userId: context.userId }, data);
    return { ok: true };
  });

export const setQuestionStatusFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => setQuestionStatusSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, [...STAFF]);
    const orgId = await getMyOrgId(context.supabase, context.userId);
    await setQuestionStatus(context.supabase, { orgId, userId: context.userId }, data);
    return { ok: true };
  });

export const deleteQuestionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => questionIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, [...STAFF]);
    const orgId = await getMyOrgId(context.supabase, context.userId);
    await deleteQuestion(context.supabase, { orgId, userId: context.userId }, data.questionId);
    return { ok: true };
  });

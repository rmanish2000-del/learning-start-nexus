// Exam-pattern practice — server-function boundary (learner scoped, RLS applies).

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PYQ_MODES, PYQ_SUBJECTS } from "./pyq-shared";
import { loadPyqWorkspace, startPyqSession, submitPyqSession } from "./pyq.server";

const subjectSchema = z.enum(PYQ_SUBJECTS).optional();

export const getPyqWorkspaceFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ subject: subjectSchema }).parse(input ?? {}))
  .handler(async ({ data, context }) =>
    loadPyqWorkspace(context.supabase, context.userId, data.subject),
  );

export const startPyqSessionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        subject: subjectSchema,
        chapter: z.string().min(1).max(120).nullable().optional(),
        mode: z.enum(PYQ_MODES),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) =>
    startPyqSession(context.supabase, context.userId, {
      subject: data.subject,
      chapter: data.chapter ?? null,
      mode: data.mode,
    }),
  );

export const submitPyqSessionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        sessionId: z.string().uuid(),
        answers: z.record(z.string().uuid(), z.string().max(2000)),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) =>
    submitPyqSession(context.supabase, context.userId, {
      sessionId: data.sessionId,
      answers: data.answers,
    }),
  );

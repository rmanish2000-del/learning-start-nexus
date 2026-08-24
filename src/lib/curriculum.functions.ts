// Sprint 6B: thin server-function wrappers. All logic lives in
// curriculum.server.ts; RLS enforces org isolation, requireAnyRole enforces
// the staff/reviewer split.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAnyRole } from "./admin.server";
import { getMyOrgId } from "./assessments.server";
import {
  addNodeSchema,
  bookIdSchema,
  createOutcomeSchema,
  deleteNodeSchema,
  importCurriculumSchema,
  moveNodeSchema,
  outcomeIdSchema,
  renameNodeSchema,
  setBookStatusSchema,
  updateOutcomeSchema,
} from "./curriculum-shared";
import {
  addNode,
  approveAllOutcomes,
  createOutcome,
  deleteNode,
  deleteOutcome,
  fetchBookWorkspace,
  fetchLibrary,
  importCurriculum,
  moveNode,
  renameNode,
  setBookStatus,
  updateOutcome,
} from "./curriculum.server";

const STAFF = ["admin", "educator"] as const;
const READERS = ["admin", "educator", "reviewer"] as const;

async function staffCtx(supabase: never, userId: string) {
  // replaced at each call site — see below
  throw new Error(String(supabase) + userId);
}
void staffCtx;

export const getCurriculumLibrary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAnyRole(context.supabase, context.userId, [...READERS]);
    return fetchLibrary(context.supabase);
  });

export const getBookWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => bookIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, [...READERS]);
    return fetchBookWorkspace(context.supabase, data.bookId);
  });

export const renameCurriculumNode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => renameNodeSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, [...STAFF]);
    const orgId = await getMyOrgId(context.supabase, context.userId);
    await renameNode(context.supabase, { orgId, userId: context.userId }, data);
    return { ok: true };
  });

export const moveCurriculumNode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => moveNodeSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, [...STAFF]);
    const orgId = await getMyOrgId(context.supabase, context.userId);
    await moveNode(context.supabase, { orgId, userId: context.userId }, data);
    return { ok: true };
  });

export const addCurriculumNode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => addNodeSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, [...STAFF]);
    const orgId = await getMyOrgId(context.supabase, context.userId);
    await addNode(context.supabase, { orgId, userId: context.userId }, data);
    return { ok: true };
  });

export const deleteCurriculumNode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => deleteNodeSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, [...STAFF]);
    const orgId = await getMyOrgId(context.supabase, context.userId);
    await deleteNode(context.supabase, { orgId, userId: context.userId }, data);
    return { ok: true };
  });

export const createOutcomeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createOutcomeSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, [...STAFF]);
    const orgId = await getMyOrgId(context.supabase, context.userId);
    await createOutcome(context.supabase, { orgId, userId: context.userId }, data);
    return { ok: true };
  });

export const updateOutcomeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateOutcomeSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, [...STAFF]);
    const orgId = await getMyOrgId(context.supabase, context.userId);
    await updateOutcome(context.supabase, { orgId, userId: context.userId }, data);
    return { ok: true };
  });

export const deleteOutcomeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => outcomeIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, [...STAFF]);
    const orgId = await getMyOrgId(context.supabase, context.userId);
    await deleteOutcome(context.supabase, { orgId, userId: context.userId }, data.outcomeId);
    return { ok: true };
  });

export const approveAllOutcomesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => bookIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, [...STAFF]);
    const orgId = await getMyOrgId(context.supabase, context.userId);
    const approved = await approveAllOutcomes(context.supabase, { orgId, userId: context.userId }, data.bookId);
    return { ok: true, approved };
  });

export const setBookStatusFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => setBookStatusSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, [...STAFF]);
    const orgId = await getMyOrgId(context.supabase, context.userId);
    await setBookStatus(context.supabase, { orgId, userId: context.userId }, data);
    return { ok: true };
  });

export const importCurriculumFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => importCurriculumSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, [...STAFF]);
    const orgId = await getMyOrgId(context.supabase, context.userId);
    return importCurriculum(context.supabase, { orgId, userId: context.userId }, data);
  });

// Sprint 6R: real book upload (PDF/TXT/MD → storage) + AI extraction.
export const uploadBookFileFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    if (!(input instanceof FormData)) throw new Error("Expected form data.");
    return input;
  })
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, [...STAFF]);
    const orgId = await getMyOrgId(context.supabase, context.userId);
    const { uploadBookFile } = await import("./book-upload.server");
    return uploadBookFile(context.supabase, { orgId, userId: context.userId }, data);
  });

export const extractCurriculumFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => bookIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAnyRole(context.supabase, context.userId, [...STAFF]);
    const orgId = await getMyOrgId(context.supabase, context.userId);
    const { extractCurriculumFromBook } = await import("./book-upload.server");
    return extractCurriculumFromBook(context.supabase, { orgId, userId: context.userId }, data.bookId);
  });

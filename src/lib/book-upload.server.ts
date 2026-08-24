// Sprint 6R: real book upload + AI curriculum extraction (server-only).
//
// Flow: staff uploads a PDF/TXT/MD → file lands in the private `books`
// storage bucket under {orgId}/{bookId}/ → on demand, the extraction pipeline
// downloads the file, pulls text (unpdf for PDFs), and asks the AI gateway
// for a Units → Chapters → Topics (+ key concepts, learning outcomes) tree,
// which is persisted through the same persistCurriculumTree used by the JSON
// import. Every step runs through the caller's RLS-scoped client and writes
// book_events, so the audit trail matches the rest of Sprint 6.

import type { SupabaseClient } from "@supabase/supabase-js";
import { generateObject } from "ai";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { persistCurriculumTree } from "./curriculum.server";
import type { ImportCurriculumInput } from "./curriculum-shared";

type Client = SupabaseClient<Database>;
type Ctx = { orgId: string; userId: string };

const EXTRACTION_MODEL = "google/gemini-3.7-flash";
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_TEXT_CHARS = 40_000;
const ALLOWED_MIME = new Set(["application/pdf", "text/plain", "text/markdown"]);

const metadataSchema = z.object({
  title: z.string().trim().min(2, "Title is required").max(200),
  board: z.string().trim().min(2, "Board is required").max(60),
  grade: z.number().int().min(1).max(12),
  subject: z.string().trim().min(2, "Subject is required").max(60),
});

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

export async function uploadBookFile(
  supabase: Client,
  ctx: Ctx,
  form: FormData,
): Promise<{ bookId: string; fileName: string; sizeBytes: number }> {
  const meta = metadataSchema.parse({
    title: String(form.get("title") ?? ""),
    board: String(form.get("board") ?? ""),
    grade: Number(form.get("grade") ?? 0),
    subject: String(form.get("subject") ?? ""),
  });

  const file = form.get("file");
  if (!(file instanceof File)) throw new Error("Choose a book file to upload.");
  if (file.size === 0) throw new Error("The selected file is empty.");
  if (file.size > MAX_FILE_BYTES) throw new Error("Files up to 15 MB are supported.");
  const mimeType = file.type || "application/octet-stream";
  if (!ALLOWED_MIME.has(mimeType)) {
    throw new Error("Unsupported file type — upload a PDF, TXT, or Markdown file.");
  }
  const safeName = file.name.replace(/[^\w.\- ]+/g, "_").slice(-120) || "book.pdf";

  // 1. Register the book row (status: uploaded — no structure yet).
  const { data: book, error: bookError } = await supabase
    .from("books")
    .insert({
      org_id: ctx.orgId,
      uploaded_by: ctx.userId,
      title: meta.title,
      board: meta.board,
      grade: meta.grade,
      subject: meta.subject,
      file_names: [safeName],
      storage_paths: [],
      mime_types: [mimeType],
      file_size_bytes: file.size,
      status: "uploaded",
    })
    .select("id")
    .single();
  if (bookError) throw new Error(bookError.message);
  const bookId = book.id;

  // 2. Store the file. Storage policies scope writes to {orgId}/... for staff.
  const path = `${ctx.orgId}/${bookId}/${safeName}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage.from("books").upload(path, bytes, {
    contentType: mimeType,
    upsert: false,
  });
  if (uploadError) {
    await supabase.from("books").delete().eq("id", bookId);
    throw new Error(`File storage failed: ${uploadError.message}`);
  }

  const { error: updateError } = await supabase
    .from("books")
    .update({ storage_paths: [path] })
    .eq("id", bookId);
  if (updateError) throw new Error(updateError.message);

  await supabase.from("book_events").insert({
    org_id: ctx.orgId,
    book_id: bookId,
    actor_id: ctx.userId,
    event: "uploaded",
    detail: { file: safeName, format: mimeType, sizeBytes: file.size, source: "file upload" },
  });

  return { bookId, fileName: safeName, sizeBytes: file.size };
}

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

// Lenient schema: strict min/max limits on nested arrays make the model's
// response fail validation wholesale. Parse loosely, then normalize in code.
const extractedTopicSchema = z.object({
  title: z.string(),
  keyConcepts: z.array(z.string()).optional(),
  outcomes: z.array(z.string()).optional(),
});
const extractedChapterSchema = z.object({
  title: z.string(),
  topics: z.array(extractedTopicSchema).optional(),
});
const extractedUnitSchema = z.object({
  title: z.string(),
  chapters: z.array(extractedChapterSchema).optional(),
});
const extractionSchema = z.object({
  units: z.array(extractedUnitSchema),
});

const clean = (s: string, max: number) => s.replace(/\s+/g, " ").trim().slice(0, max);

function normalizeUnits(
  raw: z.infer<typeof extractionSchema>["units"],
): ImportCurriculumInput["units"] {
  return raw
    .map((u) => ({
      title: clean(u.title ?? "", 200),
      chapters: (u.chapters ?? [])
        .map((c) => ({
          title: clean(c.title ?? "", 200),
          topics: (c.topics ?? [])
            .map((t) => ({
              title: clean(t.title ?? "", 200),
              keyConcepts: (t.keyConcepts ?? []).map((k) => clean(k, 120)).filter(Boolean).slice(0, 8),
              outcomes: (t.outcomes ?? []).map((o) => clean(o, 300)).filter((o) => o.length >= 3).slice(0, 6),
            }))
            .filter((t) => t.title.length > 0)
            .slice(0, 12),
        }))
        .filter((c) => c.title.length > 0 && c.topics.length > 0)
        .slice(0, 12),
    }))
    .filter((u) => u.title.length > 0 && u.chapters.length > 0)
    .slice(0, 12);
}

async function extractTextFromFile(path: string, mimeType: string, bytes: Uint8Array): Promise<string> {
  if (mimeType === "application/pdf" || path.toLowerCase().endsWith(".pdf")) {
    const { extractText } = await import("unpdf");
    const { text } = await extractText(bytes, { mergePages: true });
    return text;
  }
  return new TextDecoder().decode(bytes);
}

export async function extractCurriculumFromBook(
  supabase: Client,
  ctx: Ctx,
  bookId: string,
): Promise<{ units: number; chapters: number; topics: number; outcomes: number; aiUsed: boolean }> {
  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("id, title, board, grade, subject, status, storage_paths, mime_types, file_names")
    .eq("id", bookId)
    .maybeSingle();
  if (bookError) throw new Error(bookError.message);
  if (!book) throw new Error("Book not found in your organization.");
  if (book.status === "processing") throw new Error("Extraction is already running for this book.");
  if (book.status !== "uploaded" && book.status !== "failed") {
    throw new Error("Only uploaded (or previously failed) books can be extracted.");
  }
  const path = book.storage_paths[0];
  if (!path) throw new Error("This book has no stored file — upload a file first.");

  const fail = async (message: string): Promise<never> => {
    await supabase
      .from("books")
      .update({ status: "failed", processing_error: message.slice(0, 500) })
      .eq("id", bookId);
    await supabase.from("book_events").insert({
      org_id: ctx.orgId,
      book_id: bookId,
      actor_id: ctx.userId,
      event: "extraction_failed",
      detail: { error: message.slice(0, 500) },
    });
    throw new Error(message);
  };

  await supabase
    .from("books")
    .update({ status: "processing", processing_error: null })
    .eq("id", bookId);
  await supabase.from("book_events").insert({
    org_id: ctx.orgId,
    book_id: bookId,
    actor_id: ctx.userId,
    event: "extraction_started",
    detail: { file: book.file_names[0] ?? path },
  });

  // Download through the caller's client — storage RLS limits reads to the
  // caller's own org folder.
  const { data: blob, error: downloadError } = await supabase.storage.from("books").download(path);
  if (downloadError || !blob) {
    return fail(`Could not read the stored file: ${downloadError?.message ?? "not found"}`);
  }

  let text: string;
  try {
    text = await extractTextFromFile(path, book.mime_types[0] ?? "", new Uint8Array(await blob.arrayBuffer()));
  } catch (error) {
    return fail(`Text extraction failed: ${error instanceof Error ? error.message : "unknown error"}`);
  }
  text = text.replace(/\s+/g, " ").trim();
  if (text.length < 200) {
    return fail("The file contains too little readable text to build a curriculum from.");
  }
  if (text.length > MAX_TEXT_CHARS) text = text.slice(0, MAX_TEXT_CHARS);

  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return fail("AI is not configured for this workspace (missing API key).");

  let units: ImportCurriculumInput["units"] = [];
  let lastError: string | null = null;
  for (let attempt = 0; attempt < 2 && units.length === 0; attempt += 1) {
    try {
      const gateway = createLovableAiGatewayProvider(apiKey);
      const { object } = await generateObject({
        model: gateway(EXTRACTION_MODEL),
        schema: extractionSchema,
        system:
          "You are a curriculum designer converting schoolbook text into a teaching structure. " +
          "Produce Units → Chapters → Topics that faithfully follow the source material. " +
          "Each topic gets 2–6 short key concepts and 2–4 measurable learning outcomes " +
          "(start outcomes with an action verb: identify, explain, solve, compare…). " +
          "Keep titles concise. Do not invent content that is not in the text.",
        prompt:
          `Book: "${book.title}" (${book.board ?? "school"} board, Grade ${book.grade}, ${book.subject}).\n\n` +
          `Extract the curriculum structure from this text:\n\n${text}`,
      });
      units = normalizeUnits(object.units);
      if (units.length === 0) lastError = "The AI returned no usable units for this text.";
    } catch (error) {
      lastError = error instanceof Error ? error.message : "unknown error";
    }
  }
  if (units.length === 0) {
    return fail(`AI extraction failed: ${lastError ?? "no structured output"}`);
  }

  const counts = await persistCurriculumTree(supabase, ctx, bookId, units);

  await supabase
    .from("books")
    .update({ status: "processed", processed_at: new Date().toISOString(), processing_error: null })
    .eq("id", bookId);
  await supabase.from("book_events").insert({
    org_id: ctx.orgId,
    book_id: bookId,
    actor_id: ctx.userId,
    event: "imported",
    detail: {
      source: "AI extraction",
      model: EXTRACTION_MODEL,
      units: units.length,
      chapters: counts.chapters,
      topics: counts.topics,
      outcomes: counts.outcomes,
    },
  });

  return { units: units.length, ...counts, aiUsed: true };
}

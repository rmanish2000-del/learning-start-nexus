// Sprint 6B: shared types and validation for the curriculum engine.
// Client-safe — no server-only imports.

import { z } from "zod";

export type NodeKind = "unit" | "chapter" | "topic";

export const BOOK_STATUS_LABELS: Record<string, string> = {
  uploaded: "Uploaded",
  processing: "Processing",
  processed: "In review",
  approved: "Approved",
  failed: "Failed",
};

// ---------------------------------------------------------------------------
// DTOs returned by server functions
// ---------------------------------------------------------------------------

export type OutcomeNode = {
  id: string;
  text: string;
  status: "suggested" | "approved";
  position: number;
};

export type TopicNode = {
  id: string;
  title: string;
  position: number;
  keyConcepts: string[];
  outcomes: OutcomeNode[];
};

export type ChapterNode = {
  id: string;
  title: string;
  position: number;
  topics: TopicNode[];
};

export type UnitNode = {
  id: string;
  title: string;
  position: number;
  chapters: ChapterNode[];
};

export type BookSummary = {
  id: string;
  title: string;
  board: string | null;
  grade: number;
  subject: string;
  status: string;
  fileNames: string[];
  fileSizeBytes: number;
  processedAt: string | null;
  createdAt: string;
  counts: {
    units: number;
    chapters: number;
    topics: number;
    outcomes: number;
    approvedOutcomes: number;
  };
};

export type GraphNode = { id: string; label: string; depth: number };
export type GraphEdge = { id: string; parentId: string; childId: string; relation: string };

export type EventDetail = Record<string, string | number | boolean | null>;

export type BookEventRow = {
  id: string;
  event: string;
  detail: EventDetail;
  createdAt: string;
};

export type BookWorkspace = {
  book: BookSummary;
  units: UnitNode[];
  graph: { nodes: GraphNode[]; edges: GraphEdge[] };
  events: BookEventRow[];
};

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

export const bookIdSchema = z.object({ bookId: z.string().uuid() });

export const renameNodeSchema = z.object({
  kind: z.enum(["unit", "chapter", "topic"]),
  id: z.string().uuid(),
  title: z.string().trim().min(1, "Title is required").max(200),
});

export const moveNodeSchema = z.object({
  kind: z.enum(["chapter", "topic"]),
  id: z.string().uuid(),
  parentId: z.string().uuid(),
});

export const addNodeSchema = z.object({
  kind: z.enum(["unit", "chapter", "topic"]),
  bookId: z.string().uuid(),
  parentId: z.string().uuid().nullish(),
  title: z.string().trim().min(1, "Title is required").max(200),
});

export const deleteNodeSchema = z.object({
  kind: z.enum(["unit", "chapter", "topic"]),
  id: z.string().uuid(),
});

export const createOutcomeSchema = z.object({
  bookId: z.string().uuid(),
  topicId: z.string().uuid(),
  text: z.string().trim().min(3, "Outcome text is too short").max(500),
});

export const updateOutcomeSchema = z.object({
  outcomeId: z.string().uuid(),
  text: z.string().trim().min(3).max(500).optional(),
  status: z.enum(["suggested", "approved"]).optional(),
});

export const outcomeIdSchema = z.object({ outcomeId: z.string().uuid() });

export const setBookStatusSchema = z.object({
  bookId: z.string().uuid(),
  status: z.enum(["processed", "approved"]),
});

// JSON import: a complete book tree in one document.
export const importCurriculumSchema = z.object({
  title: z.string().trim().min(1).max(200),
  board: z.string().trim().min(1).max(60),
  grade: z.number().int().min(1).max(12),
  subject: z.string().trim().min(1).max(80),
  units: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(200),
        chapters: z
          .array(
            z.object({
              title: z.string().trim().min(1).max(200),
              topics: z
                .array(
                  z.object({
                    title: z.string().trim().min(1).max(200),
                    keyConcepts: z.array(z.string().max(120)).max(20).optional(),
                    outcomes: z.array(z.string().trim().min(3).max(500)).max(10).optional(),
                  }),
                )
                .max(50),
            }),
          )
          .max(100),
      }),
    )
    .min(1, "At least one unit is required")
    .max(30),
});
export type ImportCurriculumInput = z.infer<typeof importCurriculumSchema>;

export const IMPORT_JSON_EXAMPLE = `{
  "title": "My Textbook",
  "board": "ICSE",
  "grade": 3,
  "subject": "General Knowledge",
  "units": [
    {
      "title": "Unit 1 — My Country",
      "chapters": [
        {
          "title": "India — My Motherland",
          "topics": [
            {
              "title": "National symbols",
              "keyConcepts": ["flag", "anthem"],
              "outcomes": ["Identify the national symbols of India."]
            }
          ]
        }
      ]
    }
  ]
}`;

import { z } from "zod";

import { handleSchema, pinSchema } from "./schemas";

/** One learner row from a centre's CSV upload. */
export const learnerImportRowSchema = z.object({
  fullName: z.string().trim().min(2, "Name is required").max(80),
  handle: handleSchema,
  pin: pinSchema,
  grade: z.number().int().min(1).max(12),
  subject: z.string().trim().min(2).max(60),
});

export type LearnerImportRow = z.infer<typeof learnerImportRowSchema>;

export const learnerImportSchema = z.object({
  rows: z.array(learnerImportRowSchema).min(1, "Add at least one learner").max(200),
});

export const approveCentreLeadSchema = z.object({
  leadId: z.string().uuid(),
  orgName: z.string().trim().min(2, "Centre name is required").max(120),
  adminFullName: z.string().trim().min(2, "Contact name is required").max(80),
  adminEmail: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().max(40).optional(),
  timezone: z.string().trim().max(60).optional(),
});

export const CSV_TEMPLATE = "full_name,handle,pin,grade,subject\nAarav Sharma,aarav10,123456,10,Mathematics\n";

export type ParsedImport = {
  rows: LearnerImportRow[];
  errors: { line: number; message: string }[];
};

const HEADER_ALIASES: Record<string, keyof LearnerImportRow> = {
  full_name: "fullName",
  fullname: "fullName",
  name: "fullName",
  handle: "handle",
  username: "handle",
  pin: "pin",
  grade: "grade",
  class: "grade",
  subject: "subject",
};

function splitLine(line: string): string[] {
  // Minimal CSV: comma separated, optional double quotes with "" escaping.
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

/**
 * Parse a learner CSV into validated rows plus per-line errors. Pure: shared by
 * the import dialog (preview) and covered directly by tests.
 */
export function parseLearnerCsv(text: string): ParsedImport {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return { rows: [], errors: [{ line: 0, message: "The file is empty." }] };

  const header = splitLine(lines[0]!).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const columns = header.map((h) => HEADER_ALIASES[h] ?? null);
  const missing = (["fullName", "handle", "pin", "grade", "subject"] as const).filter(
    (key) => !columns.includes(key),
  );
  if (missing.length > 0) {
    return {
      rows: [],
      errors: [{ line: 1, message: `Missing column(s): ${missing.join(", ")}` }],
    };
  }

  const rows: LearnerImportRow[] = [];
  const errors: ParsedImport["errors"] = [];
  const seen = new Set<string>();

  lines.slice(1).forEach((line, index) => {
    const lineNumber = index + 2;
    const cells = splitLine(line);
    const record: Record<string, unknown> = {};
    columns.forEach((key, i) => {
      if (!key) return;
      const raw = cells[i] ?? "";
      record[key] = key === "grade" ? Number(raw) : raw;
    });

    const parsed = learnerImportRowSchema.safeParse(record);
    if (!parsed.success) {
      errors.push({ line: lineNumber, message: parsed.error.issues[0]?.message ?? "Invalid row" });
      return;
    }
    const handle = parsed.data.handle.toLowerCase();
    if (seen.has(handle)) {
      errors.push({ line: lineNumber, message: `Duplicate handle "${handle}" in this file` });
      return;
    }
    seen.add(handle);
    rows.push(parsed.data);
  });

  return { rows, errors };
}

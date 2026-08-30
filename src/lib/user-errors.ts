// Single translation point between thrown errors and user-facing copy.
//
// Two classes of raw text used to leak into toasts and error cards:
//   1. Zod validation failures — `ZodError.message` is a JSON-stringified
//      issue array, so `error.message` rendered a raw JSON blob to parents.
//   2. Postgres/PostgREST failures — technical strings ("new row violates
//      row-level security policy for table ...") that mean nothing to a user.
//
// Everything user-facing must go through `friendlyErrorMessage`.

type ZodIssueLike = { message?: unknown; path?: unknown };

/** Field key → label used when a Zod issue has no custom message. */
function fieldLabel(path: unknown): string | null {
  if (!Array.isArray(path) || path.length === 0) return null;
  const key = String(path[path.length - 1]);
  if (!key || /^\d+$/.test(key)) return null;
  const spaced = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .trim();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : null;
}

/**
 * Parses a Zod-style JSON issue array out of an error message.
 * Returns null when the text is not a Zod payload.
 */
export function parseZodIssues(text: string): { field: string | null; message: string }[] | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("[")) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return null;
  const issues = parsed as ZodIssueLike[];
  if (!issues.every((i) => i && typeof i === "object" && "message" in i)) return null;

  return issues.map((issue) => {
    const label = fieldLabel(issue.path);
    const raw = typeof issue.message === "string" ? issue.message.trim() : "";
    const generic =
      !raw ||
      /^(required|invalid|invalid input|invalid type)\b/i.test(raw) ||
      /expected .*received /i.test(raw);
    if (generic) {
      return { field: label, message: label ? `${label} is required` : "Please check this field" };
    }
    return { field: label, message: raw };
  });
}

/** Zod issues keyed by field name, for inline per-field form errors. */
export function zodFieldErrors(error: unknown): Record<string, string> {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const issues = parseZodIssues(raw);
  if (!issues) return {};
  const out: Record<string, string> = {};
  for (const issue of issues) {
    if (!issue.field) continue;
    const key = issue.field.toLowerCase();
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

const TECHNICAL_PATTERNS: { test: RegExp; message: string }[] = [
  {
    test: /row-level security|permission denied|not authorized|unauthorized|forbidden|403/i,
    message:
      "You don't have access to do this. If that looks wrong, ask your centre admin to check your account.",
  },
  {
    test: /jwt|token|session (has )?expired|invalid claim/i,
    message: "Your session has expired. Please sign in again.",
  },
  {
    test: /duplicate key|unique constraint/i,
    message: "That already exists. Try a different value.",
  },
  {
    test: /foreign key|violates check constraint|invalid input syntax|column .* does not exist|relation .* does not exist|syntax error/i,
    message: "We couldn't save that. Please check the details and try again.",
  },
  {
    test: /failed to fetch|network ?error|load failed|timeout|ecconnrefused|fetch failed/i,
    message: "We couldn't reach the server. Check your connection and try again.",
  },
  { test: /^\s*[[{]/, message: "Please check the details and try again." },
];

/**
 * Converts any thrown value into a sentence safe to show a user.
 * Never returns raw JSON, SQL text, or a stack trace.
 */
export function friendlyErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : error && typeof error === "object" && typeof (error as { message?: unknown }).message === "string"
          ? ((error as { message: string }).message)
          : "";

  const text = raw.trim();
  if (!text) return fallback;
  // Stack traces are always internal.
  if (/\bat\s+[\w.<>]+\s*\(.*:\d+:\d+\)/.test(text) || text.includes("\n    at ")) return fallback;

  const issues = parseZodIssues(text);
  if (issues) {
    const unique = [...new Set(issues.map((i) => i.message))];
    return unique.slice(0, 3).join(" ");
  }

  for (const pattern of TECHNICAL_PATTERNS) {
    if (pattern.test.test(text)) return pattern.message;
  }

  // Long, punctuation-free or stack-like text is almost always internal.
  if (text.length > 240 || text.includes("\n    at ")) return fallback;

  return text;
}

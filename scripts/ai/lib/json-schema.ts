// Minimal, dependency-free JSON Schema (draft 2020-12 subset) validator used by
// the .ai governance validators. Supports the keywords the EduOS schemas use:
// type, required, properties, additionalProperties, enum, const, pattern,
// minLength, minItems, items, format (date-time only), oneOf/anyOf, $ref to
// "#/$defs/<name>", nullable via type arrays. Anything else is ignored, which
// is acceptable because the schemas in `.ai/` are authored against this subset
// and a test pins the keyword set.

export type JsonValue = null | boolean | number | string | JsonValue[] | { [k: string]: JsonValue };

export interface SchemaIssue {
  path: string;
  message: string;
}

type Schema = Record<string, unknown>;

const SUPPORTED_KEYWORDS = new Set([
  "$schema",
  "$id",
  "$defs",
  "$ref",
  "$comment",
  "title",
  "description",
  "type",
  "required",
  "properties",
  "additionalProperties",
  "enum",
  "const",
  "pattern",
  "minLength",
  "minItems",
  "items",
  "format",
  "oneOf",
  "anyOf",
  "examples",
  "default",
]);

export function unsupportedKeywords(schema: Schema, acc: string[] = [], at = "#"): string[] {
  for (const [key, value] of Object.entries(schema)) {
    if (!SUPPORTED_KEYWORDS.has(key)) acc.push(`${at}/${key}`);
    if (key === "properties" || key === "$defs") {
      for (const [name, sub] of Object.entries(value as Record<string, Schema>)) {
        unsupportedKeywords(sub, acc, `${at}/${key}/${name}`);
      }
    } else if (key === "items" || key === "additionalProperties") {
      if (typeof value === "object" && value !== null) {
        unsupportedKeywords(value as Schema, acc, `${at}/${key}`);
      }
    } else if (key === "oneOf" || key === "anyOf") {
      (value as Schema[]).forEach((sub, i) => unsupportedKeywords(sub, acc, `${at}/${key}/${i}`));
    }
  }
  return acc;
}

function typeOf(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "number") return Number.isInteger(value) ? "integer" : "number";
  return typeof value;
}

function matchesType(value: unknown, type: string): boolean {
  const actual = typeOf(value);
  if (type === "number") return actual === "number" || actual === "integer";
  return actual === type;
}

const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

function resolveRef(ref: string, root: Schema): Schema {
  const match = /^#\/\$defs\/([A-Za-z0-9_-]+)$/.exec(ref);
  if (!match) throw new Error(`Unsupported $ref: ${ref}`);
  const defs = (root["$defs"] ?? {}) as Record<string, Schema>;
  const target = defs[match[1] as string];
  if (!target) throw new Error(`Unknown $ref target: ${ref}`);
  return target;
}

export function validateAgainstSchema(
  value: unknown,
  schema: Schema,
  root: Schema = schema,
  path = "$",
  issues: SchemaIssue[] = [],
): SchemaIssue[] {
  if (typeof schema["$ref"] === "string") {
    return validateAgainstSchema(value, resolveRef(schema["$ref"], root), root, path, issues);
  }

  const type = schema["type"];
  if (type !== undefined) {
    const types = Array.isArray(type) ? (type as string[]) : [type as string];
    if (!types.some((t) => matchesType(value, t))) {
      issues.push({ path, message: `expected ${types.join("|")}, got ${typeOf(value)}` });
      return issues;
    }
  }

  if (schema["enum"] !== undefined) {
    const allowed = schema["enum"] as unknown[];
    if (!allowed.some((a) => JSON.stringify(a) === JSON.stringify(value))) {
      issues.push({ path, message: `must be one of ${allowed.map(String).join(", ")}` });
    }
  }
  if (schema["const"] !== undefined && JSON.stringify(schema["const"]) !== JSON.stringify(value)) {
    issues.push({ path, message: `must equal ${JSON.stringify(schema["const"])}` });
  }

  if (typeof value === "string") {
    const minLength = schema["minLength"];
    if (typeof minLength === "number" && value.length < minLength) {
      issues.push({ path, message: `must be at least ${minLength} characters` });
    }
    const pattern = schema["pattern"];
    if (typeof pattern === "string" && !new RegExp(pattern).test(value)) {
      issues.push({ path, message: `does not match /${pattern}/` });
    }
    if (schema["format"] === "date-time" && !DATE_TIME.test(value)) {
      issues.push({ path, message: "must be an ISO-8601 date-time with timezone" });
    }
  }

  if (Array.isArray(value)) {
    const minItems = schema["minItems"];
    if (typeof minItems === "number" && value.length < minItems) {
      issues.push({ path, message: `must contain at least ${minItems} item(s)` });
    }
    const items = schema["items"];
    if (items && typeof items === "object") {
      value.forEach((item, i) =>
        validateAgainstSchema(item, items as Schema, root, `${path}[${i}]`, issues),
      );
    }
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const required = (schema["required"] ?? []) as string[];
    for (const key of required) {
      if (!(key in record)) issues.push({ path: `${path}.${key}`, message: "is required" });
    }
    const properties = (schema["properties"] ?? {}) as Record<string, Schema>;
    for (const [key, sub] of Object.entries(properties)) {
      if (key in record) validateAgainstSchema(record[key], sub, root, `${path}.${key}`, issues);
    }
    const additional = schema["additionalProperties"];
    if (additional === false) {
      for (const key of Object.keys(record)) {
        if (!(key in properties))
          issues.push({ path: `${path}.${key}`, message: "is not allowed" });
      }
    } else if (additional && typeof additional === "object") {
      for (const key of Object.keys(record)) {
        if (!(key in properties)) {
          validateAgainstSchema(record[key], additional as Schema, root, `${path}.${key}`, issues);
        }
      }
    }
  }

  for (const combinator of ["oneOf", "anyOf"] as const) {
    const branches = schema[combinator] as Schema[] | undefined;
    if (!branches) continue;
    const passing = branches.filter(
      (b) => validateAgainstSchema(value, b, root, path, []).length === 0,
    ).length;
    if (passing === 0 || (combinator === "oneOf" && passing !== 1)) {
      issues.push({
        path,
        message: `must satisfy ${combinator === "oneOf" ? "exactly" : "at least"} one of ${branches.length} alternatives`,
      });
    }
  }

  return issues;
}

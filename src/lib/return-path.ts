/**
 * Canonical guard for post-sign-in return paths (`/auth?next=...`). This is
 * the only sanitizer for `next` in the codebase; every consumer (the /auth
 * search validator and both redirect sites) calls it immediately before use.
 *
 * Returns a same-origin path (pathname + search + hash) or undefined. Rejects
 * protocol-relative, absolute, backslash, control-character and
 * percent-encoded variants of those forms, including the browser-normalised
 * ones, and anything that resolves to another origin.
 */
const BASE = "https://eduos.invalid";
/** Bounded so a pathological value cannot make us decode forever. */
const MAX_DECODE_ROUNDS = 3;

function looksExternal(v: string): boolean {
  if (!v.startsWith("/")) return true;
  if (v.startsWith("//")) return true;
  if (v.includes("\\")) return true;
  // Tab, newline and other control characters are stripped or re-interpreted
  // by URL parsers (`/\t/evil.com` becomes `//evil.com`). A plain space is
  // not: it stays a same-origin path segment, so encoded spaces in a query
  // string remain usable.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(v)) return true;
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return true;
  return false;
}

export function sanitizeReturnPath(raw: unknown): string | undefined {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 2048) return undefined;
  if (looksExternal(raw)) return undefined;
  // Check decoded forms too so encoded slashes/backslashes cannot sneak
  // through (`/%2F%2Fevil.com`, `/%5Cevil.com`, `/%252F%252Fevil.com`).
  let cur = raw;
  for (let i = 0; i < MAX_DECODE_ROUNDS; i++) {
    let dec: string;
    try {
      dec = decodeURIComponent(cur);
    } catch {
      return undefined;
    }
    if (dec === cur) break;
    if (looksExternal(dec)) return undefined;
    cur = dec;
  }
  let url: URL;
  try {
    url = new URL(raw, BASE);
  } catch {
    return undefined;
  }
  if (url.origin !== BASE) return undefined;
  const out = url.pathname + url.search + url.hash;
  // Browser normalisation (`/.//evil.com` -> `//evil.com`, `/../x` -> `/x`) is
  // checked on the resolved form as well, and a value that does not survive
  // resolution unchanged is not a path we vouch for.
  if (looksExternal(out) || out !== raw) return undefined;
  return out;
}

/**
 * The `next` member of the /auth search. The key is ALWAYS present: TanStack
 * Router merges validated output over the raw search (`{...raw, ...validated}`),
 * so omitting a rejected value would let the raw value survive into
 * `Route.useSearch()`. Setting it to `undefined` explicitly replaces it.
 */
export function validatedReturnPath(search: Record<string, unknown>): {
  next: string | undefined;
} {
  return { next: sanitizeReturnPath(search["next"]) };
}

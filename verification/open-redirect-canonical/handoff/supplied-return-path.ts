/**
 * Canonical guard for post-sign-in return paths (`/auth?next=...`).
 * Returns a same-origin path (pathname + search + hash) or undefined.
 * Rejects protocol-relative, absolute, backslash, control-character and
 * percent-encoded variants of those forms, including browser-normalised ones.
 */
const BASE = "https://eduos.invalid";

function looksExternal(v: string): boolean {
  if (!v.startsWith("/")) return true;
  if (v.startsWith("//")) return true;
  if (v.includes("\\")) return true;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\s]/.test(v)) return true;
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return true;
  return false;
}

export function sanitizeReturnPath(raw: unknown): string | undefined {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 2048) return undefined;
  if (looksExternal(raw)) return undefined;
  // Check decoded forms too (up to 3 rounds) so encoded slashes/backslashes can't sneak through.
  let cur = raw;
  for (let i = 0; i < 3; i++) {
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
  if (looksExternal(out)) return undefined;
  return out;
}

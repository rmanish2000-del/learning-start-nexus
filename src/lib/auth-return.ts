// Return-path safety for the sign-in page's `next` parameter. Only a
// same-origin, absolute path is ever honoured: protocol-relative (`//evil.com`),
// backslash (`/\evil.com`), absolute URLs and relative paths are all dropped so
// sign-in can never become an open redirect.
const SAFE_INTERNAL_PATH = /^\/(?![/\\])/;

export function sanitizeReturnPath(next: unknown): string | undefined {
  if (typeof next !== "string" || next.length === 0 || next.length > 2048) return undefined;
  if (!SAFE_INTERNAL_PATH.test(next)) return undefined;
  // A path cannot carry a scheme or authority; reject anything that would
  // still parse to a different origin once the browser resolves it.
  try {
    const resolved = new URL(next, "https://eduos.invalid");
    if (resolved.origin !== "https://eduos.invalid") return undefined;
  } catch {
    return undefined;
  }
  return next;
}

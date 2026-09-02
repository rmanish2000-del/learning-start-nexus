// Response hardening applied to every HTML document response.
//
// The edge already sets HSTS, `x-content-type-options` and `referrer-policy`.
// What was missing is clickjacking protection and a browser-feature policy, so
// those are added here. `frame-ancestors` deliberately allows the Lovable
// editor/preview origins — a bare `DENY` would break the in-editor preview.
const FRAME_ANCESTORS = [
  "'self'",
  "https://lovable.dev",
  "https://*.lovable.dev",
  "https://*.lovable.app",
].join(" ");

const PERMISSIONS_POLICY = [
  "camera=()",
  "microphone=()",
  "geolocation=()",
  "payment=(self)",
  "usb=()",
  "interest-cohort=()",
].join(", ");

export const SECURITY_HEADERS: Record<string, string> = {
  "content-security-policy": `frame-ancestors ${FRAME_ANCESTORS}`,
  "permissions-policy": PERMISSIONS_POLICY,
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "cross-origin-opener-policy": "same-origin",
};

export function applySecurityHeaders(response: Response): Response {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) return response;
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

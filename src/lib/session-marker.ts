// Session marker cookie — NOT a security boundary. Row-level security and the
// bearer-checked server functions protect the data; this cookie only lets the
// server middleware short-circuit anonymous document requests to /auth with a
// 302 before any app HTML/JS ships (defense-in-depth layer 1).

const COOKIE_NAME = "eduos_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days, renewed on each visit

export function setSessionMarker(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=1; Path=/; SameSite=Lax; Max-Age=${MAX_AGE_SECONDS}`;
}

export function clearSessionMarker(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=; Path=/; SameSite=Lax; Max-Age=0`;
}

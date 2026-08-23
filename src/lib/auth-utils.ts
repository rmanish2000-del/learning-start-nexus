// Student accounts authenticate with a handle + PIN instead of an email.
// The handle maps to a deterministic synthetic email and the PIN to a derived
// password, so standard email/password auth works end to end. Staff create
// and reset these credentials — students never see an inbox.

export const STUDENT_EMAIL_DOMAIN = "student.eduos.local";

export function normalizeHandle(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");
}

export function studentEmail(handle: string): string {
  return `${normalizeHandle(handle)}@${STUDENT_EMAIL_DOMAIN}`;
}

export function studentPassword(handle: string, pin: string): string {
  return `${pin}#${normalizeHandle(handle)}`;
}

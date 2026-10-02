// Platform-owner (founder) identity. Payment Settings and centre approval are
// founder-only: access is granted by exact verified email, never by role.

export const FOUNDER_EMAIL = "rmanish2000@gmail.com";

export type FounderCandidate = {
  email?: string | null;
  email_confirmed_at?: string | null;
} | null | undefined;

/** Exact match on a verified email. Role is deliberately not an input. */
export function isFounderUser(user: FounderCandidate): boolean {
  if (!user?.email || !user.email_confirmed_at) return false;
  return user.email.trim().toLowerCase() === FOUNDER_EMAIL;
}

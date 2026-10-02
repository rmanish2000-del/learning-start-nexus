// Platform-owner identity — shared between the browser (navigation visibility)
// and the server (the real gate, see platform-owner.server.ts).
//
// The platform owner is the only account that may see or use platform-level
// surfaces: payment settings, pilot access, feedback review, payment audit and
// centre approval. Centre admins carry the `admin` role for their own
// organization; that role is never sufficient for platform-level actions.

export const PLATFORM_OWNER_EMAIL = "rmanish2000@gmail.com";

export function isPlatformOwnerEmail(
  email: string | null | undefined,
  owner: string = PLATFORM_OWNER_EMAIL,
): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === owner.trim().toLowerCase();
}

/** Exact owner email AND a confirmed email. Role is never an input. */
export function isPlatformOwnerUser(
  user: { email?: string | null; email_confirmed_at?: string | null } | null | undefined,
): boolean {
  if (!user?.email_confirmed_at) return false;
  return isPlatformOwnerEmail(user.email);
}

/** Routes that exist only for the platform owner. Absent from navigation for everyone else. */
export const PLATFORM_OWNER_PATHS = [
  "/payment-settings",
  "/pilot-access",
  "/feedback-review",
  "/payment-audit",
] as const;

export function isPlatformOwnerPath(pathname: string): boolean {
  return PLATFORM_OWNER_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

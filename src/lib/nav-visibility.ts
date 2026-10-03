import type { AppRole } from "@/lib/roles";

export type NavVisibility = {
  roles: AppRole[];
  /** Platform-owner exclusive: not rendered for anyone else, whatever their role. */
  ownerOnly?: boolean;
  /** Also visible to the platform owner even if their role is not listed. */
  ownerAlso?: boolean;
};

/** Capability check for navigation: role membership plus platform-owner flags. */
export function canSeeNavItem(item: NavVisibility, role: AppRole, platformOwner: boolean): boolean {
  // Owner-only links depend on identity alone: the confirmed platform owner
  // sees them whatever their workspace role (e.g. parent); nobody else does.
  if (item.ownerOnly) return platformOwner;
  if (item.roles.includes(role)) return true;
  return Boolean(item.ownerAlso && platformOwner);
}

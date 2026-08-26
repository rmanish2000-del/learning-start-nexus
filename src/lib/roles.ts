export type AppRole = "admin" | "educator" | "student" | "reviewer" | "parent";

export function roleHome(role: AppRole): "/dashboard" | "/home" | "/launch-audit" | "/parent" {
  if (role === "student") return "/home";
  if (role === "reviewer") return "/launch-audit";
  if (role === "parent") return "/parent";
  return "/dashboard";
}

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  educator: "Educator",
  student: "Student",
  reviewer: "Reviewer",
  parent: "Parent",
};

// Sprint 5A: reviewers are read-only and limited to audit surfaces. The
// server-side document gate and every write server function already exclude
// the role; this list drives the client-side route gate and navigation.
export const REVIEWER_ALLOWED_PATHS = [
  "/verification",
  "/assessment-verification",
  "/rls-verification",
  "/assessment-audit",
  "/assessment-proof",
  "/sprint-3-audit",
  "/sprint-4-audit",
  "/sprint-5-audit",
  "/launch-audit",
  "/curriculum",
  "/curriculum-audit",
  "/assessment-blueprint",
  "/assessment-blueprint-audit",
  "/question-bank",
  "/question-bank-audit",
  "/assessment-builder",
  "/assessment-builder-audit",
  "/diagnostic-engine",
  "/diagnostic-engine-audit",
  "/gap-analysis",
  "/gap-analysis-audit",
  "/quick-start",
  "/help",
  "/outcome-proof",
  "/pilot-evidence",
] as const;

export function isReviewerAllowedPath(pathname: string): boolean {
  return matchesPath(REVIEWER_ALLOWED_PATHS, pathname);
}

// Students only ever reach their own learning surfaces. Every staff, audit and
// curriculum-authoring route is off limits regardless of navigation links.
export const STUDENT_ALLOWED_PATHS = [
  "/home",
  "/session",
  "/assessment",
  "/tutor",
  "/settings",
  "/quick-start",
  "/help",
] as const;

export function isStudentAllowedPath(pathname: string): boolean {
  return matchesPath(STUDENT_ALLOWED_PATHS, pathname);
}

// Audit / verification surfaces are restricted to admins and reviewers.
export const AUDIT_PATHS = [
  "/verification",
  "/assessment-verification",
  "/rls-verification",
  "/assessment-audit",
  "/assessment-proof",
  "/sprint-3-audit",
  "/sprint-4-audit",
  "/sprint-5-audit",
  "/launch-audit",
  "/curriculum-audit",
  "/assessment-blueprint-audit",
  "/question-bank-audit",
  "/assessment-builder-audit",
  "/diagnostic-engine-audit",
  "/gap-analysis-audit",
] as const;

export function isAuditPath(pathname: string): boolean {
  return matchesPath(AUDIT_PATHS, pathname);
}

function matchesPath(routes: readonly string[], pathname: string): boolean {
  return routes.some((route) => pathname === route || pathname.startsWith(route + "/"));
}

export type AppRole = "admin" | "educator" | "student";

export function roleHome(role: AppRole): "/dashboard" | "/home" {
  return role === "student" ? "/home" : "/dashboard";
}

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  educator: "Educator",
  student: "Student",
};

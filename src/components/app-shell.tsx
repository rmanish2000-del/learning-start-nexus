import { useQuery } from "@tanstack/react-query";
import { Link, getRouteApi } from "@tanstack/react-router";
import { BookOpen, ClipboardCheck, ClipboardList, Crosshair, FileCheck2, FileSearch, FlaskConical, GitBranch, GraduationCap, HeartHandshake, LayoutDashboard, Rocket, Settings, ShieldCheck, Sparkles, TrendingUp, UserCog, Users } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, type AppRole } from "@/lib/roles";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: AppRole[];
  exact?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "educator"] },
  { to: "/learners", label: "Learners", icon: Users, roles: ["admin", "educator"] },
  { to: "/assessments", label: "Assessments", icon: ClipboardList, roles: ["admin", "educator"] },
  { to: "/curriculum", label: "Curriculum", icon: BookOpen, roles: ["admin", "educator", "reviewer"], exact: true },
  { to: "/interventions", label: "Interventions", icon: Crosshair, roles: ["admin", "educator"] },
  { to: "/assignments", label: "Assignments", icon: UserCog, roles: ["admin"] },
  { to: "/admin", label: "Admin", icon: ShieldCheck, roles: ["admin"] },
  { to: "/home", label: "My Learning", icon: GraduationCap, roles: ["student"], exact: true },
  { to: "/parent", label: "My Child", icon: HeartHandshake, roles: ["parent"], exact: true },
];

const SYSTEM_ITEMS: NavItem[] = [
  { to: "/settings", label: "Settings", icon: Settings, roles: ["admin", "educator", "student"] },
  { to: "/verification", label: "Verification", icon: FlaskConical, roles: ["admin", "educator", "student", "reviewer"] },
  { to: "/assessment-verification", label: "Assessment QA", icon: ClipboardCheck, roles: ["admin", "educator", "student", "reviewer"] },
  { to: "/rls-verification", label: "RLS Policies", icon: ShieldCheck, roles: ["admin", "educator", "reviewer"] },
  { to: "/assessment-audit", label: "Audit Trail", icon: FileSearch, roles: ["admin", "educator", "reviewer"] },
  { to: "/assessment-proof", label: "Build Proof", icon: FileCheck2, roles: ["admin", "educator", "reviewer"] },
  { to: "/sprint-3-audit", label: "Sprint 3 Audit", icon: ShieldCheck, roles: ["admin", "educator", "student", "reviewer"] },
  { to: "/sprint-4-audit", label: "Sprint 4 Audit", icon: Sparkles, roles: ["admin", "educator", "student", "reviewer"] },
  { to: "/sprint-5-audit", label: "Sprint 5 Audit", icon: TrendingUp, roles: ["admin", "educator", "student", "reviewer"] },
  { to: "/launch-audit", label: "Launch Audit", icon: Rocket, roles: ["admin", "educator", "reviewer"] },
  { to: "/curriculum-audit", label: "Curriculum Audit", icon: GitBranch, roles: ["admin", "educator", "reviewer"] },
];

const TITLES: [RegExp, string][] = [
  [/^\/learners\/.+/, "Learner profile"],
  [/^\/learners/, "Learners"],
  [/^\/assessments/, "Assessments"],
  [/^\/assessment\/.+/, "Assessment detail"],
  [/^\/session\/.+/, "Assessment"],
  [/^\/assignments/, "Assignments"],
  [/^\/admin/, "Admin"],
  [/^\/dashboard/, "Dashboard"],
  [/^\/home/, "My learning"],
  [/^\/parent/, "Parent portal"],
  [/^\/settings/, "Settings"],
  [/^\/verification/, "Verification"],
  [/^\/assessment-verification/, "Assessment verification"],
  [/^\/rls-verification/, "RLS verification"],
  [/^\/assessment-audit/, "Assessment audit report"],
  [/^\/assessment-proof/, "Assessment build proof"],
  [/^\/interventions/, "Interventions"],
  [/^\/sprint-3-audit/, "Sprint 3 audit center"],
  [/^\/tutor\/.+/, "AI Tutor"],
  [/^\/sprint-4-audit/, "Sprint 4 audit center"],
  [/^\/sprint-5-audit/, "Sprint 5 audit center"],
  [/^\/launch-audit/, "Launch readiness audit"],
  [/^\/curriculum-audit/, "Curriculum audit center"],
  [/^\/curriculum/, "Curriculum"],
];

const authRoute = getRouteApi("/_authenticated");

function NavLinks({ items }: { items: NavItem[] }) {
  const { role } = authRoute.useRouteContext();
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarMenu>
      {items.filter((item) => item.roles.includes(role)).map((item) => (
        <SidebarMenuItem key={item.to}>
          <SidebarMenuButton
            asChild
            tooltip={item.label}
            className="data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground"
          >
            <Link
              to={item.to}
              {...(item.exact ? { activeOptions: { exact: true } } : {})}
              onClick={() => isMobile && setOpenMobile(false)}
            >
              <item.icon />
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

// Persistent audit indicator: current role, organization, and assigned educator.
function DemoContextBar() {
  const { user, role, profile } = authRoute.useRouteContext();

  const { data: org } = useQuery({
    queryKey: ["org", profile?.org_id],
    enabled: !!profile?.org_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", profile!.org_id!)
        .single();
      return data;
    },
  });

  const { data: myLearner } = useQuery({
    queryKey: ["my-learner-educator", user.id],
    enabled: role === "student",
    queryFn: async () => {
      const { data } = await supabase
        .from("learners")
        .select("educator_id")
        .eq("student_user_id", user.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: educatorProfile } = useQuery({
    queryKey: ["educator", myLearner?.educator_id],
    enabled: !!myLearner?.educator_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", myLearner!.educator_id!)
        .maybeSingle();
      return data;
    },
  });

  const educatorLabel =
    role === "student"
      ? myLearner
        ? (educatorProfile?.full_name ?? "…")
        : "Unassigned"
      : role === "educator"
        ? `${profile?.full_name ?? "You"} (you)`
        : role === "parent"
          ? "Your child's educator"
          : "All educators";

  return (
    <div className="border-b bg-muted/40 px-4 py-1.5 text-xs text-muted-foreground print:hidden">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="rounded-full border border-dashed border-primary/40 px-2 py-0.5 font-medium uppercase tracking-wide text-primary">
          Demo
        </span>
        <span>
          Role: <span className="font-medium text-foreground">{ROLE_LABELS[role]}</span>
        </span>
        <span>
          Org: <span className="font-medium text-foreground">{org?.name ?? "…"}</span>
        </span>
        <span>
          Educator: <span className="font-medium text-foreground">{educatorLabel}</span>
        </span>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Sidebar className="print:hidden">
        <SidebarHeader className="px-3 py-3.5">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-4.5 w-4.5" />
            </span>
            <span className="text-base font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
              EduOS
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent data-tour="sidebar-nav">
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <NavLinks items={NAV_ITEMS} />
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>System</SidebarGroupLabel>
            <SidebarGroupContent>
              <NavLinks items={SYSTEM_ITEMS} />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-3">
          <p className="truncate text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
            Brightpath Learning
          </p>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-13 items-center justify-between border-b px-4 print:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger />
            <HeaderTitle />
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>
        <DemoContextBar />
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function HeaderTitle() {
  const { role } = authRoute.useRouteContext();

  return (
    <h1 className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
      <PathTitle />
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-[11px] font-medium",
          role === "admin" && "bg-destructive/10 text-destructive",
          role === "educator" && "bg-primary/10 text-primary",
          role === "student" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
          role === "parent" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        )}
      >
        {ROLE_LABELS[role]}
      </span>
    </h1>
  );
}

import { useLocation } from "@tanstack/react-router";

function PathTitle() {
  const pathname = useLocation({ select: (l) => l.pathname });
  const match = TITLES.find(([pattern]) => pattern.test(pathname));
  return <span className="truncate">{match?.[1] ?? "EduOS"}</span>;
}

import { useWorkspaceContext } from "@/lib/workspace-context";
import { useQuery } from "@tanstack/react-query";
import { Link, getRouteApi } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CENTRE_SETUP_QUERY_KEY } from "@/components/centre-setup-checklist";
import { getCentreSetupFn } from "@/lib/centre-setup.functions";
import {
  BadgeCheck,
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  Compass,
  CreditCard,
  Crosshair,
  FileCheck2,
  FileQuestion,
  FileSearch,
  FlaskConical,
  Gauge,
  GitBranch,
  GraduationCap,
  HeartHandshake,
  LayoutDashboard,
  LifeBuoy,
  MessageSquare,
  PieChart,
  Rocket,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  Ticket,
  TrendingUp,
  UserCog,
  Users,
} from "lucide-react";
import { HowItWorksDialog } from "@/components/how-it-works";
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
import { ROLE_LABELS } from "@/lib/roles";
import { canSeeNavItem, type NavVisibility } from "@/lib/nav-visibility";

type NavItem = NavVisibility & {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "educator"] },
  { to: "/learners", label: "Learners", icon: Users, roles: ["admin", "educator"] },
  { to: "/assessments", label: "Assessments", icon: ClipboardList, roles: ["admin", "educator"] },
  {
    to: "/curriculum",
    label: "Curriculum",
    icon: BookOpen,
    roles: ["admin", "educator", "reviewer"],
    exact: true,
  },
  {
    to: "/assessment-blueprint",
    label: "Blueprint",
    icon: Crosshair,
    roles: ["admin", "educator", "reviewer"],
    exact: true,
  },
  {
    to: "/question-bank",
    label: "Question Bank",
    icon: FileQuestion,
    roles: ["admin", "educator", "reviewer"],
    exact: true,
  },
  {
    to: "/assessment-builder",
    label: "Assessment Builder",
    icon: ClipboardCheck,
    roles: ["admin", "educator", "reviewer"],
    exact: true,
  },
  {
    to: "/diagnostic-engine",
    label: "Diagnostic Engine",
    icon: Gauge,
    roles: ["admin", "educator", "reviewer"],
    exact: true,
  },
  {
    to: "/gap-analysis",
    label: "Gap Analysis",
    icon: PieChart,
    roles: ["admin", "educator", "reviewer"],
    exact: true,
  },
  {
    to: "/outcome-proof",
    label: "Outcome Proof",
    icon: TrendingUp,
    roles: ["admin", "educator", "reviewer", "parent"],
    exact: true,
  },
  {
    to: "/pilot-evidence",
    label: "Pilot Evidence",
    icon: BadgeCheck,
    roles: ["admin", "educator", "reviewer"],
    exact: true,
  },
  { to: "/interventions", label: "Interventions", icon: Crosshair, roles: ["admin", "educator"] },
  { to: "/assignments", label: "Assignments", icon: UserCog, roles: ["admin"] },
  { to: "/admin", label: "Admin", icon: ShieldCheck, roles: ["admin"] },
  // Platform-level surfaces: absent from the DOM for every centre admin.
  {
    to: "/payment-settings",
    label: "Payment Settings",
    icon: CreditCard,
    roles: ["admin"],
    exact: true,
    ownerOnly: true,
  },
  {
    to: "/pilot-access",
    label: "Pilot Access",
    icon: Ticket,
    roles: ["admin"],
    exact: true,
    ownerOnly: true,
  },
  {
    to: "/feedback-review",
    label: "Feedback",
    icon: MessageSquare,
    roles: ["admin"],
    exact: true,
    ownerOnly: true,
  },
  {
    to: "/payment-audit",
    label: "Payment Audit",
    icon: CreditCard,
    roles: [],
    exact: true,
    ownerOnly: true,
  },
  {
    to: "/auto-verification",
    label: "Auto Verification",
    icon: BadgeCheck,
    roles: ["reviewer"],
    exact: true,
    ownerAlso: true,
  },
  { to: "/home", label: "My Learning", icon: GraduationCap, roles: ["student"], exact: true },
  { to: "/exam-pattern", label: "Exam Pattern", icon: Target, roles: ["student"], exact: true },
  { to: "/parent", label: "My Child", icon: HeartHandshake, roles: ["parent"], exact: true },
];

// UX Phase 1 · UX-07: the System group collapses to Settings plus a single
// Verification entry. Every audit centre is indexed inside that hub, so the
// sidebar stays scannable while deep links keep working.
const SYSTEM_ITEMS: NavItem[] = [
  { to: "/settings", label: "Settings", icon: Settings, roles: ["admin", "educator", "student"] },
  {
    to: "/verification",
    label: "Verification",
    icon: ShieldCheck,
    roles: ["reviewer"],
    ownerAlso: true,
  },
];

// Centre admins see Quick Start pinned first in Workspace until the six-step
// setup checklist is complete (server-side state); then it leaves the main
// navigation and stays reachable from Support.
const CENTRE_QUICK_START: NavItem = {
  to: "/quick-start",
  label: "Quick Start",
  icon: Rocket,
  roles: ["admin"],
  exact: true,
};

const SUPPORT_ITEMS: NavItem[] = [
  {
    to: "/quick-start",
    label: "Quick Start",
    icon: Compass,
    roles: ["admin", "educator", "student", "reviewer", "parent"],
    exact: true,
  },
  {
    to: "/help",
    label: "Help Center",
    icon: LifeBuoy,
    roles: ["admin", "educator", "student", "reviewer", "parent"],
    exact: true,
  },
  {
    to: "/role-academy",
    label: "Role Academy",
    icon: GraduationCap,
    roles: ["admin", "educator", "student", "reviewer", "parent"],
    exact: true,
  },
];

const TITLES: [RegExp, string][] = [
  [/^\/ux-phase1-plan/, "UX Phase 1 implementation plan"],
  [/^\/role-academy/, "Role academy"],
  [/^\/quick-start/, "Quick start"],
  [/^\/help/, "Help center"],
  [/^\/diagnostic-engine-audit/, "Diagnostic engine audit center"],
  [/^\/diagnostic-engine/, "Diagnostic engine"],
  [/^\/gap-analysis-audit/, "Gap analysis audit center"],
  [/^\/payment-audit/, "Payment audit dashboard"],
  [/^\/payment-settings/, "Payment settings"],
  [/^\/pilot-access/, "Pilot access"],
  [/^\/feedback-review/, "Feedback review"],
  [/^\/auto-verification/, "Automated verification"],
  [/^\/exam-pattern/, "Exam pattern practice"],
  [/^\/gap-analysis/, "Gap analysis"],
  [/^\/learners\/.+/, "Learner profile"],
  [/^\/learners/, "Learners"],
  [/^\/assessments/, "Assessments"],
  [/^\/question-bank-audit/, "Question bank audit center"],
  [/^\/question-bank/, "Question bank"],
  [/^\/assessment-builder-audit/, "Assessment builder audit center"],
  [/^\/assessment-builder/, "Assessment builder"],
  [/^\/assessment-blueprint-audit/, "Blueprint audit center"],
  [/^\/assessment-blueprint/, "Assessment blueprint"],
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
  [/^\/pilot-evidence/, "Pilot evidence"],
];

function NavGroup({ label, items }: { label: string; items: NavItem[] }) {
  const { role, platformOwner } = useWorkspaceContext();
  if (!items.some((item) => canSeeNavItem(item, role, platformOwner))) return null;
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <NavLinks items={items} />
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function NavLinks({ items }: { items: NavItem[] }) {
  const { role, platformOwner } = useWorkspaceContext();
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarMenu>
      {items
        .filter((item) => canSeeNavItem(item, role, platformOwner))
        .map((item) => (
          <SidebarMenuItem key={item.to}>
            <SidebarMenuButton
              asChild
              tooltip={item.label}
              className="data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground"
            >
              <Link
                to={item.to}
                {...(item.exact ? { activeOptions: { exact: true } } : {})}
                activeProps={{ "aria-current": "page" }}
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

// Persistent context indicator: current role, organization, and assigned educator.
function DemoContextBar() {
  const { user, role, profile } = useWorkspaceContext();

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

// Sidebar footer shows the signed-in user's own centre, never a fixed name.
function OrgFooterLabel() {
  const { profile } = useWorkspaceContext();
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
  return (
    <p className="truncate text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
      {org?.name ?? "EduOS"}
    </p>
  );
}

// Workspace navigation for the signed-in role. Centre admins get Quick Start
// pinned at position 1 until their server-side setup checklist completes.
function WorkspaceNav() {
  const { role } = useWorkspaceContext();
  const fetchSetup = useServerFn(getCentreSetupFn);
  const { data: setup } = useQuery({
    queryKey: CENTRE_SETUP_QUERY_KEY,
    queryFn: () => fetchSetup(),
    enabled: role === "admin",
    staleTime: 30_000,
  });
  // While the checklist state is loading (first paint), keep the item visible:
  // a first-login admin must never miss it. Only a confirmed "complete" hides it.
  const pinQuickStart = role === "admin" && setup?.complete !== true;
  const items = pinQuickStart ? [CENTRE_QUICK_START, ...NAV_ITEMS] : NAV_ITEMS;
  return <NavGroup label="Workspace" items={items} />;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to content
      </a>
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
          <WorkspaceNav />
          <NavGroup label="Support" items={SUPPORT_ITEMS} />
          <NavGroup label="System" items={SYSTEM_ITEMS} />
        </SidebarContent>
        <SidebarFooter className="p-3">
          <OrgFooterLabel />
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
        <main
          id="main-content"
          tabIndex={-1}
          className="min-w-0 max-w-full flex-1 overflow-x-clip p-4 md:p-6"
        >
          {children}
        </main>
      </SidebarInset>
      <HowItWorksDialog />
    </SidebarProvider>
  );
}

function HeaderTitle() {
  const { role } = useWorkspaceContext();

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

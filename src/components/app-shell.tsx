import { useQuery } from "@tanstack/react-query";
import { Link, getRouteApi } from "@tanstack/react-router";
import { GraduationCap, LayoutDashboard, ShieldCheck, UserCog, Users } from "lucide-react";
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
  { to: "/assignments", label: "Assignments", icon: UserCog, roles: ["admin"] },
  { to: "/admin", label: "Admin", icon: ShieldCheck, roles: ["admin"] },
  { to: "/home", label: "My Learning", icon: GraduationCap, roles: ["student"], exact: true },
];

const TITLES: [RegExp, string][] = [
  [/^\/learners\/.+/, "Learner profile"],
  [/^\/learners/, "Learners"],
  [/^\/assignments/, "Assignments"],
  [/^\/admin/, "Admin"],
  [/^\/dashboard/, "Dashboard"],
  [/^\/home/, "My learning"],
];

const authRoute = getRouteApi("/_authenticated");

function NavLinks() {
  const { role } = authRoute.useRouteContext();
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarMenu>
      {NAV_ITEMS.filter((item) => item.roles.includes(role)).map((item) => (
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
    queryKey: ["my-learner", user.id],
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
        : "All educators";

  return (
    <div className="border-b bg-muted/40 px-4 py-1.5 text-xs text-muted-foreground">
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
      <Sidebar>
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
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <NavLinks />
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
        <header className="flex h-13 items-center justify-between border-b px-4">
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

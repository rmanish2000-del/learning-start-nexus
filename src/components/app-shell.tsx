import { Link, useRouterState } from "@tanstack/react-router";
import { GraduationCap, Home, LayoutDashboard, ShieldCheck, Users } from "lucide-react";

import type { AppRole } from "@/lib/roles";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: AppRole[];
}

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "educator"] },
  { to: "/learners", label: "Learners", icon: Users, roles: ["admin", "educator"] },
  { to: "/admin", label: "Admin", icon: ShieldCheck, roles: ["admin"] },
  { to: "/home", label: "Home", icon: Home, roles: ["student"] },
];

const TITLES: [string, string][] = [
  ["/learners", "Learners"],
  ["/admin", "Admin"],
  ["/dashboard", "Dashboard"],
  ["/home", "Home"],
];

function pageTitle(pathname: string): string {
  const match = TITLES.find(([prefix]) => pathname.startsWith(prefix));
  if (match) return match[1];
  return "EduOS";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="p-4">
          <Link to="/" className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-4.5 w-4.5" />
            </div>
            <span className="truncate text-base font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
              EduOS
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.map((item) => (
                  <SidebarMenuItem key={item.to} data-role-nav={item.roles.join(",")}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.startsWith(item.to)}
                      tooltip={item.label}
                    >
                      <Link to={item.to}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
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
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <h1 className="text-sm font-semibold tracking-tight">{pageTitle(pathname)}</h1>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

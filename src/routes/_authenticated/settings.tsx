import { useQuery } from "@tanstack/react-query";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { Building2, Palette, UserRound } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABELS } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — EduOS" },
      { name: "description", content: "Your EduOS profile, organization, and appearance settings." },
    ],
  }),
  component: SettingsPage,
});

const authRoute = getRouteApi("/_authenticated");

function SettingsPage() {
  const { user, role, profile } = authRoute.useRouteContext();

  const { data: org } = useQuery({
    queryKey: ["settings-org", profile?.org_id],
    enabled: !!profile?.org_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("name, tagline, email, phone, website, timezone")
        .eq("id", profile!.org_id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Settings</h2>
        <p className="text-sm text-muted-foreground">Your profile, organization, and appearance.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserRound className="h-4 w-4" /> Profile
          </CardTitle>
          <CardDescription>How you appear to your organization.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">{profile?.full_name || "—"}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Sign-in</span>
            <span className="font-medium">
              {role === "student" ? "Handle + PIN" : user.email}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Role</span>
            <Badge variant="secondary">{ROLE_LABELS[role]}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" /> Organization
          </CardTitle>
          <CardDescription>
            {role === "admin"
              ? "Your organization's profile. Editing arrives with org management."
              : "The organization you belong to."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">{org?.name ?? "…"}</span>
          </div>
          {org?.tagline && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Tagline</span>
              <span>{org.tagline}</span>
            </div>
          )}
          {org?.email && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Contact</span>
              <span>{org.email}</span>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Timezone</span>
            <span>{org?.timezone ?? "…"}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4" /> Appearance
          </CardTitle>
          <CardDescription>Switch between light, dark, and system themes.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Theme</span>
          <ThemeToggle />
        </CardContent>
      </Card>
    </div>
  );
}

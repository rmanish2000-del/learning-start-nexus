import { useQuery } from "@tanstack/react-query";
import { createFileRoute, getRouteApi, useNavigate } from "@tanstack/react-router";
import { Building2, CheckCircle2, Compass, Palette, RotateCcw, UserRound } from "lucide-react";
import { toast } from "sonner";

import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { markOnboardingComplete, resetOnboarding } from "@/lib/onboarding";
import { ROLE_LABELS, roleHome } from "@/lib/roles";

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
  const navigate = useNavigate();

  // Safe reset for testing/support: clear the completion + tour-seen flags and
  // return to the role home, where the guided tour replays from step one.
  const handleRestartTour = () => {
    const tourId = resetOnboarding(role);
    if (!tourId) {
      toast.info("Your role has no guided tour to restart.");
      return;
    }
    toast.success("Onboarding reset — the guided tour will replay.");
    navigate({ to: roleHome(role) });
  };

  // Support escape hatch: mark everything complete so no onboarding modal or
  // forced tour can auto-start again for this browser.
  const handleMarkComplete = () => {
    markOnboardingComplete(role);
    toast.success("Onboarding marked complete — nothing will auto-start again.");
  };

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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Compass className="h-4 w-4" /> Onboarding
          </CardTitle>
          <CardDescription>
            Testing and support controls for the getting-started checklist and guided tour.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRestartTour}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Restart Tour
          </Button>
          <Button variant="outline" size="sm" onClick={handleMarkComplete}>
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Mark Tour Complete
          </Button>
          <p className="w-full text-xs text-muted-foreground">
            Restart returns you to your home page and replays the guided tour. Mark complete stops
            all onboarding modals and tours from auto-starting.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

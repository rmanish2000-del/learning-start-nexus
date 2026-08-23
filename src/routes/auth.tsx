import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { GraduationCap, KeyRound, Mail, UserRound } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { studentEmail, studentPassword } from "@/lib/auth-utils";
import { roleHome, type AppRole } from "@/lib/roles";
import { setSessionMarker } from "@/lib/session-marker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — EduOS" },
      { name: "description", content: "Sign in to EduOS with your staff email or student handle and PIN." },
      { property: "og:title", content: "Sign in — EduOS" },
      { property: "og:description", content: "Sign in to EduOS with your staff email or student handle and PIN." },
    ],
  }),
  component: AuthPage,
});

async function fetchRole(userId: string): Promise<AppRole> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return (data?.role as AppRole | undefined) ?? "student";
}

function AuthPage() {
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);

  // Already signed in? Route to the right home for the role.
  useEffect(() => {
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const role = await fetchRole(data.user.id);
      void navigate({ to: roleHome(role), replace: true });
    });
  }, [navigate]);

  const goHome = async (userId: string) => {
    const role = await fetchRole(userId);
    setSessionMarker();
    void navigate({ to: roleHome(role), replace: true });
  };

  const onStaffSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (!email || !password) {
      toast.error("Enter your email and password.");
      return;
    }
    setPending(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setPending(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "Invalid email or password." : error.message);
      return;
    }
    if (data.user) await goHome(data.user.id);
  };

  const onStudentSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const handle = String(form.get("handle") ?? "");
    const pin = String(form.get("pin") ?? "");
    if (!handle.trim() || !/^\d{6}$/.test(pin)) {
      toast.error("Enter your handle and 6-digit PIN.");
      return;
    }
    setPending(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: studentEmail(handle),
      password: studentPassword(handle, pin),
    });
    setPending(false);
    if (error) {
      toast.error("That handle and PIN don't match. Check with your educator if you forgot them.");
      return;
    }
    if (data.user) await goHome(data.user.id);
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-foreground/15">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">EduOS</span>
        </div>
        <div className="space-y-8">
          <h1 className="max-w-md text-4xl font-semibold leading-tight tracking-tight">
            See every learner clearly.
          </h1>
          <ul className="max-w-md space-y-4 text-sm text-primary-foreground/85">
            <li className="flex gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-foreground/70" />
              Role-based workspaces for admins, educators, and students
            </li>
            <li className="flex gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-foreground/70" />
              Live learner profiles with mastery history and evidence
            </li>
            <li className="flex gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-foreground/70" />
              Built for tutoring centers that act on insight
            </li>
          </ul>
        </div>
        <p className="text-xs text-primary-foreground/60">Brightpath Learning · Phase 1 demo</p>
      </div>

      {/* Sign-in panel */}
      <div className="flex items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 lg:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <GraduationCap className="h-5 w-5" />
              </div>
              <span className="text-lg font-semibold tracking-tight">EduOS</span>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
            <p className="text-sm text-muted-foreground">
              Staff use their work email. Students use their handle and PIN.
            </p>
          </div>

          <Tabs defaultValue="staff">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="staff">Staff</TabsTrigger>
              <TabsTrigger value="student">Student</TabsTrigger>
            </TabsList>

            <TabsContent value="staff" className="pt-6">
              <form onSubmit={onStaffSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@brightpath.education"
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={pending}>
                  {pending ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="student" className="pt-6">
              <form onSubmit={onStudentSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="handle">Student handle</Label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="handle"
                      name="handle"
                      autoCapitalize="none"
                      autoComplete="username"
                      placeholder="e.g. aarav"
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pin">6-digit PIN</Label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="pin"
                      name="pin"
                      type="password"
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={6}
                      placeholder="••••••"
                      className="pl-9 tracking-[0.5em]"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your educator gives you your handle and PIN.
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={pending}>
                  {pending ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="rounded-lg border border-dashed bg-muted/50 p-4 text-xs leading-relaxed text-muted-foreground">
            <p className="mb-2 font-medium text-foreground">Demo accounts</p>
            <p>
              Admin — <span className="font-mono">admin@eduos.dev</span> /{" "}
              <span className="font-mono">Admin#2026</span>
            </p>
            <p>
              Educator — <span className="font-mono">priya.nair@eduos.dev</span> /{" "}
              <span className="font-mono">Teach#2026</span>
            </p>
            <p>
              Student — handle <span className="font-mono">aarav</span> / PIN{" "}
              <span className="font-mono">123456</span>
            </p>
            <p>
              Reviewer — <span className="font-mono">reviewer@eduos.global</span> /{" "}
              <span className="font-mono">Review#2026</span> (read-only, audit pages)
            </p>
            <p>
              Parent — <span className="font-mono">meera.patel@eduos.dev</span> /{" "}
              <span className="font-mono">Parent#2026</span> (Aarav's guardian, read-only portal)
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <Link to="/about" className="hover:text-foreground">About</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms of Service</Link>
            <Link to="/contact" className="hover:text-foreground">Contact</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

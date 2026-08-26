import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { GraduationCap, KeyRound, Mail, Phone, UserRound } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { studentEmail, studentPassword } from "@/lib/auth-utils";
import { roleHome, type AppRole } from "@/lib/roles";
import { setSessionMarker } from "@/lib/session-marker";
import { registerParent } from "@/lib/parent-account.functions";
import { registerParentSchema } from "@/lib/parent-account-shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// All optional: plain <Link to="/auth"> must stay valid everywhere.
type AuthSearch = { tab?: "staff" | "student" | "parent"; mode?: "signin" | "signup"; next?: string };

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    // Parents are the default audience. Staff must ask for their tab
    // explicitly with ?tab=staff.
    tab:
      search["tab"] === "parent" || search["tab"] === "student" || search["tab"] === "staff"
        ? search["tab"]
        : "parent",
    mode: search["mode"] === "signup" ? "signup" : "signin",
    ...(typeof search["next"] === "string" && search["next"].startsWith("/")
      ? { next: search["next"] }
      : {}),
  }),

  head: () => ({
    meta: [
      { title: "Sign in or create a parent account — EduOS" },
      {
        name: "description",
        content:
          "Create your EduOS parent account or sign in to buy a diagnostic, read the gap report and track progress. Staff and students sign in here too.",
      },
      { property: "og:title", content: "Sign in or create a parent account — EduOS" },
      {
        property: "og:description",
        content:
          "Create your EduOS parent account or sign in to buy a diagnostic, read the gap report and track progress.",
      },
    ],
  }),

  component: AuthPage,
});

/**
 * Resolves the workspace role for a signed-in user.
 *
 * Self-service signup only exists for parents, so an account that reaches this
 * page with no role row was created by the parent form and had its profile
 * write deferred by email confirmation. Claim the `parent` role here instead of
 * silently defaulting to `student`.
 */
async function resolveRole(user: { id: string; user_metadata?: Record<string, unknown> }): Promise<AppRole> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (data?.role) return data.role as AppRole;

  const meta = user.user_metadata ?? {};
  const fullName = typeof meta["full_name"] === "string" ? meta["full_name"] : "";
  const phone = typeof meta["phone"] === "string" ? meta["phone"] : "";
  try {
    await claimParentRole({ data: { fullName, ...(phone ? { phone } : {}) } });
    return "parent";
  } catch {
    return "student";
  }
}

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [pending, setPending] = useState(false);
  const [parentMode, setParentMode] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [tab, setTab] = useState<"staff" | "student" | "parent">(search.tab ?? "parent");


  // Already signed in? Route to the right home for the role.
  useEffect(() => {
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      if (search.next) {
        window.location.replace(search.next);
        return;
      }
      const role = await fetchRole(data.user.id);
      void navigate({ to: roleHome(role), replace: true });
    });
  }, [navigate, search.next]);

  const goHome = async (userId: string) => {
    setSessionMarker();
    if (search.next) {
      // Return the parent to the purchase they were mid-way through.
      window.location.replace(search.next);
      return;
    }
    const role = await fetchRole(userId);
    void navigate({ to: roleHome(role), replace: true });
  };

  // Parent sign-up: auth user first, then the parent profile (name + mobile)
  // and the `parent` role. Purchase remains blocked until both exist.
  const onParentSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("p-email") ?? "").trim();
    const password = String(form.get("p-password") ?? "");
    const fullName = String(form.get("p-name") ?? "").trim();
    const phone = String(form.get("p-phone") ?? "").trim();

    setPending(true);
    try {
      if (parentMode === "signup") {
        const parsed = registerParentSchema.safeParse({ fullName, email, phone });
        if (!parsed.success) {
          toast.error(parsed.error.issues[0]?.message ?? "Check your details.");
          return;
        }
        if (password.length < 8) {
          toast.error("Use a password of at least 8 characters.");
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/auth` },
        });
        if (error) {
          toast.error(error.message);
          return;
        }
        const signedIn = await supabase.auth.signInWithPassword({ email, password });
        if (signedIn.error || !signedIn.data.user) {
          toast.message("Account created. Confirm your email, then sign in to continue.");
          setParentMode("signin");
          return;
        }
        await registerParent({ data: parsed.data });
        toast.success("Account ready.");
        await goHome(signedIn.data.user.id);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message === "Invalid login credentials" ? "Invalid email or password." : error.message);
        return;
      }
      if (data.user) await goHome(data.user.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not complete sign-in.");
    } finally {
      setPending(false);
    }
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
        <p className="text-xs text-primary-foreground/60">Learning intelligence for tutoring centers</p>
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
            <h2 className="text-2xl font-semibold tracking-tight">
              {tab === "parent" && parentMode === "signup" ? "Create your parent account" : "Sign in"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {tab === "staff"
                ? "Staff use their work email and password."
                : tab === "student"
                  ? "Students use the handle and PIN from their educator."
                  : "Parents sign in with email. New here? Create an account in under a minute."}
            </p>
          </div>

          <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
            <TabsList className={tab === "staff" ? "grid w-full grid-cols-3" : "grid w-full grid-cols-2"}>
              <TabsTrigger value="parent">Parent</TabsTrigger>
              <TabsTrigger value="student">Student</TabsTrigger>
              {tab === "staff" ? <TabsTrigger value="staff">Staff</TabsTrigger> : null}
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

            <TabsContent value="parent" className="pt-6">
              <form onSubmit={onParentSubmit} className="space-y-4">
                {parentMode === "signup" ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="p-name">Your full name</Label>
                      <div className="relative">
                        <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="p-name" name="p-name" autoComplete="name" placeholder="Priya Sharma" className="pl-9" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="p-phone">Mobile</Label>
                      <div className="relative">
                        <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="p-phone" name="p-phone" inputMode="tel" autoComplete="tel" placeholder="9XXXXXXXXX" className="pl-9" required />
                      </div>
                    </div>
                  </>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="p-email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="p-email" name="p-email" type="email" autoComplete="email" placeholder="you@example.com" className="pl-9" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-password">Password</Label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="p-password"
                      name="p-password"
                      type="password"
                      autoComplete={parentMode === "signup" ? "new-password" : "current-password"}
                      placeholder="••••••••"
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={pending}>
                  {pending
                    ? "Please wait…"
                    : parentMode === "signup"
                      ? "Create parent account"
                      : "Sign in"}
                </Button>
                <button
                  type="button"
                  className="w-full text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  onClick={() => setParentMode(parentMode === "signup" ? "signin" : "signup")}
                >
                  {parentMode === "signup"
                    ? "Already have an account? Sign in"
                    : "New here? Create a parent account"}
                </button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="rounded-lg border border-dashed bg-muted/50 p-4 text-xs leading-relaxed text-muted-foreground">
            Trouble signing in? Parents can reset from this page; your tutoring centre admin resets
            staff passwords and student PINs.
          </p>

          {tab !== "staff" ? (
            <button
              type="button"
              onClick={() => setTab("staff")}
              className="w-full text-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Staff access
            </button>
          ) : null}


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

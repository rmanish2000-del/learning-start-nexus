import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router";
import {
  Building2,
  CheckCircle2,
  FlaskConical,
  KeyRound,
  Lock,
  Server,
  ShieldCheck,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { probeRouteProtection } from "@/lib/verification.functions";
import { ROLE_LABELS } from "@/lib/roles";
import { AUDIT_CENTERS, AUDIT_DOMAINS } from "@/lib/verification-hub";

export const Route = createFileRoute("/_authenticated/verification")({
  head: () => ({
    meta: [
      { title: "Verification — EduOS" },
      { name: "description", content: "Internal Phase 1 verification page: identity, role, organization, and RLS evidence." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VerificationPage,
});

const authRoute = getRouteApi("/_authenticated");

// Live, RLS-scoped evidence. Every query runs as the signed-in user through
// the browser client, so Postgres row-level security decides what comes back.
function useVerificationData(userId: string, orgId: string | null, role: string) {
  const orgs = useQuery({
    queryKey: ["verify-orgs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("organizations").select("id, name");
      if (error) throw error;
      return data;
    },
  });

  const learners = useQuery({
    queryKey: ["verify-learners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("learners").select("id, full_name, educator_id, student_user_id");
      if (error) throw error;
      return data;
    },
  });

  const myLearner = useQuery({
    queryKey: ["verify-my-learner", userId],
    enabled: role === "student",
    queryFn: async () => {
      const { data } = await supabase
        .from("learners")
        .select("id, full_name, handle, educator_id")
        .eq("student_user_id", userId)
        .maybeSingle();
      return data;
    },
  });

  void orgId;
  return { orgs, learners, myLearner };
}

const ACCESS_MATRIX: { route: string; admin: string; educator: string; student: string; anon: string }[] = [
  { route: "/dashboard", admin: "allow", educator: "allow", student: "redirect:/home", anon: "redirect:/auth" },
  { route: "/learners", admin: "allow", educator: "allow", student: "redirect:/home", anon: "redirect:/auth" },
  { route: "/learners/$learnerId", admin: "allow (org-scoped)", educator: "allow (org-scoped)", student: "redirect:/home", anon: "redirect:/auth" },
  { route: "/assignments", admin: "allow", educator: "redirect:/dashboard", student: "redirect:/home", anon: "redirect:/auth" },
  { route: "/admin", admin: "allow", educator: "redirect:/dashboard", student: "redirect:/home", anon: "redirect:/auth" },
  { route: "/settings", admin: "allow", educator: "allow", student: "allow", anon: "redirect:/auth" },
  { route: "/home", admin: "redirect:/dashboard", educator: "redirect:/dashboard", student: "allow", anon: "redirect:/auth" },
];

// Credentials are never listed in the product. Admins hold them out of band.
const TEST_ACCOUNTS = [
  { role: "Admin", org: "Brightpath Learning (Org A)", credential: "admin@eduos.dev", secret: "held by admin" },
  { role: "Educator", org: "Brightpath Learning (Org A)", credential: "priya.nair@eduos.dev", secret: "held by admin" },
  { role: "Educator", org: "Brightpath Learning (Org A)", credential: "marcus.reed@eduos.dev", secret: "held by admin" },
  { role: "Educator", org: "Northstar Tutoring (Org B)", credential: "nina.osei@northstar.education", secret: "held by admin" },
  { role: "Student", org: "Brightpath Learning (Org A)", credential: "handle: aarav", secret: "PIN held by educator" },
  { role: "Student", org: "Northstar Tutoring (Org B)", credential: "handle: tom", secret: "PIN held by educator" },
];

const SECURITY_CHECKLIST = [
  "Row Level Security enabled on all 9 tables (organizations, profiles, user_roles, learners, mastery_history, learner_assessments, learner_evidence, learning_plan_items, learning_items)",
  "Every learner-scoped policy filters by org_id = private.current_org_id() — cross-organization reads return zero rows",
  "Role checks use private.has_role() — a security-definer function in the non-API-exposed private schema",
  "Server middleware answers anonymous document requests to protected routes with 302 → /auth before any HTML/JS ships; the client-side beforeLoad gate re-checks the session with getUser()",
  "Admin/educator/student route guards redirect cross-role access (see access matrix above)",
  "Privileged server functions (create user, create learner, reset PIN, assign educator) re-verify the caller's role server-side",
  "Students authenticate with handle + 6-digit PIN mapped to synthetic emails — no inbox required",
  "CSRF middleware protects all server-function endpoints",
];

function AccessCell({ value }: { value: string }) {
  if (value.startsWith("allow")) {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" /> {value}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <XCircle className="h-3.5 w-3.5 text-destructive/70" /> {value}
    </span>
  );
}

function VerificationPage() {
  const { user, role, profile } = authRoute.useRouteContext();
  const { orgs, learners, myLearner } = useVerificationData(user.id, profile?.org_id ?? null, role);

  // Live anonymous probe against THIS deployment: the server fetches each
  // protected route with no cookies, exactly like an incognito visitor.
  const runProbe = useServerFn(probeRouteProtection);
  const probe = useQuery({
    queryKey: ["route-protection-probe"],
    queryFn: () => runProbe(),
    staleTime: 30_000,
  });

  const visibleLearners = learners.data ?? [];
  const assignedToMe = visibleLearners.filter((l) => l.educator_id === user.id);
  const orgName = orgs.data?.find((o) => o.id === profile?.org_id)?.name ?? "—";

  const learnerCountLabel =
    role === "student"
      ? myLearner.data
        ? "1 (own record only)"
        : "0"
      : String(visibleLearners.length);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FlaskConical className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Phase 1 verification</h2>
          <p className="text-sm text-muted-foreground">
            Internal test page. Every figure below is queried live as the signed-in user, so
            row-level security decides what is visible.
          </p>
        </div>
      </div>

      <AuditHubIndex />

      {/* Identity / role / org */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound className="h-4 w-4" /> Current user
            </CardTitle>
            <CardDescription>From the authenticated session</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{profile?.full_name || "—"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">User ID</span>
              <span className="font-mono text-xs">{user.id}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Auth method</span>
              <span className="font-medium">
                {role === "student" ? "Handle + 6-digit PIN" : "Email + password"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4" /> Role &amp; organization
            </CardTitle>
            <CardDescription>Resolved server-side via user_roles + profiles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Current role</span>
              <Badge variant={role === "admin" ? "default" : "secondary"}>{ROLE_LABELS[role]}</Badge>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Organization</span>
              <span className="font-medium">{orgName}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Org ID</span>
              <span className="font-mono text-xs">{profile?.org_id ?? "—"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live RLS evidence */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" /> Live RLS evidence
          </CardTitle>
          <CardDescription>
            These counts come from queries executed as you. RLS filters rows before they leave the
            database — sign in as a Northstar (Org B) account and every count changes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Organizations visible to you</span>
            <span className="font-medium">
              {orgs.data ? `${orgs.data.length} — ${orgs.data.map((o) => o.name).join(", ")}` : "…"}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Learners visible to you</span>
            <span className="font-medium">{learners.data ? learnerCountLabel : "…"}</span>
          </div>
          {role === "educator" && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Assigned to you</span>
              <span className="font-medium">{learners.data ? assignedToMe.length : "…"}</span>
            </div>
          )}
          {role === "student" && myLearner.data && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Your learner record</span>
              <span className="font-medium">
                {myLearner.data.full_name} (<span className="font-mono text-xs">@{myLearner.data.handle}</span>)
              </span>
            </div>
          )}
          <p className="pt-2 text-xs text-muted-foreground">
            Expected: Brightpath staff see 12 learners and 1 organization; Northstar staff see 1
            learner and 1 organization; students see exactly their own record.
          </p>
        </CardContent>
      </Card>

      {/* Route protection report — live probe against this deployment */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="h-4 w-4" /> Route protection report
          </CardTitle>
          <CardDescription>
            Live probe: the server requested each protected route with{" "}
            <span className="font-medium text-foreground">no cookies</span> — the same as an
            incognito browser visiting the URL directly. Every route must answer{" "}
            <span className="font-mono text-xs">302 → /auth</span> before any page content loads.
            {probe.data && (
              <>
                {" "}Probed <span className="font-mono text-xs">{probe.data.origin}</span> at{" "}
                {new Date(probe.data.probedAt).toLocaleString()}.
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Route tested</TableHead>
                <TableHead>Auth state</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Verdict</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(probe.data?.results ?? []).map((row) => (
                <TableRow key={row.route}>
                  <TableCell className="font-mono text-xs">{row.route}</TableCell>
                  <TableCell className="text-sm">Anonymous (no cookies)</TableCell>
                  <TableCell className="font-mono text-xs">
                    {row.status} → {row.location ?? "—"}
                  </TableCell>
                  <TableCell>
                    {row.redirectedToAuth ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" /> PASS
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-destructive">
                        <XCircle className="h-3.5 w-3.5" /> FAIL
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!probe.data && (
                <TableRow>
                  <TableCell colSpan={4} className="text-sm text-muted-foreground">
                    {probe.isError ? "Probe failed to run." : "Running probe…"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="rounded-lg border bg-muted/40 p-4 text-sm">
            <p className="mb-2 font-medium">Reproduce manually</p>
            <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>Open an incognito / private browser window.</li>
              <li>
                Visit{" "}
                <span className="font-mono text-xs text-foreground">
                  {probe.data?.origin ?? window.location.origin}/dashboard
                </span>{" "}
                directly.
              </li>
              <li>
                The server answers <span className="font-mono text-xs">302</span> and the browser
                lands on <span className="font-mono text-xs">/auth</span> — no dashboard markup or
                data is ever sent.
              </li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Access matrix */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4" /> Route access matrix
          </CardTitle>
          <CardDescription>
            Enforced by route guards in <span className="font-mono text-xs">beforeLoad</span> —
            verify by signing in as each test account and visiting the route directly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Route</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Educator</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Anonymous</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ACCESS_MATRIX.map((row) => (
                <TableRow key={row.route}>
                  <TableCell className="font-mono text-xs">{row.route}</TableCell>
                  <TableCell><AccessCell value={row.admin} /></TableCell>
                  <TableCell><AccessCell value={row.educator} /></TableCell>
                  <TableCell><AccessCell value={row.student} /></TableCell>
                  <TableCell><AccessCell value={row.anon} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Test accounts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4" /> Test accounts
          </CardTitle>
          <CardDescription>
            Seeded demo accounts across both organizations and all three roles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Credential</TableHead>
                <TableHead>Secret</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {TEST_ACCOUNTS.map((acct) => (
                <TableRow key={acct.credential}>
                  <TableCell><Badge variant="secondary">{acct.role}</Badge></TableCell>
                  <TableCell className="text-sm">{acct.org}</TableCell>
                  <TableCell className="font-mono text-xs">{acct.credential}</TableCell>
                  <TableCell className="font-mono text-xs">{acct.secret}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Security readiness */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" /> Security readiness
          </CardTitle>
          <CardDescription>Phase 1 controls currently enforced.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {SECURITY_CHECKLIST.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="pt-4 text-xs text-muted-foreground">
            Persistence proof: create a learner from <Link to="/learners" className="underline">Learners</Link>,
            refresh the page, and the record remains — all data is served from the database, not
            frontend state.
          </p>
        </CardContent>
      </Card>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Users className="h-3.5 w-3.5" /> This page is for internal testing only and is excluded
        from search indexing.
      </p>
    </div>
  );
}

// UX Phase 1 · UX-07 — hub index of every audit centre, grouped by domain.
export function AuditHubIndex() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Verification hub</CardTitle>
        <CardDescription>
          Every audit and verification centre, indexed by domain. Existing deep links still work.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {AUDIT_DOMAINS.map((domain) => {
          const items = AUDIT_CENTERS.filter((c) => c.domain === domain);
          if (items.length === 0) return null;
          return (
            <div key={domain} className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {domain}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {items.map((c) => (
                  <Link
                    key={c.to}
                    to={c.to}
                    className="rounded-lg border p-3 transition-colors hover:bg-accent"
                  >
                    <p className="text-sm font-medium">{c.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{c.description}</p>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

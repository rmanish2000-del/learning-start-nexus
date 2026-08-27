import { useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Link2, Plus, Unlink } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  adminSetStudentPin,
  createStaffUser,
  linkParentToLearner,
  listStudentLogins,


  listParentLinks,
  listStaffUsers,
  resetStaffPassword,
  unlinkParentFromLearner,
  updateUserRole,
} from "@/lib/admin.functions";
import { approveCentreLead } from "@/lib/centre-onboarding.functions";
import { ROLE_LABELS, type AppRole } from "@/lib/roles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryError } from "@/components/query-error";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: ({ context }) => {
    if (context.role === "student") throw redirect({ to: "/home" });
    if (context.role !== "admin") throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Admin — EduOS" },
      { name: "description", content: "Manage staff accounts, roles, and organization settings." },
      { property: "og:title", content: "Admin — EduOS" },
      { property: "og:description", content: "Manage staff accounts, roles, and organization settings." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { user, profile } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const orgId = profile?.org_id ?? null;
  const listStaffFn = useServerFn(listStaffUsers);
  const createStaffFn = useServerFn(createStaffUser);
  const resetPasswordFn = useServerFn(resetStaffPassword);
  const [resetResult, setResetResult] = useState<{ name: string; password: string } | null>(null);

  // P0 kernel: admin issues a one-time temporary password, shown once.
  const resetPasswordMutation = useMutation({
    mutationFn: (userId: string) => resetPasswordFn({ data: { userId } }),
    onSuccess: (res) => {
      setResetResult({ name: res.fullName || "This account", password: res.tempPassword });
      toast.success("Temporary password issued.");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Could not reset that password."),
  });
  const updateRoleFn = useServerFn(updateUserRole);

  const { data: org } = useQuery({
    queryKey: ["org", orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", orgId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: staff, isPending, isError: staffIsError, error: staffError, refetch: refetchStaff } = useQuery({
    queryKey: ["staff-users"],
    queryFn: () => listStaffFn(),
    retry: false,
    throwOnError: false,
  });

  const { data: learnerCount } = useQuery({
    queryKey: ["learner-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("learners")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  const createMutation = useMutation({
    mutationFn: (input: { fullName: string; email: string; role: Exclude<AppRole, "student"> }) =>
      createStaffFn({ data: input }),
    onSuccess: (result) => {
      setTempPassword(result.tempPassword);
      toast.success("Staff account created.");
      void queryClient.invalidateQueries({ queryKey: ["staff-users"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const roleMutation = useMutation({
    mutationFn: (input: { userId: string; role: AppRole }) =>
      updateRoleFn({ data: input }),
    onSuccess: () => {
      toast.success("Role updated.");
      void queryClient.invalidateQueries({ queryKey: ["staff-users"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const onAddSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    createMutation.mutate({
      fullName: String(form.get("fullName") ?? ""),
      email: String(form.get("email") ?? ""),
      role: String(form.get("role") ?? "educator") as Exclude<AppRole, "student">,
    });
  };

  const staffCount = (staff ?? []).filter((u) => u.role !== "student").length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Admin</h2>
        <p className="text-sm text-muted-foreground">
          Staff accounts, roles, and organization settings.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wide">Organization</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{org?.name ?? "Brightpath Learning"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wide">Staff</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold tabular-nums">{staffCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wide">Learners</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold tabular-nums">{learnerCount ?? "—"}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Staff accounts</CardTitle>
            <CardDescription>Admins and educators with access to this workspace</CardDescription>
          </div>
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) setTempPassword(null);
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> Add staff
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add staff member</DialogTitle>
                <DialogDescription>
                  Creates their sign-in. Share the temporary password with them.
                </DialogDescription>
              </DialogHeader>
              {tempPassword ? (
                <div className="space-y-4">
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Temporary password
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <code className="text-sm font-semibold">{tempPassword}</code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          void navigator.clipboard.writeText(tempPassword);
                          toast.success("Copied.");
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Shown once — the staff member should change it after signing in.
                    </p>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => setDialogOpen(false)}>Done</Button>
                  </DialogFooter>
                </div>
              ) : (
                <form onSubmit={onAddSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full name</Label>
                    <Input id="fullName" name="fullName" placeholder="Priya Nair" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" placeholder="priya@brightpath.education" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select name="role" defaultValue="educator">
                      <SelectTrigger id="role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="educator">Educator</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="parent">Parent / guardian</SelectItem>
                        <SelectItem value="reviewer">Reviewer (read-only)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Creating…" : "Create account"}
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {staffIsError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
              <p className="font-medium">Staff accounts couldn't be loaded.</p>
              <p className="mt-1 text-muted-foreground">
                {staffError instanceof Error ? staffError.message : "Please try again."}
              </p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => void refetchStaff()}>
                Try again
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Change role</TableHead>
                  <TableHead className="text-right">Password</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isPending &&
                  [0, 1, 2].map((i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))}
                {(staff ?? []).map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.fullName || "—"}
                      {member.id === user.id && (
                        <Badge variant="outline" className="ml-2">You</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{member.email}</TableCell>
                    <TableCell>
                      <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                        {ROLE_LABELS[member.role] ?? member.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Select
                        value={member.role}
                        disabled={member.id === user.id || roleMutation.isPending}
                        onValueChange={(role) =>
                          roleMutation.mutate({
                            userId: member.id,
                            role: role as AppRole,
                          })
                        }
                      >
                        <SelectTrigger className="ml-auto w-32" aria-label={`Role for ${member.fullName}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="educator">Educator</SelectItem>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="parent">Parent</SelectItem>
                          <SelectItem value="reviewer">Reviewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={member.id === user.id || resetPasswordMutation.isPending}
                        onClick={() => resetPasswordMutation.mutate(member.id)}
                      >
                        Reset password
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {resetResult && (
            <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
              <p className="font-medium">Temporary password for {resetResult.name}</p>
              <p className="mt-1 font-mono text-base">{resetResult.password}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Shown once. Share it directly with the person and ask them to change it in Settings
                after signing in.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => setResetResult(null)}
              >
                Done
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ParentAccessCard />

      <StudentLoginsCard />

      <PilotLeadsCard />
    </div>
  );
}

// Admin override for student sign-in credentials. Parents can do this from the
// parent portal; admins need the same control for support cases where the
// parent is unreachable or has no account yet.
function StudentLoginsCard() {
  const listFn = useServerFn(listStudentLogins);
  const setPinFn = useServerFn(adminSetStudentPin);
  const queryClient = useQueryClient();
  const [pins, setPins] = useState<Record<string, string>>({});
  const [issued, setIssued] = useState<{ name: string; handle: string; pin: string } | null>(null);

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["admin-student-logins"],
    queryFn: () => listFn(),
    retry: false,
    throwOnError: false,
  });

  const mutation = useMutation({
    mutationFn: (vars: { learnerId: string; pin: string; name: string }) =>
      setPinFn({ data: { learnerId: vars.learnerId, pin: vars.pin } }).then((res) => ({
        ...res,
        name: vars.name,
        pin: vars.pin,
      })),
    onSuccess: (res) => {
      setIssued({ name: res.name, handle: res.handle, pin: res.pin });
      setPins({});
      toast.success(res.created ? "Student login created." : "Student PIN reset.");
      void queryClient.invalidateQueries({ queryKey: ["admin-student-logins"] });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Could not set that PIN."),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Student logins</CardTitle>
        <CardDescription>
          Set or reset a student's 6-digit PIN. Students sign in with their handle and PIN.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : isError ? (
          <QueryError
            title="Couldn't load students"
            error={error as Error}
            onRetry={() => void refetch()}
          />
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No students in this organization yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Handle</TableHead>
                <TableHead>Login</TableHead>
                <TableHead className="text-right">New 6-digit PIN</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">
                    {student.fullName}
                    <span className="ml-2 text-xs text-muted-foreground">
                      Grade {student.grade}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{student.handle}</TableCell>
                  <TableCell>
                    <Badge variant={student.hasLogin ? "secondary" : "outline"}>
                      {student.hasLogin ? "Active" : "Not created"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Input
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="000000"
                        className="w-28 text-right font-mono"
                        aria-label={`New PIN for ${student.fullName}`}
                        value={pins[student.id] ?? ""}
                        onChange={(e) =>
                          setPins((prev) => ({
                            ...prev,
                            [student.id]: e.target.value.replace(/\D/g, "").slice(0, 6),
                          }))
                        }
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={(pins[student.id] ?? "").length !== 6 || mutation.isPending}
                        onClick={() =>
                          mutation.mutate({
                            learnerId: student.id,
                            pin: pins[student.id] ?? "",
                            name: student.fullName,
                          })
                        }
                      >
                        {student.hasLogin ? "Reset PIN" : "Create login"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {issued && (
          <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
            <p className="font-medium">Sign-in details for {issued.name}</p>
            <p className="mt-1 font-mono text-base">
              {issued.handle} · {issued.pin}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Shown once. Share it directly with the family.
            </p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => setIssued(null)}>
              Done
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


// Pilot applications submitted from the public landing page. Reads are
// admin-only at the database level.
function PilotLeadsCard() {
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["pilot-leads-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pilot_leads")
        .select("id, centre_name, contact_name, email, phone, learner_count, boards_grades, timeline, notes, status, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return data;
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pilot applications</CardTitle>
        <CardDescription>Submissions from the public landing page.</CardDescription>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : isError ? (
          <QueryError
            title="Couldn't load pilot applications"
            error={error as Error}
            onRetry={() => void refetch()}
          />
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No applications yet.</p>
        ) : (
          <div className="space-y-3">
            {data.map((lead) => (
              <div key={lead.id} className="rounded-lg border p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{lead.centre_name}</span>
                  <span className="text-muted-foreground">· {lead.contact_name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-1 text-muted-foreground">
                  {lead.email}
                  {lead.phone ? ` · ${lead.phone}` : ""}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[lead.learner_count, lead.boards_grades, lead.timeline]
                    .filter(Boolean)
                    .join(" · ") || "No scope details provided"}
                </p>
                {lead.notes ? <p className="mt-2">{lead.notes}</p> : null}
                <div className="mt-3 flex items-center gap-2">
                  <Badge variant={lead.status === "approved" ? "default" : "secondary"}>
                    {lead.status === "approved" ? "Approved" : "Pending review"}
                  </Badge>
                  {lead.status === "approved" ? null : (
                    <ApproveCentreDialog
                      lead={lead}
                      onApproved={() => void refetch()}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Approving an application provisions the centre's organization and its first
// admin account, then hands back one-time sign-in credentials.
function ApproveCentreDialog({
  lead,
  onApproved,
}: {
  lead: { id: string; centre_name: string; contact_name: string; email: string; phone: string | null };
  onApproved: () => void;
}) {
  const approveFn = useServerFn(approveCentreLead);
  const [open, setOpen] = useState(false);
  const [issued, setIssued] = useState<{ adminEmail: string; tempPassword: string } | null>(null);

  const mutation = useMutation({
    mutationFn: (input: {
      leadId: string;
      orgName: string;
      adminFullName: string;
      adminEmail: string;
      phone?: string | undefined;
    }) => approveFn({ data: input }),
    onSuccess: (result) => {
      setIssued({ adminEmail: result.adminEmail, tempPassword: result.tempPassword });
      toast.success(`${result.orgName} is live. Share the sign-in below.`);
      onApproved();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    mutation.mutate({
      leadId: lead.id,
      orgName: String(form.get("orgName") ?? ""),
      adminFullName: String(form.get("adminFullName") ?? ""),
      adminEmail: String(form.get("adminEmail") ?? ""),
      phone: lead.phone ?? undefined,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setIssued(null);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">Approve &amp; create centre</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve {lead.centre_name}</DialogTitle>
          <DialogDescription>
            Creates the centre organization and its first admin account.
          </DialogDescription>
        </DialogHeader>
        {issued ? (
          <div className="space-y-3 text-sm">
            <p>Share these one-time credentials with the centre admin:</p>
            <div className="rounded-lg border p-3 font-mono text-xs">
              <p>{issued.adminEmail}</p>
              <p>{issued.tempPassword}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void navigator.clipboard.writeText(`${issued.adminEmail} / ${issued.tempPassword}`);
                toast.success("Copied");
              }}
            >
              <Copy className="h-4 w-4" /> Copy
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`orgName-${lead.id}`}>Centre name</Label>
              <Input id={`orgName-${lead.id}`} name="orgName" defaultValue={lead.centre_name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`adminFullName-${lead.id}`}>Centre admin name</Label>
              <Input
                id={`adminFullName-${lead.id}`}
                name="adminFullName"
                defaultValue={lead.contact_name}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`adminEmail-${lead.id}`}>Centre admin email</Label>
              <Input
                id={`adminEmail-${lead.id}`}
                name="adminEmail"
                type="email"
                defaultValue={lead.email}
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Creating…" : "Approve centre"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ParentAccessCard() {
  const queryClient = useQueryClient();
  const [parentUserId, setParentUserId] = useState("");
  const [learnerId, setLearnerId] = useState("");

  const linksFn = useServerFn(listParentLinks);
  const linkFn = useServerFn(linkParentToLearner);
  const unlinkFn = useServerFn(unlinkParentFromLearner);

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["parent-links-admin"],
    queryFn: () => linksFn(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["parent-links-admin"] });

  const linkMutation = useMutation({
    mutationFn: () => linkFn({ data: { parentUserId, learnerId } }),
    onSuccess: () => {
      toast.success("Parent linked to learner.");
      setParentUserId("");
      setLearnerId("");
      void invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unlinkMutation = useMutation({
    mutationFn: (linkId: string) => unlinkFn({ data: { linkId } }),
    onSuccess: () => {
      toast.success("Link removed.");
      void invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Parent access</CardTitle>
        <CardDescription>
          Link a parent account to a learner. Parents only ever see the learners linked here, and
          consent they record unlocks the AI Tutor for that learner.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <p className="font-medium">Parent links couldn't be loaded.</p>
            <p className="mt-1 text-muted-foreground">
              {error instanceof Error ? error.message : "Please try again."}
            </p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => void refetch()}>
              Try again
            </Button>
          </div>
        ) : isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-48 flex-1 space-y-2">
                <Label htmlFor="parent-select">Parent account</Label>
                <Select value={parentUserId} onValueChange={setParentUserId}>
                  <SelectTrigger id="parent-select">
                    <SelectValue placeholder={data.parents.length ? "Select parent" : "No parent accounts yet"} />
                  </SelectTrigger>
                  <SelectContent>
                    {data.parents.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name || "Unnamed parent"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-48 flex-1 space-y-2">
                <Label htmlFor="learner-select">Learner</Label>
                <Select value={learnerId} onValueChange={setLearnerId}>
                  <SelectTrigger id="learner-select">
                    <SelectValue placeholder="Select learner" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.learners.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                        {l.grade ? ` · Grade ${l.grade}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => linkMutation.mutate()}
                disabled={!parentUserId || !learnerId || linkMutation.isPending}
              >
                <Link2 className="h-4 w-4" />
                {linkMutation.isPending ? "Linking…" : "Link"}
              </Button>
            </div>

            {data.parents.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Create a parent account first with <span className="font-medium">Add staff → Parent / guardian</span>.
              </p>
            )}

            {data.links.length === 0 ? (
              <p className="text-sm text-muted-foreground">No parent links yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parent</TableHead>
                    <TableHead>Learner</TableHead>
                    <TableHead className="text-right">Access</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.links.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.parentName}</TableCell>
                      <TableCell>{row.learnerName}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={unlinkMutation.isPending}
                          onClick={() => unlinkMutation.mutate(row.id)}
                        >
                          <Unlink className="h-4 w-4" /> Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

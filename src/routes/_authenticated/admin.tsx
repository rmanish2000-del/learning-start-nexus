import { useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Link2, Plus, Unlink } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  createStaffUser,
  linkParentToLearner,
  listParentLinks,
  listStaffUsers,
  unlinkParentFromLearner,
  updateUserRole,
} from "@/lib/admin.functions";
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

  const { data: org } = useQuery({
    queryKey: ["org", profile?.org_id],
    enabled: !!profile?.org_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", profile!.org_id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: staff, isPending } = useQuery({
    queryKey: ["staff-users"],
    queryFn: () => listStaffUsers(),
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

  const createStaffFn = useServerFn(createStaffUser);
  const updateRoleFn = useServerFn(updateUserRole);

  const createMutation = useMutation({
    mutationFn: (input: { fullName: string; email: string; role: AppRole }) =>
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
      role: String(form.get("role") ?? "educator") as AppRole,
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Change role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending &&
                [0, 1, 2].map((i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={4}>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ParentAccessCard />
    </div>
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

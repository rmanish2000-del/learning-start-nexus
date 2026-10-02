import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryError } from "@/components/query-error";
import { CENTRE_SETUP_QUERY_KEY } from "@/components/centre-setup-checklist";
import { supabase } from "@/integrations/supabase/client";
import { centreProfileSchema } from "@/lib/centre-setup-shared";
import { updateCentreProfileFn } from "@/lib/centre-setup.functions";

/** Settings → Centre profile (centre admins). Saves all-or-nothing through one server call. */
export function CentreProfileForm({ orgId }: { orgId: string }) {
  const queryClient = useQueryClient();
  const update = useServerFn(updateCentreProfileFn);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["settings-org", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("name, tagline, email, phone, website, timezone")
        .eq("id", orgId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: (input: ReturnType<typeof centreProfileSchema.parse>) => update({ data: input }),
    onSuccess: () => {
      toast.success("Centre profile saved.");
      void queryClient.invalidateQueries({ queryKey: ["settings-org", orgId] });
      void queryClient.invalidateQueries({ queryKey: ["org", orgId] });
      void queryClient.invalidateQueries({ queryKey: CENTRE_SETUP_QUERY_KEY });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldError(null);
    const form = new FormData(event.currentTarget);
    const parsed = centreProfileSchema.safeParse({
      name: form.get("name"),
      email: form.get("email"),
      phone: form.get("phone"),
      tagline: form.get("tagline") ?? "",
      website: form.get("website") ?? "",
    });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Check the form and try again.");
      return;
    }
    mutation.mutate(parsed.data);
  };

  const incomplete =
    !query.isPending && !query.isError && !(query.data?.email && query.data?.phone);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-4 w-4" /> Centre profile
        </CardTitle>
        <CardDescription>
          {incomplete
            ? "Complete your centre profile — a contact email and phone are needed before families can reach you."
            : "Your centre's name and contact details, as shown to families and EduOS."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {query.isPending ? (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : query.isError ? (
          <QueryError title="Centre profile didn't load" error={query.error} onRetry={() => query.refetch()} compact />
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="centre-name">Centre name</Label>
                <Input id="centre-name" name="name" defaultValue={query.data.name} required maxLength={120} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="centre-email">Contact email</Label>
                <Input id="centre-email" name="email" type="email" defaultValue={query.data.email ?? ""} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="centre-phone">Contact phone</Label>
                <Input id="centre-phone" name="phone" type="tel" defaultValue={query.data.phone ?? ""} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="centre-tagline">Tagline (optional)</Label>
                <Input id="centre-tagline" name="tagline" defaultValue={query.data.tagline ?? ""} maxLength={160} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="centre-website">Website (optional)</Label>
                <Input id="centre-website" name="website" defaultValue={query.data.website ?? ""} maxLength={200} />
              </div>
            </div>
            {fieldError && (
              <p role="alert" className="text-sm text-destructive">
                {fieldError}
              </p>
            )}
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">Timezone: {query.data.timezone}</p>
              <Button type="submit" size="sm" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving…" : "Save profile"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LEARNER_COUNT_OPTIONS, TIMELINE_OPTIONS } from "@/lib/landing-content";

// Public pilot application. Writes to public.pilot_leads, which allows insert
// only (with length guards) and restricts reads to centre admins.
export function PilotForm() {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const get = (k: string) => String(data.get(k) ?? "").trim();

    const centre_name = get("centre_name");
    const contact_name = get("contact_name");
    const email = get("email");
    if (!centre_name || !contact_name || !email) {
      toast.error("Centre name, contact name and email are required.");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("pilot_leads").insert({
      centre_name,
      contact_name,
      email,
      phone: get("phone") || null,
      learner_count: get("learner_count") || null,
      boards_grades: get("boards_grades") || null,
      timeline: get("timeline") || null,
      notes: get("notes") || null,
    });
    setSubmitting(false);

    if (error) {
      toast.error("We couldn't send that. Please try again or email support@eduos.global.");
      return;
    }
    setDone(true);
    form.reset();
  }

  if (done) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-primary" aria-hidden />
        <h3 className="mt-3 text-base font-semibold">Application received</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          We'll be in touch within two working days with pilot scope and timelines.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-xl border bg-card p-6 sm:grid-cols-2">
      <Field id="centre_name" label="Centre name" required />
      <Field id="contact_name" label="Your name" required />
      <Field id="email" label="Email" type="email" required />
      <Field id="phone" label="Phone (optional)" />

      <div className="space-y-1.5">
        <Label htmlFor="learner_count">Learner count</Label>
        <select
          id="learner_count"
          name="learner_count"
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          defaultValue=""
        >
          <option value="">Select…</option>
          {LEARNER_COUNT_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="timeline">Timeline</Label>
        <select
          id="timeline"
          name="timeline"
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          defaultValue=""
        >
          <option value="">Select…</option>
          {TIMELINE_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-2">
        <Field id="boards_grades" label="Boards and grades" placeholder="e.g. CBSE, grades 6–10" />
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="notes">Anything we should know? (optional)</Label>
        <Textarea id="notes" name="notes" rows={3} maxLength={2000} />
      </div>

      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Apply for the pilot
        </Button>
        <p className="text-xs text-muted-foreground">
          We use these details only to scope your pilot.
        </p>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  type = "text",
  required,
  placeholder,
}: {
  id: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} type={type} required={required} placeholder={placeholder} maxLength={200} />
    </div>
  );
}

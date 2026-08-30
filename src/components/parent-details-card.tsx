import { useState } from "react";
import { Loader2, UserCog } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerParent } from "@/lib/parent-account.functions";
import { registerParentSchema, type ParentProfile } from "@/lib/parent-account-shared";
import { friendlyErrorMessage, zodFieldErrors } from "@/lib/user-errors";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

export function parentDetailsComplete(profile: ParentProfile | undefined | null): boolean {
  return Boolean(profile?.fullName?.trim() && profile?.phone?.trim());
}

type FieldErrors = { fullName?: string | undefined; phone?: string | undefined; email?: string | undefined };

/**
 * Purchases are refused server-side until the parent profile carries a name
 * and a mobile number. This card is the only place a parent can supply them,
 * so it renders inline wherever the purchase guard would otherwise dead-end.
 *
 * Validation runs client-side against the same schema the server uses, and any
 * server rejection is mapped back onto the individual fields — a raw Zod issue
 * array must never reach the parent.
 */
export function ParentDetailsCard({
  profile,
  onSaved,
}: {
  profile: ParentProfile | undefined;
  onSaved: () => void | Promise<unknown>;
}) {
  const { t } = useI18n();
  const saveFn = useServerFn(registerParent);
  const [fullName, setFullName] = useState(profile?.fullName ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  if (parentDetailsComplete(profile)) return null;

  async function save() {
    const payload = {
      fullName: fullName.trim(),
      email: profile?.email ?? "",
      phone: phone.trim(),
    };

    const parsed = registerParentSchema.safeParse(payload);
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors | undefined;
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      // The email comes from the signed-in account, so an email issue is not
      // something the parent can correct in this form.
      toast.error(
        next.fullName ?? next.phone ?? next.email ?? t("parentDetails.check", "Please check your details."),
      );
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      await saveFn({ data: parsed.data });
      toast.success(t("parentDetails.saved", "Your details are saved."));
      await onSaved();
    } catch (error) {
      const fields = zodFieldErrors(error);
      const mapped: FieldErrors = {};
      if (fields["full name"]) mapped.fullName = fields["full name"];
      if (fields["phone"]) mapped.phone = fields["phone"];
      if (fields["email"]) mapped.email = fields["email"];
      setErrors(mapped);
      toast.error(
        friendlyErrorMessage(error, t("parentDetails.error", "Could not save your details.")),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed p-4">
      <Alert>
        <UserCog className="h-4 w-4" />
        <AlertDescription>
          {t(
            "parentDetails.lede",
            "Add your name and mobile number to continue. Razorpay needs them on the receipt, and we use the mobile only for the report link.",
          )}
        </AlertDescription>
      </Alert>
      <div className="grid gap-3 sm:grid-cols-[1.2fr_1fr_auto]">
        <div className="space-y-1.5">
          <Label htmlFor="parent-name">{t("parentDetails.name", "Your full name")}</Label>
          <Input
            id="parent-name"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
            }}
            placeholder="Meera Patel"
            aria-invalid={Boolean(errors.fullName)}
            aria-describedby={errors.fullName ? "parent-name-error" : undefined}
            className={cn(errors.fullName && "border-destructive focus-visible:ring-destructive")}
          />
          {errors.fullName ? (
            <p id="parent-name-error" className="text-xs text-destructive">
              {errors.fullName}
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="parent-phone">{t("parentDetails.phone", "Mobile number")}</Label>
          <Input
            id="parent-phone"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
            }}
            placeholder="9876543210"
            inputMode="tel"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "parent-phone-error" : undefined}
            className={cn(errors.phone && "border-destructive focus-visible:ring-destructive")}
          />
          {errors.phone ? (
            <p id="parent-phone-error" className="text-xs text-destructive">
              {errors.phone}
            </p>
          ) : null}
        </div>
        <div className="flex items-end">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t("parentDetails.save", "Save details")}
          </Button>
        </div>
      </div>
      {errors.email ? (
        <p className="text-xs text-destructive">
          {t(
            "parentDetails.emailError",
            "We couldn't read the email on your account. Please sign out and sign in again.",
          )}
        </p>
      ) : null}
    </div>
  );
}

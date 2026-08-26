import { useState } from "react";
import { Loader2, UserCog } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerParent } from "@/lib/parent-account.functions";
import type { ParentProfile } from "@/lib/parent-account-shared";
import { useI18n } from "@/lib/i18n/context";

export function parentDetailsComplete(profile: ParentProfile | undefined | null): boolean {
  return Boolean(profile?.fullName?.trim() && profile?.phone?.trim());
}

/**
 * Purchases are refused server-side until the parent profile carries a name
 * and a mobile number. This card is the only place a parent can supply them,
 * so it renders inline wherever the purchase guard would otherwise dead-end.
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
  const [saving, setSaving] = useState(false);

  if (parentDetailsComplete(profile)) return null;

  async function save() {
    setSaving(true);
    try {
      await saveFn({
        data: { fullName: fullName.trim(), email: profile?.email ?? "", phone: phone.trim() },
      });
      toast.success(t("parentDetails.saved", "Your details are saved."));
      await onSaved();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("parentDetails.error", "Could not save your details."),
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
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Meera Patel"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="parent-phone">{t("parentDetails.phone", "Mobile number")}</Label>
          <Input
            id="parent-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="9876543210"
            inputMode="tel"
          />
        </div>
        <div className="flex items-end">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t("parentDetails.save", "Save details")}
          </Button>
        </div>
      </div>
    </div>
  );
}

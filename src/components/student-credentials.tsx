import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, KeyRound, Printer } from "lucide-react";
import { toast } from "sonner";

import { setStudentLoginPin } from "@/lib/parent-account.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n/context";

/**
 * Parent-facing student credentials: the handle is always visible and the
 * parent can set or reset the 6-digit PIN themselves. Students therefore never
 * depend on an educator being assigned before they can sign in.
 */
export function StudentLoginPanel({
  learnerId,
  handle,
  hasLogin,
  onSaved,
}: {
  learnerId: string;
  handle: string;
  hasLogin: boolean;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const savePin = useServerFn(setStudentLoginPin);

  const mutation = useMutation({
    mutationFn: () => savePin({ data: { learnerId, pin } }),
    onSuccess: (result) => {
      toast.success(
        result.created
          ? `Student login created. Handle: ${result.handle}`
          : "PIN updated. Your child can sign in with the new PIN.",
      );
      setPin("");
      setOpen(false);
      onSaved();
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not save the PIN."),
  });

  return (
    <div className="mt-3 rounded-lg border border-dashed bg-muted/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium">Student sign-in</p>
          <p className="truncate text-xs text-muted-foreground">
            Handle: <span className="font-mono">{handle}</span>
            {hasLogin ? "" : " · PIN not set yet"}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
          <KeyRound className="mr-1.5 h-3.5 w-3.5" />
          {hasLogin ? "Reset PIN" : "Create login"}
        </Button>
      </div>
      {open ? (
        <form
          className="mt-3 flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!/^\d{6}$/.test(pin)) {
              toast.error("Enter a 6-digit PIN.");
              return;
            }
            mutation.mutate();
          }}
        >
          <div className="space-y-1">
            <Label htmlFor={`pin-${learnerId}`} className="text-xs">
              New 6-digit PIN
            </Label>
            <Input
              id={`pin-${learnerId}`}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              maxLength={6}
              placeholder="••••••"
              className="h-9 w-36 tracking-[0.4em]"
            />
          </div>
          <Button type="submit" size="sm" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save PIN"}
          </Button>
          <p className="w-full text-xs text-muted-foreground">
            Your child signs in at the Student tab with this handle and PIN.
          </p>
        </form>
      ) : null}
    </div>
  );
}

/**
 * The handover artefact. A parent should be able to put the sign-in details in
 * front of their child without retyping anything — copy it, or print it and
 * stick it next to the desk. The PIN is never printed: only the parent knows it.
 */
export function loginInstructionsText(args: {
  learnerName: string;
  handle: string;
  origin: string;
}): string {
  return [
    "EduOS — student sign-in",
    "",
    `Student: ${args.learnerName}`,
    `Website: ${args.origin}/auth`,
    "Choose: I'm a student",
    `Handle: ${args.handle}`,
    "PIN: the 6-digit PIN your parent set for you",
    "",
    "Forgot the PIN? Your parent can reset it from the Parent portal.",
  ].join("\n");
}

export function LoginInstructionActions({
  learnerName,
  handle,
}: {
  learnerName: string;
  handle: string;
}) {
  const origin = typeof window === "undefined" ? "https://www.eduos.global" : window.location.origin;
  const text = loginInstructionsText({ learnerName, handle, origin });

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          void navigator.clipboard
            .writeText(text)
            .then(() => toast.success("Sign-in instructions copied."))
            .catch(() => toast.error("Copy failed — select the handle and copy it manually."));
        }}
      >
        <Copy className="mr-1.5 h-3.5 w-3.5" /> {t("handoff.copy", "Copy login instructions")}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          const w = window.open("", "_blank", "width=600,height=700");
          if (!w) {
            toast.error("Allow pop-ups to print the instructions.");
            return;
          }
          w.document.write(
            `<pre style="font:14px ui-monospace,monospace;padding:24px;white-space:pre-wrap">${text.replace(
              /[<>&]/g,
              (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c] as string,
            )}</pre>`,
          );
          w.document.close();
          w.focus();
          w.print();
        }}
      >
        <Printer className="mr-1.5 h-3.5 w-3.5" /> {t("handoff.print", "Print")}
      </Button>
    </div>
  );
}

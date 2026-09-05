import { useRef, useState } from "react";
import { ImageUp, Loader2, Send, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { clientContext, clientId } from "@/lib/client-context";
import {
  ALLOWED_SCREENSHOT_TYPES,
  FEEDBACK_CATEGORIES,
  FEEDBACK_CATEGORY_LABELS,
  MAX_MESSAGE,
  MAX_SCREENSHOT_BYTES,
  detectSensitive,
  feedbackSubmissionSchema,
  type FeedbackCategory,
} from "@/lib/feedback-shared";
import { submitFeedbackFn } from "@/lib/feedback.functions";
import { trackGuidance } from "@/lib/guidance-track";
import { cn } from "@/lib/utils";

/**
 * Re-encode the picked image through a canvas. This strips EXIF/location
 * metadata and caps the size before anything leaves the device.
 */
async function safeEncode(file: File): Promise<{ contentType: "image/jpeg"; base64: string; preview: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser couldn't process that image.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
  return { contentType: "image/jpeg", base64: dataUrl.split(",")[1] ?? "", preview: dataUrl };
}

export function FeedbackForm({
  route,
  guidanceContext,
  onDone,
}: {
  route: string;
  guidanceContext?: string;
  onDone?: () => void;
}) {
  const [category, setCategory] = useState<FeedbackCategory>("confusing");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [shot, setShot] = useState<{ base64: string; preview: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const sensitive = detectSensitive(message);

  async function pickFile(file: File | undefined) {
    if (!file) return;
    if (!ALLOWED_SCREENSHOT_TYPES.includes(file.type as (typeof ALLOWED_SCREENSHOT_TYPES)[number])) {
      setError("Please choose a PNG, JPEG or WebP image.");
      return;
    }
    if (file.size > MAX_SCREENSHOT_BYTES * 4) {
      setError("That image is too large. Please choose a smaller one.");
      return;
    }
    try {
      const encoded = await safeEncode(file);
      setShot({ base64: encoded.base64, preview: encoded.preview });
      setError(null);
    } catch {
      setError("We couldn't read that image.");
    }
  }

  async function submit() {
    setError(null);
    const ctx = clientContext();
    const parsed = feedbackSubmissionSchema.safeParse({
      category,
      message,
      contactEmail: email || undefined,
      emailConsent: consent,
      route,
      deviceClass: ctx.deviceClass,
      viewport: ctx.viewport,
      browserFamily: ctx.browserFamily,
      appVersion: ctx.appVersion,
      guidanceContext,
      clientId: clientId(),
      screenshot: shot ? { contentType: "image/jpeg" as const, base64: shot.base64 } : undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form.");
      return;
    }

    setBusy(true);
    try {
      const result = await submitFeedbackFn({
        data: { ...parsed.data, isAuthenticated: /(?:^|;\s*)eduos_session=1(?:;|$)/.test(document.cookie) },
      });
      trackGuidance("feedback_submitted", { route });
      setSent(true);
      toast.success(result.duplicate ? "We already have this one — thank you." : "Thank you. Your feedback is in.");
      onDone?.();
    } catch (err) {
      const offline = typeof navigator !== "undefined" && navigator.onLine === false;
      setError(
        offline
          ? "You're offline. We kept what you wrote — try again when you're back online."
          : err instanceof Error
            ? err.message
            : "We couldn't send that just now. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-3 py-6 text-center">
        <ShieldCheck className="mx-auto h-8 w-8 text-primary" />
        <p className="text-sm font-medium">Thank you — that's been sent to the EduOS team.</p>
        <p className="text-xs text-muted-foreground">
          {consent && email ? "We'll reply to you if we need more detail." : "You told us anonymously."}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSent(false);
            setMessage("");
            setShot(null);
          }}
        >
          Send something else
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs">What kind of feedback is this?</Label>
        <div className="flex flex-wrap gap-1.5">
          {FEEDBACK_CATEGORIES.map((c) => (
            <Button
              key={c}
              type="button"
              size="sm"
              variant={category === c ? "default" : "outline"}
              className="h-8 text-xs"
              onClick={() => setCategory(c)}
            >
              {FEEDBACK_CATEGORY_LABELS[c]}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="feedback-message" className="text-xs">
          Tell us what happened
        </Label>
        <Textarea
          id="feedback-message"
          value={message}
          maxLength={MAX_MESSAGE}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="What were you trying to do, and what got in the way?"
        />
        <p className={cn("text-[11px]", sensitive ? "text-destructive" : "text-muted-foreground")}>
          {sensitive
            ? `Please remove ${sensitive} — we can't store that.`
            : `Please don't include phone numbers, PINs or payment details. ${message.length}/${MAX_MESSAGE}`}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Screenshot (optional)</Label>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => void pickFile(e.target.files?.[0])}
        />
        {shot ? (
          <div className="flex items-center gap-2 rounded-md border p-2">
            <img src={shot.preview} alt="Screenshot preview" className="h-14 w-20 rounded object-cover" />
            <p className="min-w-0 flex-1 text-[11px] text-muted-foreground">
              Attached. Location and camera details are removed before sending.
            </p>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShot(null)} aria-label="Remove screenshot">
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => fileRef.current?.click()}>
            <ImageUp className="h-3.5 w-3.5" /> Attach a screenshot
          </Button>
        )}
      </div>

      <div className="space-y-2 rounded-md border bg-muted/30 p-3">
        <div className="flex items-start gap-2">
          <Checkbox
            id="feedback-consent"
            checked={consent}
            onCheckedChange={(v) => setConsent(v === true)}
            className="mt-0.5"
          />
          <Label htmlFor="feedback-consent" className="text-xs leading-relaxed font-normal">
            You may email me about this. Without this tick, your feedback stays anonymous.
          </Label>
        </div>
        {consent && (
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-9"
            aria-label="Your email address"
          />
        )}
      </div>

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}

      <Button className="w-full gap-1.5" disabled={busy || message.trim().length < 10} onClick={() => void submit()}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Send feedback
      </Button>
    </div>
  );
}

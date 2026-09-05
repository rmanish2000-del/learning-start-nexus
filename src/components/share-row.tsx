import { Check, Link2, MessageCircle, Share2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { trackGuidance } from "@/lib/guidance-track";
import { campaignUrl, type UtmCampaign } from "@/lib/utm";


/**
 * Accessible sharing for a public page: WhatsApp, the device's own share
 * sheet where available, and copy-link. Rendered inline in page flow so it
 * can never sit over Help, cookie controls, PWA prompts or a primary CTA.
 */
export function ShareRow({
  path,
  title,
  campaign,
  label = "Share this page",
}: {
  path: string;
  title: string;
  campaign: UtmCampaign;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    `${title} — ${campaignUrl(path, { source: "whatsapp", medium: "share", campaign })}`,
  )}`;

  async function nativeShare() {
    const url = campaignUrl(path, { source: "share", medium: "share", campaign });
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // Dismissed share sheets are not errors.
        return;
      }
    }
    await copy();
  }

  async function copy() {
    const url = campaignUrl(path, { source: "share", medium: "share", campaign });
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3">
      <span className="mr-1 text-sm font-medium text-foreground">{label}</span>
      <Button asChild variant="outline" size="sm" className="min-h-9">
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
          <MessageCircle className="mr-2 h-4 w-4" aria-hidden /> WhatsApp
        </a>
      </Button>
      <Button variant="outline" size="sm" className="min-h-9" onClick={() => void nativeShare()}>
        <Share2 className="mr-2 h-4 w-4" aria-hidden /> Share
      </Button>
      <Button variant="ghost" size="sm" className="min-h-9" onClick={() => void copy()}>
        {copied ? (
          <>
            <Check className="mr-2 h-4 w-4" aria-hidden /> Link copied
          </>
        ) : (
          <>
            <Link2 className="mr-2 h-4 w-4" aria-hidden /> Copy link
          </>
        )}
      </Button>
    </div>
  );
}

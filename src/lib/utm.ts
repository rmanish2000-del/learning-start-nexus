// Approved UTM taxonomy for EduOS acquisition links.
//
// Values are closed lists so attribution can be stored as analytics
// dimensions without ever accepting arbitrary free text from a URL.

import { SITE_URL } from "@/lib/seo";

export const UTM_SOURCES = [
  "whatsapp",
  "facebook",
  "instagram",
  "x",
  "linkedin",
  "youtube",
  "telegram",
  "email",
  "sms",
  "share",
  "print",
  "referral",
  "google",
  "bing",
  "organic",
  "direct",
] as const;
export type UtmSource = (typeof UTM_SOURCES)[number];

export const UTM_MEDIUMS = ["social", "share", "email", "referral", "organic", "cpc", "qr"] as const;
export type UtmMedium = (typeof UTM_MEDIUMS)[number];

export const UTM_CAMPAIGNS = [
  "class10_diagnostic",
  "free_learning_check",
  "paper_practice",
  "parent_guide",
  "reassessment_evidence",
  "maths_diagnostic",
  "science_diagnostic",
  "centre_pilot",
  "page_share",
] as const;
export type UtmCampaign = (typeof UTM_CAMPAIGNS)[number];

export interface Utm {
  source: UtmSource;
  medium: UtmMedium;
  campaign: UtmCampaign;
}

/** Build an absolute, taggable destination URL. */
export function campaignUrl(path: string, utm: Utm): string {
  const url = new URL(path.startsWith("http") ? path : `${SITE_URL}${path}`);
  url.searchParams.set("utm_source", utm.source);
  url.searchParams.set("utm_medium", utm.medium);
  url.searchParams.set("utm_campaign", utm.campaign);
  return url.toString();
}

function pick<T extends readonly string[]>(list: T, value: string | null): T[number] | undefined {
  if (!value) return undefined;
  const lower = value.trim().toLowerCase();
  return (list as readonly string[]).includes(lower) ? (lower as T[number]) : undefined;
}

export interface Attribution {
  utmSource?: UtmSource;
  utmMedium?: UtmMedium;
  utmCampaign?: UtmCampaign;
}

const STORAGE_KEY = "eduos.attribution";

/**
 * Reads the current URL's UTM values (allow-listed only) and remembers the
 * first touch for this tab, so later funnel events keep their channel.
 */
export function currentAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  try {
    const params = new URLSearchParams(window.location.search);
    const fresh: Attribution = {};
    const source = pick(UTM_SOURCES, params.get("utm_source"));
    const medium = pick(UTM_MEDIUMS, params.get("utm_medium"));
    const campaign = pick(UTM_CAMPAIGNS, params.get("utm_campaign"));
    if (source) fresh.utmSource = source;
    if (medium) fresh.utmMedium = medium;
    if (campaign) fresh.utmCampaign = campaign;

    if (Object.keys(fresh).length > 0) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      return fresh;
    }
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Attribution) : {};
  } catch {
    return {};
  }
}

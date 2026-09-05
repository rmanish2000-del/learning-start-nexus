alter table public.guidance_events
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text;

create index if not exists guidance_events_utm_campaign_idx
  on public.guidance_events (utm_campaign, occurred_at desc);
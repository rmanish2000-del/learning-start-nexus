<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## White-label branding (permanent, added 2026-09-08)

Never add, restore, recommend, or ask permission to include build-platform
(Lovable) branding in EduOS. Every user-facing surface — copy, headers,
footers, auth and consent screens, titles, favicons, manifest, Open Graph and
share previews, structured data, emails, error/offline/404 pages, cookie and
help surfaces, checkout, PWA install — carries EduOS branding only.

Technical runtime dependencies (`@lovable.dev/*` packages, Cloud auth/email
endpoints, preview-host detection, CSP frame-ancestors, the managed OAuth
consent endpoint) are permitted only where invisible to end users, and are
allow-listed explicitly in `src/lib/__tests__/no-platform-branding.test.ts`.

Every public page must declare its own EduOS `og:image`; without one the host
substitutes a generated screenshot served from a platform preview domain.

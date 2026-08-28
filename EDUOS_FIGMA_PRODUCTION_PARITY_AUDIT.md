# EduOS — Figma-to-Production Visual Parity Audit

Status: **BLOCKED (Phase 1 + production-side evidence complete; Figma side unavailable)**
Date: 2026-08-28 · Audit-first, read-only. No application code changed. No deployment.

---

## Blocking condition (read first)

The audit cannot be completed as specified because **the Figma file is not reachable from this environment**.

- Lovable has no cloud Figma connector.
- Live Figma access requires the Lovable Desktop app + Figma Desktop in Dev Mode with the local MCP server enabled (Settings → Connectors → Local MCP servers). Download: https://lovable.dev/download
- No Figma exports, frame IDs, node IDs, or handoff artefacts exist in this repository (searched: no `.fig`, no Figma links in docs, no design-token export).

Consequence: Phases 2 (Figma capture), 3 (difference matrix, Figma column), 4 (Figma token values), 5 (Figma copy) and 6 (Option B preview) **cannot be evidenced**. Producing them from memory or estimation would violate the assignment's explicit instruction not to rely on visual estimation and not to claim parity without side-by-side evidence.

Unblock options:
1. Connect Figma via Lovable Desktop (full fidelity: exact tokens, node IDs, frame versions).
2. Upload PNG/PDF exports of every FINAL frame at 390 / 768 / 1280 / 1440, plus a Dev-Mode token export (colours, type scale, spacing, radii).
3. Instruct that the audit proceed as a production-only design review with Option A only.

---

## Phase 1 — Baselines (COMPLETE)

| Item | Value |
| --- | --- |
| Canonical application HEAD | `54f78cd166867701a9cd1b07c867e3f10318a3b6` |
| Production HEAD | `54f78cd166867701a9cd1b07c867e3f10318a3b6` |
| HEAD match | YES |
| Working tree | CLEAN (before this documentation file) |
| Production reachability | https://www.eduos.global → HTTP 200 |
| Test baseline | 97/97 passing across 11 files (re-run this session) |
| Typecheck / build | Clean at this HEAD (unchanged since last release verification) |
| Figma file / frame version | **UNAVAILABLE** — no access, no export in repo |
| Frames classified FINAL | **UNKNOWN** — cannot enumerate |

### Public route surface at HEAD

| Route | File | Key components |
| --- | --- | --- |
| `/` | `src/routes/index.tsx` | hero, ParentCtas, `landing/loop-section.tsx`, `landing/trust-section.tsx`, `landing/audience-section.tsx` (Parents / Centres / Schools), pricing, `landing/pilot-form.tsx` |
| `/about` | `src/routes/about.tsx` | positioning + scope statements |
| `/contact` | `src/routes/contact.tsx` | official contact details, enquiry form |
| shared | `src/components/public-layout.tsx` | header/nav, footer |
| shared | `src/components/free-check-panel.tsx` | Free Learning Check entry |
| legal | `src/routes/privacy.tsx`, `src/routes/terms.tsx` | — |

---

## Phase 2 — Production capture (COMPLETE, one side only)

Captured from live production at four viewports (390 / 768 / 1280 / 1440 px), stored in `/mnt/documents/eduos-parity/`:

`prod-home-{mobile,tablet,desktop,wide}.png`,
`prod-about-{mobile,tablet,desktop,wide}.png`,
`prod-contact-{mobile,tablet,desktop,wide}.png`

Figma counterparts: **not captured — no access.**

---

## Phase 4 — Production token inventory (Figma column pending)

Source of truth: `src/styles.css`.

| Token | Production value (light) | Production value (dark) | Figma |
| --- | --- | --- | --- |
| Primary | `oklch(0.52 0.105 168)` evergreen | `oklch(0.7 0.12 168)` | pending |
| Primary foreground | `oklch(0.98 0.01 160)` | `oklch(0.16 0.03 170)` | pending |
| Background | `oklch(0.99 0.003 250)` | `oklch(0.165 0.012 260)` | pending |
| Card / popover | `oklch(1 0 0)` | `oklch(0.2 0.012 260)` | pending |
| Section alt background | `bg-muted/40` → `oklch(0.962 0.005 250)` | `oklch(0.24 0.012 260)` | pending |
| Foreground text | `oklch(0.22 0.02 260)` | `oklch(0.94 0.005 250)` | pending |
| Muted text | `oklch(0.53 0.02 260)` | `oklch(0.68 0.015 255)` | pending |
| Accent | `oklch(0.945 0.02 168)` | `oklch(0.28 0.03 168)` | pending |
| Border / input | `oklch(0.918 0.006 250)` | `oklch(1 0 0 / 10–12%)` | pending |
| Destructive / success / warning | `0.577 0.215 27` / `0.58 0.12 155` / `0.66 0.13 65` | dark variants defined | pending |
| Charts 1–5 | evergreen, teal, indigo, amber, orange | dark variants | pending |
| Shadows | shadcn defaults; no custom shadow tokens | — | pending |
| Gradients | none defined | — | pending |
| Font family (sans) | Geist Variable | — | pending |
| Font family (mono) | Geist Mono Variable | — | pending |
| Type scale | Tailwind v4 default scale; headings `text-2xl` → `sm:text-3xl` on sections | — | pending |
| Letter spacing | body `-0.01em`; headings `tracking-tight`; eyebrows `tracking-widest uppercase text-xs` | — | pending |
| Spacing rhythm | sections `py-14 sm:py-20`, grid gaps `gap-3`/`gap-10`, card padding `p-5` | — | pending |
| Max content width | `max-w-6xl` (72rem) with `px-4` gutters | — | pending |
| Radius | `--radius: 0.625rem`, derived sm/md/lg/xl/2xl/3xl/4xl | — | pending |
| Buttons | shadcn `Button` sizes (`default` h-9, `lg` h-10) | — | pending |
| Form controls | shadcn `Input`/`Select`/`Textarea` defaults | — | pending |

Known intentional brand-system positions (classification `INTENTIONAL_BRAND_SYSTEM_CHANGE`, subject to founder confirmation): evergreen accent replacing the Figma orange direction; Geist / Geist Mono replacing Playfair / Outfit / Inter; shadcn/ui components replacing prototype components (`INTENTIONAL_PRODUCTION_COMPONENT_REUSE`).

---

## Phase 5 — Copy: product-truth guardrails already enforced

Independently verifiable in the repository and in production, regardless of Figma:

- Pricing is INR only: ₹199 diagnostic, ₹2,999 Board Success Plan, ₹2,800 centre pricing. No rand anywhere.
- Scope is CBSE Class 10 Mathematics and Science only; no all-grade or all-subject claims.
- No guaranteed mastery/improvement language; no testimonials; no third-party logos; landing sample figures are explicitly labelled "Anonymised pilot sample — not live tenant data" (`src/lib/landing-content.ts`).
- School section presents an engagement path, not unbuilt functionality.

These must **not** be reverted under any Figma adoption. Any Figma copy conflicting with the above is classified `DO_NOT_IMPLEMENT`.

---

## Phases 3, 6, 7 — Not produced

The difference matrix, the two brand previews and the final recommendation are deliberately withheld: each requires the Figma side as evidence. Delivering them now would be estimation presented as audit.

---

## Verdict

```
FIGMA_PRODUCTION_PARITY_AUDIT: FAIL (blocked — Figma inputs unavailable)
APPLICATION_HEAD: 54f78cd166867701a9cd1b07c867e3f10318a3b6
PRODUCTION_HEAD: 54f78cd166867701a9cd1b07c867e3f10318a3b6
HEAD_MATCH: YES
WORKTREE: CLEAN (audit documentation only)
FIGMA_FINAL_FRAMES_REVIEWED: 0 (no access)
SECTIONS_COMPARED: 0 of 15 (production side captured for all public routes; Figma side unavailable)
VIEWPORTS_CAPTURED: 390 / 768 / 1280 / 1440 — production only
INTENTIONAL_DIFFERENCES: cannot be confirmed without Figma
IMPLEMENTATION_MISSES: cannot be confirmed without Figma
FOUNDER_DECISIONS_REQUIRED: (1) provide Figma access or exports; (2) evergreen vs Figma orange; (3) Geist vs editorial display fonts
OPTION_A_PREVIEW: not built (pending Figma composition reference)
OPTION_B_PREVIEW: not built (pending Figma identity reference)
RECOMMENDATION: deferred
CODE_CHANGED: NO
DEPLOYED: NO
KNOWN_LIMITATIONS: no Figma connectivity in this environment; no design exports in repository; production-only evidence
AUDIT_COMMIT: this document only
```

## Continuity

Founder visual acceptance remains **OPEN**. The public visual experience is not finally accepted. The gate stays this parity audit, which resumes as soon as Figma frames or exports are supplied.

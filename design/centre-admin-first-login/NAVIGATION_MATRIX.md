# Navigation Matrix — Centre Admin Role

## Centre Admin visible nav items (9 items)

| # | Icon | Item | Route | Visibility condition |
|---|---|---|---|---|
| 1 | 🚀 | Quick Start | `/centre/quick-start` | First-login only — removed when checklist complete |
| 2 | 🏠 | Dashboard | `/centre/dashboard` | Always |
| 3 | 👤 | Learners | `/centre/learners` | Always |
| 4 | 🎓 | Educators | `/centre/educators` | Always |
| 5 | 📋 | Assessments | `/centre/assessments` | Always |
| 6 | ⚡ | Interventions | `/centre/interventions` | Always |
| 7 | 📊 | Reports | `/centre/reports` | Always |
| 8 | ⚙️ | Settings | `/centre/settings` | Always — NO payment sub-section |
| 9 | ❓ | Help | `/centre/help` | Always — never greyed, never removed |

## Items completely absent for Centre Admin

| Item | Visible to | Why absent for CA |
|---|---|---|
| 💳 Payment Settings | `rmanish2000@gmail.com` only | Platform-owner exclusive. Not rendered. Not mentioned. Not 403'd. |
| 🧪 Pilot Access | Platform owner | Internal platform feature |
| 🛡️ Platform Admin | Platform owner | Administrative console |
| 🔍 Audit & Compliance | Platform owner | Platform-level audit surface |
| 📜 Content Certification | Platform owner | Content management |
| ✅ Auto Verification | Platform owner | Automated workflows |

## Role × Nav matrix (all roles)

| Nav Item | Platform Owner | Centre Admin | Educator | Reviewer | Parent | Learner |
|---|---|---|---|---|---|---|
| Quick Start | ✓ | ✓ (first-login) | — | — | — | — |
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Learners | ✓ | ✓ | ✓ | ✓ | — | — |
| Educators | ✓ | ✓ | — | — | — | — |
| Assessments | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| Interventions | ✓ | ✓ | ✓ | — | — | — |
| Reports | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Settings | ✓ | ✓ (no payment) | — | — | — | — |
| Help | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Payment Settings | ✓ (owner only) | — | — | — | — | — |
| Pilot Access | ✓ | — | — | — | — | — |
| Platform Admin | ✓ | — | — | — | — | — |
| Audit & Compliance | ✓ | — | — | — | — | — |

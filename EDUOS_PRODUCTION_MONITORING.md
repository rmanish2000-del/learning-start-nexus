# EduOS — Production Synthetic Monitoring

**Status:** ACTIVE (scheduler committed; first cron tick occurs once the commit is on the default branch of the canonical repository `learning-start-nexus`).

## What runs

- Script: `scripts/ops/synthetic-monitor.ts` (unchanged; read-only, unauthenticated).
- Scheduler: `.github/workflows/synthetic-monitor.yml` — GitHub Actions, the safest scheduler available in this repository (no application change, no runtime cost on the app, no secrets required).
- Target: `https://www.eduos.global` (override per-run with the `base_url` workflow input).

## Probes and budgets

| Probe | Path | Budget | Content assertion |
| --- | --- | --- | --- |
| health | `/api/public/health` | 1500 ms | body contains `"status":"ok"` |
| landing | `/` | 3000 ms | body contains `<h1` |
| diagnostic | `/diagnostic` | 3000 ms | — |
| auth | `/auth` | 3000 ms | — |
| robots | `/robots.txt` | 1500 ms | — |

Any non-2xx, failed content assertion, timeout, or budget breach exits non-zero → the workflow run fails.

## Execution modes

- **Scheduled:** `cron: */5 * * * *` (UTC). GitHub can delay ticks under load; treat 5 minutes as a target, not a guarantee.
- **Manual:** Actions → *Production synthetic monitor* → **Run workflow** (optionally with a different base URL).
- **Local:** `MONITOR_BASE_URL=https://www.eduos.global bun scripts/ops/synthetic-monitor.ts`

## Notifications / alert destination

1. **Primary:** GitHub Actions failure notifications — email + GitHub notifications to the repository owner and to anyone watching the repository (Watch → Actions). No configuration needed.
2. **Optional escalation:** add repository secret `SLACK_WEBHOOK_URL`. When present, a failed run posts the failing base URL and a link to the run. When absent, the step is skipped — no secret is ever printed.

No credentials, tokens or PII are used or emitted by any probe.

## Ownership and failure handling

- **Owner:** founder / Application Authority (repository owner of `learning-start-nexus`).
- On a failure notification:
  1. Open the failed run and read the probe table (each line shows status, latency, reason).
  2. Re-run manually via **Run workflow** to rule out a transient GitHub-runner or network blip.
  3. `http 5xx` / `request failed` on **health** → platform or deploy incident: check the latest deployment and roll back to the previous known-good SHA.
  4. `slow (budget …)` only → performance regression, not an outage: raise as a P2 unless it persists across three consecutive runs.
  5. `unexpected body` on landing/health → a bad deploy shipped; roll back.

## Costs

- GitHub Actions minutes only. ~288 runs/day × ~1 min ≈ 290 min/day. **Free on a public repository**; on a private repository this exceeds the free tier — reduce the cron to `*/15` or move to a public repo if billing matters.
- Zero cost on Lovable Cloud: probes are unauthenticated GETs against already-public routes and touch no database.

## Limitations

- Availability only: no authenticated journey, no purchase, no database assertion.
- GitHub cron is best-effort; brief outages between ticks can be missed.
- Runner-side network issues can produce a false alert — hence the re-run step above.
- The scheduled tick cannot execute until the workflow file exists on the default branch of the GitHub repository.

## Rollback

Delete `.github/workflows/synthetic-monitor.yml` (or disable the workflow in the Actions tab). Nothing else is affected — no application code, migrations, or deployment configuration are involved.

/**
 * Synthetic uptime / latency monitor.
 *
 * Polls the public surfaces that must never be down and exits non-zero when a
 * probe fails or breaches its latency budget, so any external scheduler (cron,
 * uptime service, CI) turns it into an alert without extra glue.
 *
 * Usage:
 *   bun scripts/ops/synthetic-monitor.ts                      # staging default
 *   MONITOR_BASE_URL=https://www.eduos.global bun scripts/ops/synthetic-monitor.ts
 *
 * Probes are read-only and unauthenticated: no test data is written and no
 * credentials are required.
 */

const BASE = process.env["MONITOR_BASE_URL"] ?? "https://eduos-staging.lovable.app";

type Probe = { name: string; path: string; budgetMs: number; expect?: (body: string) => boolean };

const PROBES: Probe[] = [
  { name: "health", path: "/api/public/health", budgetMs: 1500, expect: (b) => b.includes('"status":"ok"') },
  { name: "landing", path: "/", budgetMs: 3000, expect: (b) => b.includes("<h1") },
  { name: "diagnostic", path: "/diagnostic", budgetMs: 3000 },
  { name: "auth", path: "/auth", budgetMs: 3000 },
  { name: "robots", path: "/robots.txt", budgetMs: 1500 },
];

type Result = { name: string; status: number; ms: number; ok: boolean; note: string };

async function probe(p: Probe): Promise<Result> {
  const started = Date.now();
  try {
    const res = await fetch(`${BASE}${p.path}`, {
      headers: { accept: "text/html,application/json", "user-agent": "eduos-synthetic-monitor" },
      signal: AbortSignal.timeout(20_000),
    });
    const body = await res.text();
    const ms = Date.now() - started;
    const contentOk = p.expect ? p.expect(body) : true;
    const withinBudget = ms <= p.budgetMs;
    const ok = res.ok && contentOk && withinBudget;
    const note = !res.ok
      ? `http ${res.status}`
      : !contentOk
        ? "unexpected body"
        : !withinBudget
          ? `slow (budget ${p.budgetMs}ms)`
          : "ok";
    return { name: p.name, status: res.status, ms, ok, note };
  } catch (error) {
    return {
      name: p.name,
      status: 0,
      ms: Date.now() - started,
      ok: false,
      note: error instanceof Error ? error.message : "request failed",
    };
  }
}

async function main(): Promise<void> {
  const results = await Promise.all(PROBES.map(probe));
  for (const r of results) {
    console.log(`${r.ok ? "OK  " : "FAIL"} ${r.name.padEnd(11)} ${String(r.status).padStart(3)} ${String(r.ms).padStart(5)}ms  ${r.note}`);
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} probes healthy at ${BASE}`);
  if (failed.length > 0) {
    console.error(`ALERT: ${failed.map((f) => `${f.name} (${f.note})`).join(", ")}`);
    process.exit(1);
  }
}

void main();

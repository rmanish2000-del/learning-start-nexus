# EduOS release fingerprint evidence (append-only)

Method: `scripts/release-fingerprint.mjs` — SHA-256 over sorted paths + contents of
`src/` (excluding generated `routeTree.gen.ts`), `public/`, `supabase/migrations/`,
`package.json`, `vite.config.ts`, `tsconfig.json`. No git, env or network input.
Exposed at `/api/public/version` as `releaseId`, `fingerprint`, `builtAt` only.

## 2026-10-02 corrective release

- Release ID: `eduos-d064be7f74d8`
- Expected fingerprint: `d064be7f74d802cb0a5a92c93089f1e158b76152fee0f9bc450b7f0c8d076434`
- Files fingerprinted: 547
- Local production build embeds the same fingerprint.

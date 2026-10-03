# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Vite dev server (http://localhost:5173)
- `npm run build` — `tsc -b` + Vite build to `dist/`, then stamps a unique cache version into `dist/sw.js` (replaces `finflow-v1`)
- `npm run lint` — typecheck only (`tsc --noEmit`); there is no ESLint
- `npm test` — Vitest unit tests (`src/**/*.test.ts`, mostly `src/lib/__tests__/`)
  - single file: `npx vitest run src/lib/__tests__/recurring.test.ts`; single test: add `-t "name"`
- `npm run test:e2e` — Playwright (`tests/e2e/*.spec.ts`). Its webServer builds in **local mode** (empty `VITE_SUPABASE_*`) and serves on :4173, so tests never touch cloud data.
  - single spec/browser: `npx playwright test --project=chromium tests/e2e/01-app.spec.ts`
  - Only `01-app.spec.ts` runs in the responsive viewport projects.

CI (`.github/workflows/deploy.yml`) runs lint → unit tests → Chromium E2E on every push to `main`, then builds and deploys to GitHub Pages. Pushing to `main` deploys to production.

## Architecture

React 18 + TS + Vite SPA, Tailwind, Zustand, Recharts, Framer Motion. Path alias `@/` → `src/`. `HashRouter` + `base: './'` so it works on any static host / subpath.

**Two runtime modes, chosen at build time** (`src/lib/config.ts` → `CLOUD_ENABLED`):
- **Local mode** (no `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`): whole `AppData` blob persisted to IndexedDB (`src/lib/db.ts`, localStorage fallback); seeded with mock data (`src/data/mockData.ts`); onboarding flow. Used by E2E.
- **Cloud mode**: Supabase auth + Postgres + Realtime, shared by a two-person "household". Login screen instead of onboarding.

**`src/store/useStore.ts` is the core** — a single Zustand store holding all data and every mutation. In cloud mode each mutation updates local state, then calls `push`/`pushMany`/`del`, which enqueue an op in a localStorage-persisted **outbox** (`ff_outbox`) flushed serially to Supabase and retried on reconnect; `syncState` drives the top-bar indicator. Realtime events from other members flow back via `cloud.subscribe`. New mutations should follow this pattern (update state → `persist()` → push to outbox) rather than calling Supabase directly.

**`src/lib/cloud.ts`** maps camelCase app objects ↔ snake_case rows. Columns added by later migrations are optional: they're omitted when empty and stripped-and-retried on a "column not found" error, so the app keeps working against a DB that hasn't run the newest migration. When adding a DB column, update the mapper, `OPTIONAL_COLS`, and add an idempotent SQL migration in `supabase/` (`migration_latest.sql` is the cumulative one; `schema.sql` is the base).

**Pure domain logic lives in `src/lib/`** and is what the unit tests cover: `finance.ts` (balances, projections, settle-up, net worth), `recurring.ts` (recurring-bill occurrences + idempotent auto-posting via `recurrenceKey`), `rates.ts` (FX with a per-day snapshot history in localStorage), `insights.ts`, `export.ts`/`report.ts` (CSV/XLSX/PDF, lazy-loaded). Prefer putting new calculations here with tests rather than in components.

**Money/currency**: base currency is **RON**; `fxRates` are lei per 1 unit of a foreign currency. Amounts are always positive (sign comes from `type`). Foreign-currency entries keep `origCurrency`/`origAmount` so they can be re-converted at the rate for their date. Format money only via `formatMoney` (`src/lib/format.ts`) — it honours privacy mode (masks values).

**Recurring bills & standing income**: `runRecurringPosting` (triggered from `App.tsx`) auto-posts fixed due bills and queues variable-amount ones for confirmation. Monthly salary/"Bonuri" income transactions are created by `ensureStandingIncome` with deterministic ids (`si-<kind>-<owner>-<yyyy-mm>`) and are deliberately excluded from the recurring engine.

**UI layout**: `src/features/<page>/` are lazy-loaded route pages (see routes in `src/App.tsx`); `src/components/ui/` are shared primitives; `src/components/charts/ChartKit.tsx` wraps Recharts. Tailwind tokens in `tailwind.config.js` (income/expense/savings/invest/goal/brand colors; Fraunces + IBM Plex fonts). App chrome is non-selectable; add `.selectable` for text that should be.

**PWA**: `public/sw.js` + `src/lib/pwa.ts` handle offline caching and updates (auto-apply waiting worker on load, toast for mid-session updates, loop-guarded). `ErrorBoundary` + `vite:preloadError` recover once from stale-chunk errors after a deploy.

**Supabase backend extras** (deployed separately, see `REMINDERS_SETUP.md`, `WIDGET_SETUP.md`): edge functions `supabase/functions/send-reminders` (hourly cron → Web Push, needs `VITE_VAPID_PUBLIC_KEY` client-side) and `widget-summary` (token-authed JSON for the Scriptable iPhone widget in `widget/`).

## Conventions

- Commit messages use a `type(scope): summary` style (`feat(goals): …`, `fix(pwa): …`, `ui: …`).
- Pages use the real current date (`new Date()`); unit tests pin dates explicitly.

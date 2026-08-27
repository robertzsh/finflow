# FinFlow — end-to-end browser tests (Playwright)

These run against a **local-mode build** (no Supabase env → no login, no cloud), so
they never touch production data — the app seeds demo data in the browser.

> Note: I authored these specs but could **not execute them in my sandbox** — the
> Playwright Chromium binary download stalls there (0 bytes transferred). They are
> written to run on your machine, where the browser download works.

## Run

```bash
cd finflow
npm i -D @playwright/test        # one-time
npx playwright install           # downloads Chromium/Firefox/WebKit (one-time)
npm run test:e2e                 # builds local-mode, serves :4173, runs all specs
npm run test:e2e:report          # open the HTML report (screenshots/video on failure)
```

Single browser / single spec while iterating:

```bash
npx playwright test --project=chromium tests/e2e/01-app.spec.ts
npx playwright test --ui         # interactive runner
```

## What it covers

| Spec | Flow |
| ---- | ---- |
| `01-app.spec.ts` | app loads · 5 stat cards · console-error assertion · navigate every page · **invalid URL → dashboard redirect** · **theme persists across reload** · **no horizontal scroll** (runs at every viewport) |
| `02-transactions.spec.ts` | create (comma decimal) · empty/zero rejected · edit + delete · search/sort present |
| `03-goals.spec.ts` | create goal · add money · goals page renders |

## Browser + responsive matrix (see `playwright.config.ts`)

- Browsers: **chromium, firefox, webkit** (desktop 1280×800) — full suite.
- Responsive (runs `01-app.spec.ts`): **390×844, 375×812, 430×932, 768×1024, 1440×900, 1920×1080**.

## Tips / expected adjustments

- Selectors use roles + visible text that match the current markup. If you rename a
  button or restructure a row, a selector may need a tweak — the failing test's trace
  (`test:e2e:report`) shows exactly where.
- The service worker doesn't register under plain `http://localhost` preview; the
  helper filters those console messages so they don't fail the "no console errors" check.
- To exercise the **empty state**, delete all goals/transactions first (Settings →
  Reset all data resets local mode).

## CI (optional)

```yaml
- run: npm ci
- run: npx playwright install --with-deps
- run: npm run test:e2e
```

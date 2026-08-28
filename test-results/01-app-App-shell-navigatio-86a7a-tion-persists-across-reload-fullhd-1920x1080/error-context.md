# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 01-app.spec.ts >> App shell, navigation, routing, layout >> theme selection persists across reload
- Location: tests/e2e/01-app.spec.ts:40:3

# Error details

```
Error: expect(locator).toHaveClass(expected) failed

Locator: locator('html')
Expected pattern: /pink/
Received string:  "dark"
Timeout: 5000ms

Call log:
  - Expect "toHaveClass" with timeout 5000ms
  - waiting for locator('html')
    14 × locator resolved to <html lang="en" class="dark">…</html>
       - unexpected value "dark"

```

```yaml
- document:
  - complementary
  - main
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { openApp, hasHorizontalScroll } from './helpers';
  3  | 
  4  | test.describe('App shell, navigation, routing, layout', () => {
  5  |   test('loads the dashboard with the 5 key stat cards', async ({ page }) => {
  6  |     await openApp(page);
  7  |     for (const label of ['Account balance', 'Monthly income', 'Monthly spending', 'Savings this month', 'Savings rate']) {
  8  |       await expect(page.getByText(label, { exact: false }).first()).toBeVisible();
  9  |     }
  10 |   });
  11 | 
  12 |   test('no console errors on load', async ({ page }) => {
  13 |     const errors = await openApp(page);
  14 |     // If this fails, the message lists the exact console.error(s) seen on load.
  15 |     expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
  16 |   });
  17 | 
  18 |   test('navigates to every primary page', async ({ page, viewport }) => {
  19 |     test.skip(!!viewport && viewport.width < 1024, 'desktop sidebar only (mobile hides items under More)');
  20 |     await openApp(page);
  21 |     for (const [name, heading] of [
  22 |       ['Transactions', /transactions/i],
  23 |       ['Goals', /goals/i],
  24 |       ['Investments', /investment/i],
  25 |       ['Calendar', /calendar|august|september/i],
  26 |       ['Reports', /report/i],
  27 |       ['Settings', /settings|appearance/i],
  28 |     ] as const) {
  29 |       await page.getByRole('link', { name, exact: false }).first().click();
  30 |       await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible({ timeout: 10_000 });
  31 |     }
  32 |   });
  33 | 
  34 |   test('invalid URL redirects to the dashboard (catch-all route)', async ({ page }) => {
  35 |     await openApp(page);
  36 |     await page.goto('/#/definitely-not-a-real-page');
  37 |     await expect(page.getByText(/account balance/i)).toBeVisible();
  38 |   });
  39 | 
  40 |   test('theme selection persists across reload', async ({ page, viewport }) => {
  41 |     test.skip(!!viewport && viewport.width < 1024, 'Settings sits under More on mobile');
  42 |     await openApp(page);
  43 |     await page.getByRole('link', { name: /settings/i }).first().click();
  44 |     await page.getByRole('button', { name: /pink/i }).click();
  45 |     await expect(page.locator('html')).toHaveClass(/pink/);
  46 |     await page.reload();
> 47 |     await expect(page.locator('html')).toHaveClass(/pink/); // restored from IndexedDB
     |                                        ^ Error: expect(locator).toHaveClass(expected) failed
  48 |     // reset to dark so other tests are unaffected
  49 |     await page.getByRole('button', { name: /^dark/i }).click();
  50 |   });
  51 | 
  52 |   test('no horizontal scrolling at this viewport', async ({ page }) => {
  53 |     await openApp(page);
  54 |     expect(await hasHorizontalScroll(page), 'page scrolls sideways').toBe(false);
  55 |     // scroll through the dashboard and re-check
  56 |     await page.mouse.wheel(0, 2000);
  57 |     expect(await hasHorizontalScroll(page)).toBe(false);
  58 |   });
  59 | });
  60 | 
```
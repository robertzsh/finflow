# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 01-app.spec.ts >> App shell, navigation, routing, layout >> loads the dashboard with the 5 key stat cards and no console errors
- Location: tests/e2e/01-app.spec.ts:5:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/account balance/i)
Expected: visible
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 20000ms
  - waiting for getByText(/account balance/i)

```

```yaml
- img
- heading "Welcome to FinFlow" [level=1]
- paragraph: A calm, private place to see where your money moves — all stored locally on your device.
- button "Continue":
  - text: Continue
  - img
```

# Test source

```ts
  1  | import { Page, expect } from '@playwright/test';
  2  | 
  3  | /** Open the app, complete first-run onboarding if shown, and collect console/page errors.
  4  |  *  Returns the live error array so tests can assert "no console errors". */
  5  | export async function openApp(page: Page): Promise<string[]> {
  6  |   const errors: string[] = [];
  7  |   page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  8  |   page.on('pageerror', (e) => errors.push(String(e)));
  9  |   // ignore known-noisy service worker registration failures under preview (no HTTPS)
  10 |   const ignore = (t: string) => /service ?worker|manifest|favicon|ERR_/i.test(t);
  11 | 
  12 |   await page.goto('/');
  13 | 
  14 |   // Local mode shows a 2-step onboarding on first run.
  15 |   const cont = page.getByRole('button', { name: /continue/i });
  16 |   if (await cont.isVisible({ timeout: 4000 }).catch(() => false)) {
  17 |     await cont.click();
  18 |     await page.getByRole('button', { name: /enter finflow/i }).click();
  19 |   }
> 20 |   await expect(page.getByText(/account balance/i)).toBeVisible({ timeout: 20_000 });
     |                                                    ^ Error: expect(locator).toBeVisible() failed
  21 | 
  22 |   return errors.filter((e) => !ignore(e));
  23 | }
  24 | 
  25 | /** True if the page scrolls horizontally (a responsive red flag). */
  26 | export async function hasHorizontalScroll(page: Page): Promise<boolean> {
  27 |   return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  28 | }
  29 | 
```
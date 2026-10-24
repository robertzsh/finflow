import { test, expect } from '@playwright/test';
import { openApp, hasHorizontalScroll } from './helpers';

// Pink Aura is its own skin (src/aura) — the rest of the suite runs the classic Dark UI,
// so walk every page here to catch a broken or crashing aura screen.
test.describe('Pink Aura skin', () => {
  // Let page.route() see every request (the PWA service worker would otherwise fetch them).
  test.use({ serviceWorkers: 'block' });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem('ff_theme', 'pink'); } catch { /* ignore */ } });
    // Live price feeds rate-limit test runs (WebKit reports the failed fetch as a page error);
    // answer them with "no prices" so the walk-through is deterministic.
    await page.route(/api\.coingecko\.com|finnhub\.io/, (r) => r.fulfill({ json: {}, headers: { 'access-control-allow-origin': '*' } }));
  });

  test('renders every page without errors or sideways scroll', async ({ page }) => {
    // Uncaught exceptions only: console noise from third-party CDNs varies by browser
    // and network and isn't an aura bug.
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    await openApp(page);
    await expect(page.locator('html')).toHaveClass(/pink/);
    for (const [path, heading] of [
      ['/transactions', /transactions/i],
      ['/goals', /goals/i],
      ['/budgets', /budgets/i],
      ['/savings', /economii/i],
      ['/investments', /investments/i],
      ['/calendar', /calendar/i],
      ['/reports', /reports/i],
      ['/settings', /settings/i],
    ] as const) {
      await page.goto(`/#${path}`);
      await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible({ timeout: 10_000 });
      expect(await hasHorizontalScroll(page), `${path} scrolls sideways`).toBe(false);
    }
    expect(errors, `errors:\n${errors.join('\n')}`).toEqual([]);
  });

  test('quick add opens the transaction dialog', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: /add transaction/i }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('button', { name: /^add transaction$/i })).toBeVisible();
  });
});

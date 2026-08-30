import { test, expect } from '@playwright/test';
import { openApp, hasHorizontalScroll } from './helpers';

test.describe('App shell, navigation, routing, layout', () => {
  test('loads the dashboard with the key stat cards', async ({ page }) => {
    await openApp(page);
    for (const label of ['Monthly income', 'Monthly spending', 'Savings this month', 'Savings rate']) {
      await expect(page.getByText(label, { exact: false }).first()).toBeVisible();
    }
  });

  test('no console errors on load', async ({ page }) => {
    const errors = await openApp(page);
    // If this fails, the message lists the exact console.error(s) seen on load.
    expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
  });

  test('navigates to every primary page', async ({ page, viewport }) => {
    test.skip(!!viewport && viewport.width < 1024, 'desktop sidebar only (mobile hides items under More)');
    await openApp(page);
    for (const [name, heading] of [
      ['Transactions', /transactions/i],
      ['Goals', /goals/i],
      ['Investments', /investment/i],
      ['Calendar', /calendar|august|september/i],
      ['Reports', /report/i],
      ['Settings', /settings|appearance/i],
    ] as const) {
      await page.getByRole('link', { name, exact: false }).first().click();
      await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test('invalid URL redirects to the dashboard (catch-all route)', async ({ page }) => {
    await openApp(page);
    await page.goto('/#/definitely-not-a-real-page');
    await expect(page.getByText(/monthly income/i).first()).toBeVisible();
  });

  test('theme selection persists across reload', async ({ page, viewport }) => {
    test.skip(!!viewport && viewport.width < 1024, 'Settings sits under More on mobile');
    await openApp(page);
    await page.getByRole('link', { name: /settings/i }).first().click();
    await page.getByRole('button', { name: /pink/i }).click();
    await expect(page.locator('html')).toHaveClass(/pink/);
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/pink/); // restored from IndexedDB
    // reset to dark so other tests are unaffected
    await page.getByRole('button', { name: /^dark/i }).click();
  });

  test('no horizontal scrolling at this viewport', async ({ page }) => {
    await openApp(page);
    expect(await hasHorizontalScroll(page), 'page scrolls sideways').toBe(false);
    // scroll through the dashboard and re-check
    await page.mouse.wheel(0, 2000);
    expect(await hasHorizontalScroll(page)).toBe(false);
  });
});

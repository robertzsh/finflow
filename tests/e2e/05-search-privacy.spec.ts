import { test, expect } from '@playwright/test';
import { openApp } from './helpers';

test.describe('Command palette', () => {
  test('opens with the keyboard shortcut and navigates via a page entry', async ({ page }) => {
    await openApp(page);
    await page.keyboard.press('Control+k');
    await expect(page.getByPlaceholder(/search or jump to/i)).toBeVisible();

    // "Goals" appears as a button in the palette (the sidebar uses a link), so this
    // is unambiguous. Clicking it should route to the Goals page.
    await page.getByRole('button', { name: 'Goals', exact: true }).click();
    await expect(page.getByRole('heading', { name: /goals/i }).first()).toBeVisible();
  });

  test('"Add new transaction" from the palette opens the transaction dialog', async ({ page }) => {
    await openApp(page);
    await page.keyboard.press('Control+k');
    await page.getByRole('button', { name: /add new transaction/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});

test.describe('Privacy / presentation mode', () => {
  // Desktop-only: the privacy toggle lives in the top bar (hidden behind mobile chrome).
  test('hiding amounts masks money values across the dashboard', async ({ page, viewport }) => {
    test.skip(!!viewport && viewport.width < 1024, 'top bar toggle is desktop-only');
    await openApp(page);

    // A currency value is visible before masking.
    await expect(page.getByText(/lei|RON/i).first()).toBeVisible();

    await page.getByRole('button', { name: /hide amounts/i }).click();
    await expect(page.getByText('••••').first()).toBeVisible();

    // toggle back so the app is left in its default state
    await page.getByRole('button', { name: /show amounts/i }).click();
  });
});

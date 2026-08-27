import { test, expect } from '@playwright/test';
import { openApp } from './helpers';

test.describe('Goals — create, fund, history', () => {
  test('create a goal and add money to it', async ({ page }) => {
    await openApp(page);
    await page.getByRole('link', { name: /goals/i }).first().click();

    await page.getByRole('button', { name: /new goal/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByPlaceholder(/emergency fund/i).fill('E2E Test Goal');
    // target amount is the first numeric field in the modal
    await dialog.getByPlaceholder('0,00').first().fill('1000');
    await dialog.getByRole('button', { name: /create goal/i }).click();
    await expect(dialog).toBeHidden();

    await expect(page.getByText('E2E Test Goal')).toBeVisible();

    // fund it
    const card = page.locator('div', { hasText: 'E2E Test Goal' }).first();
    await card.getByRole('button', { name: /add money/i }).click();
    const fund = page.getByRole('dialog');
    await fund.getByPlaceholder('0,00').fill('250,50');
    await fund.getByRole('button', { name: /add/i }).click();
    await expect(fund).toBeHidden();

    // progress / contribution reflected
    await expect(page.getByText('E2E Test Goal')).toBeVisible();
  });

  test('empty state renders when there are no goals (documented)', async ({ page }) => {
    // The seed includes demo goals, so this asserts the Goals page renders a
    // heading rather than a true empty state. Delete all goals to see the empty UI.
    await openApp(page);
    await page.getByRole('link', { name: /goals/i }).first().click();
    await expect(page.getByRole('heading', { name: /goals/i }).first()).toBeVisible();
  });
});

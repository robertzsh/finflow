import { test, expect } from '@playwright/test';
import { openApp } from './helpers';

// Economii (savings pots): a deposit lands in the pot and its history, and it is
// a transfer — it lowers the balance without counting as spending.
test.describe('Economii / savings pots', () => {
  test('create a pot, deposit into it, and see it in the history', async ({ page }) => {
    await openApp(page);
    await page.goto('/#/savings');
    await expect(page.getByRole('heading', { name: 'Economii', exact: true })).toBeVisible();
    await expect(page.getByText(/this month's target/i)).toBeVisible();

    await page.getByRole('button', { name: /new pot/i }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder(/ing savings/i).fill('E2E Pot');
    await dialog.getByRole('button', { name: /create pot/i }).click();
    await expect(dialog).toBeHidden();

    const card = page.locator('div', { has: page.getByRole('heading', { name: 'E2E Pot' }) }).last();
    await card.getByRole('button', { name: /deposit/i }).click();
    const move = page.getByRole('dialog');
    await move.getByRole('textbox', { name: 'Amount' }).fill('750');
    await move.getByRole('button', { name: /^deposit/i }).click();
    await expect(move).toBeHidden();
    await expect(card.getByText(/750/).first()).toBeVisible();

    await card.getByRole('button', { name: 'History' }).click();
    await expect(page.getByRole('dialog').getByText(/\+750/).first()).toBeVisible();
  });

  test('reports balance breakdown lists money moved to Economii', async ({ page }) => {
    await openApp(page);
    await page.goto('/#/reports');
    await page.locator('select', { has: page.locator('option[value="balance"]') }).selectOption('balance');
    await expect(page.getByText(/moved to economii/i)).toBeVisible(); // seeded pots have movements
  });
});

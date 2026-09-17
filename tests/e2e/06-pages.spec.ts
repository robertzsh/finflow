import { test, expect } from '@playwright/test';
import { openApp } from './helpers';

// Covers the pages/flows that had no browser test: Investments (+ live-price markets),
// the Reports "Balance breakdown", Budgets, and sub-category search in the tx form.
test.describe('Investments / Reports / Budgets / category search', () => {
  test('investments page shows portfolio, markets and opens the add-holding modal', async ({ page }) => {
    await openApp(page);
    await page.getByRole('link', { name: /investments/i }).first().click();
    await expect(page.getByRole('heading', { name: /investment/i }).first()).toBeVisible();
    await expect(page.getByText('Markets').first()).toBeVisible();          // live-quotes watchlist
    await expect(page.getByText(/portfolio value/i).first()).toBeVisible();

    await page.getByRole('button', { name: /add holding/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: /add holding/i })).toBeVisible();
    await expect(dialog.getByPlaceholder(/apple inc/i)).toBeVisible(); // the Name field
  });

  test('reports → Balance breakdown explains the current balance', async ({ page }) => {
    await openApp(page);
    await page.getByRole('link', { name: /reports/i }).first().click();
    await expect(page.getByRole('heading', { name: /report/i }).first()).toBeVisible();
    // switch the report-type dropdown (the one that offers the balance view) to it
    await page.locator('select', { has: page.locator('option[value="balance"]') }).selectOption('balance');
    await expect(page.getByText(/how your balance is calculated/i)).toBeVisible();
    await expect(page.getByText(/current balance/i)).toBeVisible();
    await expect(page.getByText(/all income logged/i)).toBeVisible();
  });

  test('budgets page is reachable and renders (desktop nav)', async ({ page, viewport }) => {
    test.skip(!!viewport && viewport.width < 1024, 'Budgets sits under More on mobile');
    await openApp(page);
    await page.getByRole('link', { name: /budgets/i }).first().click();
    await expect(page.getByRole('heading', { name: /budget/i }).first()).toBeVisible();
    await expect(page.getByText(/total budget/i).first()).toBeVisible();
  });

  test('category search finds sub-categories (Lidl under Groceries)', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: /add transaction/i }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('combobox', { name: 'Category', exact: true }).first().click();
    await dialog.getByRole('textbox', { name: /search categories/i }).fill('lidl');
    await expect(dialog.getByRole('listbox').getByRole('option', { name: /lidl/i }).first()).toBeVisible();
  });
});

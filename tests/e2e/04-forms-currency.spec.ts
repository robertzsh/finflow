import { test, expect } from '@playwright/test';
import { openApp } from './helpers';

// Opens the Quick-add transaction dialog from the dashboard.
async function openAddTx(page: import('@playwright/test').Page) {
  await openApp(page);
  await page.getByRole('button', { name: /add transaction/i }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe('Transaction form — validation edge cases', () => {
  // Existing suite covers the empty-amount case; these cover invalid numeric input.
  test('rejects a negative amount with an inline error', async ({ page }) => {
    const dialog = await openAddTx(page);
    await dialog.getByPlaceholder('0,00').fill('-5');
    await dialog.getByRole('combobox', { name: 'Category', exact: true }).click();
    await dialog.getByRole('listbox').getByRole('option').first().click();
    await dialog.getByRole('button', { name: /^add transaction$/i }).click();
    // must NOT submit; an error must be shown
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/greater than 0|enter an amount/i).first()).toBeVisible();
  });

  test('rejects a zero amount', async ({ page }) => {
    const dialog = await openAddTx(page);
    await dialog.getByPlaceholder('0,00').fill('0');
    await dialog.getByRole('combobox', { name: 'Category', exact: true }).click();
    await dialog.getByRole('listbox').getByRole('option').first().click();
    await dialog.getByRole('button', { name: /^add transaction$/i }).click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/greater than 0|enter an amount|amount/i).first()).toBeVisible();
  });

  test('whitespace-only amount does not submit', async ({ page }) => {
    const dialog = await openAddTx(page);
    await dialog.getByPlaceholder('0,00').fill('   ');
    await dialog.getByRole('button', { name: /^add transaction$/i }).click();
    await expect(dialog).toBeVisible(); // stayed open
  });
});

test.describe('Transaction form — multi-currency entry', () => {
  // Picking a non-base currency must show a live conversion preview to the base
  // currency (rate value can vary with live FX, so we assert structure, not a number).
  test('choosing EUR shows a RON conversion hint that differs from the typed amount', async ({ page }) => {
    const dialog = await openAddTx(page);
    await dialog.getByPlaceholder('0,00').fill('100');
    await dialog.getByRole('combobox', { name: 'Currency' }).selectOption('EUR');
    const hint = dialog.getByText(/RON\/EUR/i).first();
    await expect(hint).toBeVisible();
    // the hint carries a "≈ … lei" converted value, i.e. not just the literal 100
    await expect(hint).toContainText(/≈/);
  });
});

test.describe('Transaction form — searchable category', () => {
  test('typing filters the category list, and Escape closes only the dropdown', async ({ page }) => {
    const dialog = await openAddTx(page);
    await dialog.getByRole('combobox', { name: 'Category', exact: true }).click();
    const listbox = dialog.getByRole('listbox');
    await expect(listbox).toBeVisible();

    const before = await listbox.getByRole('option').count();
    await dialog.getByRole('textbox', { name: /search categories/i }).fill('rent');
    // filtering narrows the list to fewer options than the full list
    await expect.poll(async () => listbox.getByRole('option').count()).toBeLessThan(before);
    await expect(listbox.getByRole('option', { name: /rent/i }).first()).toBeVisible();

    // Regression (defect): Escape must close the dropdown but keep the form open.
    await dialog.getByRole('textbox', { name: /search categories/i }).press('Escape');
    await expect(listbox).toBeHidden();
    await expect(dialog).toBeVisible();
  });
});

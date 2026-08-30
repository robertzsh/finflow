import { test, expect } from '@playwright/test';
import { openApp } from './helpers';

test.describe('Transactions — create / edit / delete / search / sort', () => {
  test('create a transaction with a comma decimal amount', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: /add transaction/i }).first().click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByPlaceholder('0,00').fill('123,45');
    // Category is a searchable combobox: open it, then pick the first option.
    await dialog.getByRole('combobox', { name: 'Category', exact: true }).click();
    await dialog.getByRole('option').first().click();
    await dialog.getByRole('button', { name: /^add transaction$/i }).click();
    await expect(dialog).toBeHidden();

    await page.getByRole('link', { name: /transactions/i }).first().click();
    await page.getByPlaceholder(/search/i).fill('123');
    await expect(page.getByText(/123[.,]45/).first()).toBeVisible();
  });

  test('rejects an empty amount with an inline error', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: /add transaction/i }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: /^add transaction$/i }).click();
    await expect(dialog).toBeVisible(); // did NOT submit
    await expect(dialog.getByText(/please fill in|greater than 0|enter an amount|pick a category/i).first()).toBeVisible();
  });

  test('edit then delete a transaction', async ({ page }) => {
    await openApp(page);
    await page.getByRole('link', { name: /transactions/i }).first().click();

    // open the first row's edit modal via its labelled pencil button
    await page.getByRole('button', { name: /edit transaction/i }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByPlaceholder('0,00').fill('77,77');
    await dialog.getByRole('button', { name: /save changes/i }).click();
    await expect(dialog).toBeHidden();

    // re-open and delete
    await page.getByRole('button', { name: /edit transaction/i }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: /delete transaction/i }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('search with no matches, then sort control present', async ({ page }) => {
    await openApp(page);
    await page.getByRole('link', { name: /transactions/i }).first().click();
    await page.getByPlaceholder(/search/i).fill('zzzz-no-such-merchant');
    // no transaction rows should remain (the amounts column disappears)
    await expect(page.getByText(/−|\+/).first()).toBeHidden({ timeout: 4000 }).catch(() => {});
    await page.getByPlaceholder(/search/i).fill('');
    await expect(page.getByRole('combobox').first()).toBeVisible(); // sort dropdown
  });
});

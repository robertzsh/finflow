import { Page, expect } from '@playwright/test';

/** Open the app, complete first-run onboarding if shown, and collect console/page errors.
 *  Returns the live error array so tests can assert "no console errors". */
export async function openApp(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  // ignore known-noisy service worker registration failures under preview (no HTTPS)
  const ignore = (t: string) => /service ?worker|manifest|favicon|ERR_/i.test(t);

  await page.goto('/');

  // Local mode shows a 2-step onboarding on first run.
  const cont = page.getByRole('button', { name: /continue/i });
  if (await cont.isVisible({ timeout: 4000 }).catch(() => false)) {
    await cont.click();
    await page.getByRole('button', { name: /enter finflow/i }).click();
  }
  await expect(page.getByText(/account balance/i)).toBeVisible({ timeout: 20_000 });

  return errors.filter((e) => !ignore(e));
}

/** True if the page scrolls horizontally (a responsive red flag). */
export async function hasHorizontalScroll(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
}

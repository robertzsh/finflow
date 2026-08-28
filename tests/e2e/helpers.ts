import { Page, expect } from '@playwright/test';

/** Open the app in LOCAL mode, click through first-run onboarding, and return console/page errors.
 *  On failure it throws an error containing the ACTUAL on-screen text + URL, so the cause is
 *  obvious from the error line alone (login screen / stuck loading / onboarding / crash). */
export async function openApp(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  const ignore = (t: string) => /service ?worker|manifest|favicon|ERR_|Failed to load resource/i.test(t);

  await page.goto('/');

  const dash = page.getByText(/account balance/i).first();
  const pwd = page.locator('input[type="password"]').first();

  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    if (await dash.isVisible().catch(() => false)) return errors.filter((e) => !ignore(e));
    if (await pwd.isVisible().catch(() => false)) {
      throw new Error('CLOUD mode: a login screen is showing. Build without Supabase env — see E2E_TESTING.md.');
    }
    const btn = page.getByRole('button', { name: /continue|next|enter finflow|get started/i }).first();
    if (await btn.isVisible().catch(() => false)) await btn.click().catch(() => {});
    await page.waitForTimeout(350);
  }

  const seen = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 240);
  throw new Error(`Dashboard never rendered in 12s. URL=${page.url()} — on screen: "${seen}"`);
}

export async function hasHorizontalScroll(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
}

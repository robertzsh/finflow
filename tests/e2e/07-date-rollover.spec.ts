import { test, expect } from '@playwright/test';
import { openApp } from './helpers';

// An installed PWA can stay open for days. Pages must follow the real date instead of
// the moment the app was loaded (useToday).
test.use({ timezoneId: 'Europe/Bucharest' });

test('dashboard rolls over to the new month at local midnight while open', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-30T23:58:00+03:00') });
  await openApp(page);
  await expect(page.getByText('September 2026', { exact: false }).first()).toBeVisible();

  await page.clock.fastForward('03:00'); // → 00:01 on Oct 1, past the midnight timer
  await expect(page.getByText('October 2026', { exact: false }).first()).toBeVisible();
});

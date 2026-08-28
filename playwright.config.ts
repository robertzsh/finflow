import { defineConfig, devices } from '@playwright/test';

// FinFlow E2E — runs against a LOCAL-mode build (no Supabase env), so there is
// no auth and no production data: the app seeds demo data in the browser (IndexedDB).
// `npm run build` with no VITE_SUPABASE_* vars → CLOUD_ENABLED=false.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  // Build in local mode, then preview the static dist.
  // The inline empty VITE_SUPABASE_* vars force LOCAL mode (no login) and take
  // priority over any .env / .env.local on macOS/Linux. On Windows, run the build
  // once yourself with those vars empty, then `npx playwright test`.
  webServer: {
    command: 'VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' },
  },
  projects: [
    // Browser matrix (desktop 1280×800) — runs the full suite.
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 1280, height: 800 } } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 800 } } },

    // Responsive matrix — runs only the layout spec (app.spec) to keep it fast.
    { name: 'iphone-13 390x844', testMatch: /01-app\.spec\.ts/, use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: 'iphone-se 375x812', testMatch: /01-app\.spec\.ts/, use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } },
    { name: 'iphone-max 430x932', testMatch: /01-app\.spec\.ts/, use: { ...devices['Desktop Chrome'], viewport: { width: 430, height: 932 }, isMobile: true, hasTouch: true } },
    { name: 'ipad 768x1024', testMatch: /01-app\.spec\.ts/, use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } } },
    { name: 'desktop 1440x900', testMatch: /01-app\.spec\.ts/, use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'fullhd 1920x1080', testMatch: /01-app\.spec\.ts/, use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } } },
  ],
});

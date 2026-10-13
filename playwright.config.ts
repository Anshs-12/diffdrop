import { defineConfig, devices } from '@playwright/test';

const PORT = 4318;

/**
 * Browser tests run against the production build (so the Content Security
 * Policy is active). Locally they use the installed Google Chrome; set
 * PW_CHANNEL= (empty) to use Playwright's bundled Chromium instead, e.g. in CI
 * after `npx playwright install chromium`.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices['Desktop Chrome'],
    channel: process.env.PW_CHANNEL ?? 'chrome',
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    { name: 'app', testIgnore: /perf\.spec\.ts/ },
    // Timing tests run alone so parallel tests don't skew the numbers
    { name: 'perf', testMatch: /perf\.spec\.ts/, fullyParallel: false },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

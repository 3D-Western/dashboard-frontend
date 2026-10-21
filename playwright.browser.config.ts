import { defineConfig, devices } from '@playwright/test';

/**
 * Browser-capability tests that need no app server: they load a small bundle into a blank page.
 * `pnpm run test:browser`. Chromium only, since it has the H.264 encoder the tests need.
 */
export default defineConfig({
  testDir: './e2e-browser',
  reporter: [['list']],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});

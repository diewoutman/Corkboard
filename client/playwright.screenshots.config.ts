import { defineConfig, devices } from '@playwright/test';

/**
 * Generates the screenshots embedded in the repo's README (docs/screenshots/*.png). Separate from
 * playwright.config.ts so it doesn't run as part of the regular e2e suite/CI — it's a docs-authoring
 * tool, invoked on demand via `npm run screenshots`. Reuses the same dev.sh-backed webServer setup.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/screenshots.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4200',
    viewport: { width: 1440, height: 900 },
    trace: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: '../scripts/dev.sh',
    url: 'http://localhost:4200',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});

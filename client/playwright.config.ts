import { defineConfig, devices } from '@playwright/test';

/**
 * E2E tests exercise the real stack (Angular dev server + API + Postgres), not mocks — they log in
 * via the dev-only seed endpoint and drive the UI like a user would. `scripts/dev.sh` starts all
 * three; if it's already running (the common case while developing), Playwright reuses it instead
 * of spawning a second copy.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'retain-on-failure',
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

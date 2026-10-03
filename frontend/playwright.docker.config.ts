import { defineConfig, devices } from '@playwright/test';

/** Run the browser suite against the built Docker image serving on port 8080. */
export default defineConfig({
  testDir: './e2e',
  testIgnore: '**/screenshots.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8080',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});

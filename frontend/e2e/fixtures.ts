import { test as base, expect, type Page } from '@playwright/test';

const email = process.env.E2E_EMAIL ?? 'playwright@corkboard.test';
const password = process.env.E2E_PASSWORD ?? 'playwright-password';
let cachedAuth: string | null = null;

/** Bootstrap a clean instance through the same first-run UI real users use. */
export async function ensureTestAccount(page: Page): Promise<void> {
  if (cachedAuth) {
    await page.goto('/login');
    await page.evaluate((auth) => localStorage.setItem('corkboard.auth', auth), cachedAuth);
    await page.goto('/home');
    await page.waitForURL('**/home');
    return;
  }

  const setupStatus = await page.request.get('/api/setup/status');
  const { isConfigured } = await setupStatus.json() as { isConfigured: boolean };
  await page.goto('/login');
  const submit = page.locator('form button[type="submit"]');
  if (!isConfigured) {
    await expect(submit).toHaveText('Create account and continue');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Create account and continue' }).click();
    await page.waitForURL('**/family-setup');

    await page.getByLabel('Family name').fill('Playwright Family');
    await page.getByLabel('Time zone').fill('Europe/Amsterdam');
    await page.getByLabel('Your display name').fill('Playwright Owner');
    await page.getByRole('button', { name: 'Create family' }).click();
    await page.waitForURL('**/add-members');
    await page.getByRole('button', { name: 'Finish setup' }).click();
  } else {
    await expect(submit).toHaveText('Log in');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.locator('form button[type="submit"]').click();
  }
  await page.waitForURL('**/home');
  cachedAuth = await page.evaluate(() => localStorage.getItem('corkboard.auth'));
}

export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ page }, use) => {
    await ensureTestAccount(page);
    await use(page);
  },
});

export { expect };

/** A short random suffix so parallel/repeat test runs never collide on fixture names. */
export function unique(label: string): string {
  return `${label} ${Math.random().toString(36).slice(2, 8)}`;
}

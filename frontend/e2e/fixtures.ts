import { test as base, expect, type Page } from '@playwright/test';

/**
 * Logs into the dev-seeded "Dev Family" via the login page's dev-only shortcut. Idempotent server
 * side (SetupController.SeedDevData) — every test run logs into the same Family rather than piling
 * up new ones, so specs must create their own uniquely-named fixtures instead of relying on the
 * seed's fixed data.
 */
async function seedAndLogIn(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Seed test data & log in (dev only)' }).click();
  await page.waitForURL('**/home');
}

export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ page }, use) => {
    await seedAndLogIn(page);
    await use(page);
  },
});

export { expect };

/**
 * Opens the create FAB or submits the currently open create form. Both controls
 * are named "Create", so a page-wide role locator is ambiguous once the form opens.
 */
export async function clickCreate(page: Page): Promise<void> {
  const submit = page.locator('form').getByRole('button', { name: 'Create', exact: true });
  if (await submit.count() > 0) {
    await submit.click();
    return;
  }

  await page.getByRole('button', { name: 'Create', exact: true }).click();
}

/** A short random suffix so parallel/repeat test runs never collide on fixture names. */
export function unique(label: string): string {
  return `${label} ${Math.random().toString(36).slice(2, 8)}`;
}

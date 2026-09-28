import { test, expect, ensureTestAccount } from './fixtures';

/**
 * Exercises AuthController.Login end to end against the real API: a wrong
 * password is rejected, and the correct one still works afterwards. Stops
 * short of actually tripping the account lockout (see AuthControllerTests'
 * Login_locks_the_account_out_after_repeated_failed_attempts for that) —
 * this spec reuses the shared E2E account across runs, and the
 * lockout is a real 15-minute timer with no API to reset it, so tripping it
 * here would break reruns of this spec for 15 minutes. Logging in
 * successfully at the end resets the failed-attempt count, leaving the
 * account exactly as clean as it started.
 */
test('login rejects a wrong password, then succeeds with the correct one', async ({ page }) => {
  // Ensures the account and family exist through the supported first-run flow,
  // then logs back out so the password check is exercised below.
  await ensureTestAccount(page);
  await page.evaluate(() => localStorage.clear());

  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();

  const email = process.env.E2E_EMAIL ?? 'playwright@corkboard.test';

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('wrong-password');
  const failedLogin = page.waitForResponse((response) => response.url().endsWith('/api/auth/login'));
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect((await failedLogin).status()).toBe(401);

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(process.env.E2E_PASSWORD ?? 'playwright-password');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await page.waitForURL('**/home');
});

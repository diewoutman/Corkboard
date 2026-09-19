import { test, expect } from './fixtures';

/**
 * Exercises AuthController.Login end to end against the real API: a wrong
 * password is rejected, and the correct one still works afterwards. Stops
 * short of actually tripping the account lockout (see AuthControllerTests'
 * Login_locks_the_account_out_after_repeated_failed_attempts for that) —
 * this spec reuses the shared dev-seeded account across runs, and the
 * lockout is a real 15-minute timer with no API to reset it, so tripping it
 * here would break reruns of this spec for 15 minutes. Logging in
 * successfully at the end resets the failed-attempt count, leaving the
 * account exactly as clean as it started.
 */
test('login rejects a wrong password, then succeeds with the correct one', async ({ page }) => {
  // Ensures the dev Family/account exist, then logs back out — seeding itself
  // doesn't go through the password check, so it can't affect the lockout.
  await page.goto('/login');
  await page.getByRole('button', { name: 'Seed test data & log in (dev only)' }).click();
  await page.waitForURL('**/home');
  await page.evaluate(() => localStorage.clear());

  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();

  const email = 'dev@corkboard.test';

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('wrong-password');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByText('Invalid credentials')).toBeVisible();

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('devpassword');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await page.waitForURL('**/home');
});

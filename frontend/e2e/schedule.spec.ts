import { test, expect, unique } from './fixtures';

test('a schedule entry can be edited via its edit button', async ({ authedPage: page }) => {
  const scheduleName = unique('Schedule');
  const originalTitle = unique('Entry');
  const editedTitle = `${originalTitle} (edited)`;

  await page.goto('/calendar');
  await page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Schedules' }) })
    .getByRole('button', { name: '+ Add' })
    .click();
  await page.getByLabel('Name').fill(scheduleName);
  await page.getByLabel('Name').press('Enter');

  await page.locator('li').filter({ hasText: scheduleName }).getByRole('link', { name: 'Edit schedule' }).click();
  await page.waitForURL('**/calendar/schedules/**');

  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill(originalTitle);
  await page.getByLabel('Start time').fill('09:00');
  await page.getByRole('button', { name: 'Add entry' }).click();

  const entry = page.locator('li').filter({ hasText: originalTitle });
  await expect(entry).toBeVisible();

  await entry.getByRole('button', { name: 'Edit' }).click();

  await expect(page.getByRole('heading', { name: 'Edit entry' })).toBeVisible();
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue(originalTitle);
  await expect(page.getByLabel('Start time')).toHaveValue('09:00');

  await page.getByLabel('Title', { exact: true }).fill(editedTitle);
  await page.getByRole('button', { name: 'Save changes' }).click();

  await expect(page.getByRole('heading', { name: 'Edit entry' })).toHaveCount(0);
  await expect(page.locator('li').filter({ hasText: editedTitle })).toBeVisible();
});

import { test, expect, unique } from './fixtures';

function todayAt(hour: string): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${hour}`;
}

test('a calendar event can be edited via its edit button', async ({ authedPage: page }) => {
  const calendarName = unique('Calendar');
  const originalTitle = unique('Event');
  const editedTitle = `${originalTitle} (edited)`;

  await page.goto('/calendar');
  await page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Calendars' }) })
    .getByRole('button', { name: '+ Add' })
    .click();
  await page.getByLabel('Name').fill(calendarName);
  await page.getByLabel('Name').press('Enter');

  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await page.getByLabel('Calendar', { exact: true }).selectOption({ label: calendarName });
  await page.getByLabel('Event', { exact: true }).fill(originalTitle);
  await page.getByLabel('Start').fill(todayAt('10:00'));
  await page.getByRole('button', { name: 'Add event' }).click();

  // Selecting the day the event chip is on reveals the day-detail list with its edit/delete buttons.
  await page.getByText(originalTitle, { exact: true }).first().click();

  const entry = page.locator('li').filter({ hasText: originalTitle });
  await expect(entry).toBeVisible();

  await entry.getByRole('button', { name: 'Edit' }).click();

  await expect(page.getByRole('heading', { name: 'Edit event' })).toBeVisible();
  await expect(page.getByLabel('Event', { exact: true })).toHaveValue(originalTitle);

  await page.getByLabel('Event', { exact: true }).fill(editedTitle);
  await page.getByRole('button', { name: 'Save changes' }).click();

  await expect(page.getByRole('heading', { name: 'Edit event' })).toHaveCount(0);
  await expect(page.locator('li').filter({ hasText: editedTitle })).toBeVisible();
});

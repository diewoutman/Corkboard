import { test, expect, unique } from './fixtures';

for (const [heading, kind] of [['Calendars', 'calendar'], ['Schedules', 'schedule']] as const) {
  test(`a ${kind} can be deleted after confirming`, async ({ authedPage: page }) => {
    const name = unique(kind);
    const section = page.locator('section').filter({ has: page.getByRole('heading', { name: heading }) });

    await page.goto('/calendar');
    await section.getByRole('button', { name: '+ Add' }).click();
    await page.getByLabel('Name').fill(name);
    await page.getByLabel('Name').press('Enter');

    const row = section.locator('li').filter({ hasText: name });
    await expect(row).toBeVisible();

    await row.getByRole('button', { name: 'Delete' }).click();
    await row.getByRole('button', { name: 'Yes, delete' }).click();

    await expect(section.locator('li').filter({ hasText: name })).toHaveCount(0);
  });
}

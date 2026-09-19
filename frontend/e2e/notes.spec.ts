import { test, expect, unique } from './fixtures';

test('a note can be edited via its edit button', async ({ authedPage: page }) => {
  const originalTitle = unique('Note');
  const editedTitle = `${originalTitle} (edited)`;

  await page.goto('/notes');
  await page.getByRole('button', { name: 'Add note' }).click();
  await page.getByLabel('Title').fill(originalTitle);
  await page.getByRole('button', { name: 'Add note' }).click();

  const card = page.locator('div.relative.rounded-2xl.p-4').filter({ hasText: originalTitle });
  await expect(card).toBeVisible();

  await card.getByRole('button', { name: 'Edit' }).click();

  await expect(page.getByRole('heading', { name: 'Edit note' })).toBeVisible();
  await expect(page.getByLabel('Title')).toHaveValue(originalTitle);

  await page.getByLabel('Title').fill(editedTitle);
  await page.getByRole('button', { name: 'Save changes' }).click();

  await expect(page.getByRole('heading', { name: 'Edit note' })).toHaveCount(0);
  await expect(page.locator('div.relative.rounded-2xl.p-4').filter({ hasText: editedTitle })).toBeVisible();
});

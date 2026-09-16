import { test, expect, unique } from './fixtures';

test('a list can be renamed via its edit button', async ({ authedPage: page }) => {
  const originalName = unique('List');
  const editedName = `${originalName} (edited)`;

  await page.goto('/tasks');
  await page.getByRole('button', { name: '+ New list' }).click();
  await page.getByLabel('List name').fill(originalName);
  await page.getByRole('button', { name: 'Create' }).click();

  const card = page.locator('a').filter({ hasText: originalName });
  await expect(card).toBeVisible();

  await card.getByRole('button', { name: 'Edit list' }).click();

  await expect(page.getByRole('heading', { name: 'Edit list' })).toBeVisible();
  await expect(page.getByLabel('List name')).toHaveValue(originalName);

  await page.getByLabel('List name').fill(editedName);
  await page.getByRole('button', { name: 'Save changes' }).click();

  await expect(page.getByRole('heading', { name: 'Edit list' })).toHaveCount(0);
  await expect(page.locator('a').filter({ hasText: editedName })).toBeVisible();
});

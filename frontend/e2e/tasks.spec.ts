import { test, expect, unique } from './fixtures';

test('a task can be edited via its edit button', async ({ authedPage: page }) => {
  const listName = unique('List');
  const originalTitle = unique('Task');
  const editedTitle = `${originalTitle} (edited)`;

  await page.goto('/tasks');
  await page.getByRole('button', { name: '+ New list' }).click();
  await page.getByLabel('List name').fill(listName);
  await page.getByRole('button', { name: 'Create' }).click();
  await page.locator('a').filter({ hasText: listName }).getByText(listName).click();

  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await page.getByLabel('Task', { exact: true }).fill(originalTitle);
  await page.getByRole('button', { name: 'Add task' }).click();

  const row = page.locator('li').filter({ hasText: originalTitle });
  await expect(row).toBeVisible();

  await row.getByRole('button', { name: 'Edit' }).click();

  await expect(page.getByRole('heading', { name: 'Edit task' })).toBeVisible();
  await expect(page.getByLabel('Task', { exact: true })).toHaveValue(originalTitle);

  await page.getByLabel('Task', { exact: true }).fill(editedTitle);
  await page.getByRole('button', { name: 'Save changes' }).click();

  await expect(page.getByRole('heading', { name: 'Edit task' })).toHaveCount(0);
  await expect(page.locator('li').filter({ hasText: editedTitle })).toBeVisible();
});

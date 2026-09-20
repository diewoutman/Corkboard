import { test, expect, unique } from './fixtures';

async function createList(page: import('@playwright/test').Page, name: string) {
  await page.getByRole('button', { name: '+ New list' }).click();
  await page.getByLabel('List name').fill(name);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.locator('li').filter({ hasText: name })).toBeVisible();
}

test('opening Tasks selects "All tasks" by default', async ({ authedPage: page }) => {
  await page.goto('/tasks');

  await expect(page).toHaveURL(/\/tasks\/all$/);
  await expect(page.getByRole('heading', { name: 'All tasks' })).toBeVisible();
});

test('a list can be deleted after confirming', async ({ authedPage: page }) => {
  const name = unique('Doomed');
  await page.goto('/tasks');
  await createList(page, name);

  const item = page.locator('li').filter({ hasText: name });
  await item.hover();
  await item.getByRole('button', { name: 'Edit list' }).click();
  await page.getByRole('button', { name: 'Delete list' }).click();
  await expect(page.getByText(/Delete this list and the 0 tasks/)).toBeVisible();
  await page.getByRole('button', { name: 'Yes, delete' }).click();

  await expect(page.locator('li').filter({ hasText: name })).toHaveCount(0);
});

test('a task can be dragged onto another list in the sidebar', async ({ authedPage: page }) => {
  const from = unique('From');
  const to = unique('To');
  const title = unique('Movable');
  await page.goto('/tasks');
  await createList(page, from);
  await createList(page, to);

  await page.locator('a').filter({ hasText: from }).click();
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await page.getByLabel('Task', { exact: true }).fill(title);
  await page.getByRole('button', { name: 'Add task' }).click();
  const row = page.locator('li[draggable="true"]').filter({ hasText: title });
  await expect(row).toBeVisible();

  await row.dragTo(page.locator('a').filter({ hasText: to }));

  await expect(row).toHaveCount(0); // gone from the source list…
  await page.locator('a').filter({ hasText: to }).click();
  await expect(page.locator('li[draggable="true"]').filter({ hasText: title })).toBeVisible(); // …and in the target
});

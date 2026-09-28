import { test, expect, unique } from './fixtures';

test('family groups can be created, assigned, edited, and deleted', async ({ authedPage: page }) => {
  const name = unique('Group');
  const editedName = `${name} edited`;

  await page.goto('/family');
  await expect(page.getByRole('heading', { name: 'Groups' })).toBeVisible();

  await page.getByRole('button', { name: 'Quick add' }).click();
  await page.getByLabel('Name').fill(unique('Group member'));
  await page.getByRole('button', { name: 'Add family member' }).click();

  await page.getByRole('button', { name: '+ Add group' }).click();
  await page.getByPlaceholder('Group name').fill(name);
  await page.getByLabel('Group color').fill('#336699');
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  const group = page.locator('div.rounded-2xl.bg-cork').filter({ hasText: name }).first();
  await expect(group).toBeVisible();
  await expect(group.locator('span.h-3.w-3')).toHaveCSS('background-color', 'rgb(51, 102, 153)');

  const memberButton = group.locator('div.mt-2 > button').filter({ hasText: 'Group member' }).first();
  await expect(memberButton).toBeVisible();
  const memberName = await memberButton.textContent();
  await memberButton.click();
  await expect(memberButton).toHaveClass(/bg-coral/);
  await expect(page.locator('app-family-member-card').filter({ hasText: memberName ?? '' }).getByText(name, { exact: true })).toBeVisible();

  await group.getByRole('button', { name: 'Edit' }).click();
  await page.getByPlaceholder('Group name').fill(editedName);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const editedGroup = page.locator('div.rounded-2xl.bg-cork').filter({ hasText: editedName }).first();
  await expect(editedGroup).toBeVisible();

  await editedGroup.getByRole('button', { name: 'Delete' }).click();
  await expect(page.locator('div.rounded-2xl.bg-cork').filter({ hasText: editedName })).toHaveCount(0);
});

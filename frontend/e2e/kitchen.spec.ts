import path from 'node:path';
import type { Page } from '@playwright/test';
import { test, expect, unique } from './fixtures';

const frontendRoot = process.cwd().endsWith(`${path.sep}frontend`) ? process.cwd() : path.join(process.cwd(), 'frontend');
const recipePhoto = path.join(frontendRoot, 'public/icons/icon-96x96.png');

async function createRecipe(page: Page, title = unique('Recipe')) {
  await page.goto('/recipes/root');
  await page.getByRole('button', { name: /Recipe$/ }).click();
  await page.getByLabel('Title', { exact: true }).fill(title);
  await page.getByLabel('Servings', { exact: true }).fill('4');
  await page.getByPlaceholder('Ingredient').first().fill('Tomato');
  await page.getByPlaceholder('Amount').first().fill('2');
  await page.getByRole('combobox').first().selectOption({ label: 'piece' });
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page).toHaveURL(/\/recipes\/root\/[0-9a-f-]+$/);
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  return title;
}

test('recipe can be created with ingredients and a photo, edited, and reloaded', async ({ authedPage: page }) => {
  const title = await createRecipe(page);

  await expect(page.getByText(/2\s*piece/)).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();

  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles(recipePhoto);
  await expect(page.locator(`img[alt="${title}"]`)).toBeVisible();
  await page.getByLabel('Title', { exact: true }).fill(`${title} (edited)`);
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();

  await expect(page.getByRole('heading', { name: `${title} (edited)` })).toBeVisible();
});

test('meal plan schedules a recipe and consolidates its ingredients in shopping', async ({ authedPage: page }) => {
  const title = await createRecipe(page);

  await page.goto('/meal-plan');
  await page.getByRole('button', { name: /Add a meal$/ }).first().click();
  await page.getByRole('button', { name: title, exact: true }).click();
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByRole('button', { name: title, exact: true })).toBeVisible();

  const meal = page.locator('li').filter({ hasText: title });
  await meal.getByRole('button', { name: /Add to shopping list$/ }).click();
  await expect(meal).toContainText('1 added, 0 merged');
  await meal.getByRole('button', { name: /Add to shopping list$/ }).click();
  await expect(meal).toContainText('0 added, 1 merged');

  await page.goto('/shopping-list');
  await page.waitForURL(/\/tasks\/[^/]+$/);
  const item = page.locator('li').filter({ hasText: 'Tomato' }).last();
  await expect(item).toBeVisible();
  await item.locator('input[type="checkbox"]').check();
  await page.reload();
  await page.getByRole('checkbox', { name: 'Show completed' }).check();
  await expect(item.locator('input[type="checkbox"]')).toBeChecked();
});

test('kitchen navigation can switch between English and Dutch', async ({ authedPage: page }) => {
  await page.goto('/recipes/root');
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('button', { name: 'nl', exact: true }).click();
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'Recepten', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Accountmenu' }).click();
  await page.getByRole('button', { name: 'en', exact: true }).click();
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'Recipes', exact: true })).toBeVisible();
});

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures';

test('searches the unified build library and arms placement immediately', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Build / add terrain' }).click();
  const drawer = page.getByRole('complementary', { name: 'Build' });
  await expect(drawer.getByText('Structures & terrain')).toBeVisible();
  await drawer.getByRole('textbox', { name: 'Search structures and terrain' }).fill('water');
  await expect(drawer.getByRole('button', { name: 'Water' })).toHaveCount(1);
  await drawer.getByRole('button', { name: 'Water' }).click();
  await expect(drawer).toHaveCount(0);
  await expect(page.getByLabel('Canvas controls').getByRole('button', { name: 'Build' })).toHaveAttribute('aria-pressed', 'true');
});

test('finds, selects, orders, locks, and hides terrain through Layers', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load starter layout' }).click();
  await page.getByRole('navigation', { name: 'Workspace sections' }).getByRole('button', { name: 'Layers' }).click();
  const drawer = page.getByRole('complementary', { name: 'Layers' });
  await drawer.getByRole('textbox', { name: 'Search layers' }).fill('relay');
  await drawer.getByRole('button', { name: /Relay station/ }).click();
  await expect(page.getByRole('complementary', { name: 'Relay station inspector' })).toBeVisible();
  await expect(drawer.getByText('1 selected')).toBeVisible();
  await drawer.getByRole('button', { name: 'Lock' }).click();
  await expect(drawer.getByRole('button', { name: 'Unlock' })).toBeVisible();
  await drawer.getByRole('button', { name: 'Hide' }).click();
  await expect(drawer.getByRole('button', { name: 'Show' })).toBeVisible();
  await drawer.getByRole('button', { name: 'Raise' }).click();
});

test('safely applies actual Setup settings and prevents clipped terrain', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Workspace sections' }).getByRole('button', { name: 'Setup' }).click();
  const drawer = page.getByRole('complementary', { name: 'Setup' });
  await drawer.getByRole('textbox', { name: 'Width (in)' }).fill('40');
  await drawer.getByRole('textbox', { name: 'Width (in)' }).press('Enter');
  await expect(page.getByText('40 × 36 in · fixed 1 in grid')).toBeVisible();
  await drawer.getByRole('button', { name: 'Portrait' }).click();
  await drawer.getByRole('button', { name: 'concrete' }).click();
  await drawer.getByRole('button', { name: 'Snap on' }).click();
  await expect(drawer.getByRole('button', { name: 'Snap off' })).toBeVisible();
  await page.getByRole('button', { name: 'Load starter layout' }).click();
  await drawer.getByRole('textbox', { name: 'Width (in)' }).fill('12');
  await drawer.getByRole('textbox', { name: 'Width (in)' }).press('Enter');
  await expect(page.getByText(/Cannot resize board: Broken annex/)).toBeVisible();
});

test('edits type-aware inspector appearance and notes controls', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load starter layout' }).click();
  await page.getByRole('button', { name: 'Select' }).click();
  await page.locator('[data-terrain-kind="building"]').first().click();
  const inspector = page.getByRole('complementary', { name: 'Relay station inspector' });
  await inspector.getByRole('tab', { name: 'Appearance' }).click();
  await inspector.getByRole('textbox', { name: 'Layer' }).fill('8');
  await inspector.getByRole('textbox', { name: 'Layer' }).press('Enter');
  await inspector.getByRole('tab', { name: 'Notes' }).click();
  await inspector.getByRole('textbox', { name: 'Planner notes' }).fill('Hold the central approach.');
  await inspector.getByRole('textbox', { name: 'Planner notes' }).press('Tab');
  await expect(inspector.getByText('26/2000')).toBeVisible();
});

test('has no serious or critical axe violations in functional panels', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load starter layout' }).click();
  for (const label of ['Build', 'Layers', 'Setup'] as const) {
    await page.getByRole('navigation', { name: 'Workspace sections' }).getByRole('button', { name: label }).click();
    const results = await new AxeBuilder({ page }).include('.drawer').analyze();
    expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
  }
  await page.getByRole('button', { name: 'Select' }).click();
  await page.locator('[data-terrain-kind="building"]').first().click();
  const inspectorResults = await new AxeBuilder({ page }).include('.inspector').analyze();
  expect(inspectorResults.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
});

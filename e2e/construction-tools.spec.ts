import { expect, test } from './fixtures';

test('constructs, selects, transforms, duplicates, and safely cancels board interactions', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Load starter layout' }).click();
  const board = page.getByRole('application', { name: '36 by 36 inch overhead board' });
  await expect(board).toBeVisible();
  await page.getByRole('button', { name: 'Select' }).click();
  await page.locator('[data-terrain-kind="building"]').first().click();
  await expect(page.getByRole('complementary', { name: /inspector$/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Resize Relay station' })).toBeVisible();
  await page.keyboard.press('r');
  await page.getByRole('button', { name: 'Duplicate' }).click();
  await expect(page.getByRole('heading', { name: 'Relay station copy' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('complementary', { name: /inspector$/ })).toHaveCount(0);

  await page.getByLabel('Canvas controls').getByRole('button', { name: 'Build' }).click();
  await page.getByRole('button', { name: /Field building/ }).first().click();
  await page.getByLabel('Canvas controls').getByRole('button', { name: 'Build' }).click();
  await page.getByRole('complementary', { name: 'Build' }).getByRole('button', { name: 'Place selected terrain at first open cell' }).click();
  await expect(page.getByText(/placed at the first open cell/)).toBeVisible();
  await page.getByLabel('Canvas controls').getByRole('button', { name: 'Build' }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.construction-preview')).toHaveCount(0);
});

test('edits validated doors and windows and reports unavailable joins', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load starter layout' }).click();
  await page.getByRole('button', { name: 'Select' }).click();
  await page.locator('[data-terrain-kind="building"]').first().click();
  await page.getByRole('tab', { name: 'Access' }).click();
  await page.getByRole('button', { name: 'Door' }).click();
  await expect(page.getByText(/click an exterior wall/)).toBeVisible();
  await page.locator('[data-terrain-kind="building"]').first().click({ position: { x: 12, y: 2 } });
  await expect(page.getByText('Doors')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove' })).toBeVisible();
  await page.getByRole('button', { name: 'Window' }).click();
  await expect(page.getByRole('button', { name: 'Access' }).first()).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Select' }).click();
  await page.locator('[data-terrain-kind="building"]').first().click();
  await page.locator('[data-terrain-kind="ruin"]').first().click({ modifiers: ['Shift'] });
  await page.getByRole('tab', { name: 'Properties' }).click();
  await expect(page.getByText(/Join unavailable: type/)).toBeVisible();
});

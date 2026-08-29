import { expect, test } from './fixtures';

const squareBoard = async (page: import('@playwright/test').Page) => {
  const board = page.getByRole('application', { name: '36 by 36 inch overhead board' });
  const box = await board.boundingBox();
  if (!box) throw new Error('The overhead board is unavailable.');
  const size = Math.min(box.width, box.height);
  return { board, left: box.x + (box.width - size) / 2, top: box.y + (box.height - size) / 2, cell: size / 36 };
};

test('keeps pointer placement aligned with the centred one-inch grid', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/');
  await page.getByLabel('Canvas controls').getByRole('button', { name: 'Build' }).click();
  await page.getByRole('complementary', { name: 'Build' }).getByRole('button', { name: 'Building' }).click();
  const { board, left, top, cell } = await squareBoard(page);
  await page.mouse.move(left + cell * 2.2, top + cell * 25.2);
  await page.mouse.down();
  await page.mouse.move(left + cell * 6.2, top + cell * 29.2);
  await page.mouse.up();
  const building = board.locator('[data-terrain-kind="building"]');
  await expect(building).toHaveCount(1);
  await expect(building).toHaveAttribute('transform', /translate\(2 25\)/);
});

test('clears a selected structure by clicking empty board and keeps Select as the default tool', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load starter layout' }).click();
  const { board, left, top, cell } = await squareBoard(page);
  await expect(page.getByLabel('Canvas controls').getByRole('button', { name: 'Select' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Canvas controls').getByRole('button', { name: 'Neutral' })).toHaveCount(0);
  await board.locator('[data-terrain-kind="building"]').first().click();
  await expect(page.getByRole('complementary', { name: /inspector$/ })).toBeVisible();
  await page.mouse.click(left + cell * 34.5, top + cell * 34.5);
  await expect(page.getByRole('complementary', { name: /inspector$/ })).toHaveCount(0);
});

test('shows one searchable structure and terrain library without duplicate catalog sections', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Canvas controls').getByRole('button', { name: 'Build' }).click();
  const build = page.getByRole('complementary', { name: 'Build' });
  await expect(build.getByRole('heading', { name: 'Structures & terrain' })).toBeVisible();
  await expect(build.getByRole('heading', { name: 'Favorites' })).toHaveCount(0);
  await expect(build.getByRole('heading', { name: 'Recent' })).toHaveCount(0);
  await expect(build.getByRole('button', { name: 'Road' })).toBeVisible();
});

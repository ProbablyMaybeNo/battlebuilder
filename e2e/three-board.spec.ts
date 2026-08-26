import { expect, test } from './fixtures';

test('lazy loads the 3D board, accepts presets, and handles context loss', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/');
  await page.getByRole('button', { name: '3D planning' }).click();
  const board = page.getByRole('application', { name: 'Interactive 3D planning board' });
  await expect(board).toBeVisible();
  await expect(board.locator('canvas')).toBeVisible();
  await page.getByRole('button', { name: '3 Perspective' }).click();
  await page.keyboard.press('4');
  await expect(page.getByRole('button', { name: '4 Front' })).toBeVisible();
  await board.locator('canvas').dispatchEvent('webglcontextlost');
  await expect(board).toHaveAttribute('data-context-lost', 'true');
  await page.keyboard.press('1');
  await expect(page.getByRole('application', { name: '36 by 36 inch overhead board' })).toBeVisible();
});

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures';

test('completes core selection, placement, access, and focus paths with a keyboard', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Controls' }).click();
  await expect(page.getByRole('dialog', { name: 'Board control reference' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Controls' })).toBeFocused();
  await page.getByRole('button', { name: 'Load starter layout' }).click();
  const overhead = page.getByRole('application', { name: '36 by 36 inch overhead board' });
  const firstPiece = overhead.getByRole('button', { name: /Relay station/ });
  await firstPiece.focus();
  await page.keyboard.press('Enter');
  const inspector = page.getByRole('complementary', { name: 'Relay station inspector' });
  await expect(inspector).toBeVisible();
  await inspector.getByRole('tab', { name: 'Access' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(inspector.getByRole('tab', { name: 'Notes' })).toBeFocused();
  await page.getByLabel('Canvas controls').getByRole('button', { name: 'Build' }).click();
  const build = page.getByRole('complementary', { name: 'Build' });
  await build.getByRole('button', { name: 'Place selected terrain at first open cell' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText(/placed at the first open cell/)).toBeVisible();
});

test('exposes named 3D terrain equivalents and has no serious axe issues', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load starter layout' }).click();
  await page.getByRole('button', { name: '3D planning' }).click();
  const board = page.getByRole('application', { name: 'Interactive 3D planning board' });
  await expect(board).toBeVisible();
  const pieceList = board.getByRole('list', { name: '3D terrain pieces' });
  await pieceList.getByRole('button', { name: /Relay station/ }).focus();
  await expect(page.getByRole('complementary', { name: 'Relay station inspector' })).toBeVisible();
  await board.locator('.three-board__canvas').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('+');
  const results = await new AxeBuilder({ page }).include('.canvas-void').analyze();
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
});

test('cancels captured pointer work safely with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Build / add terrain' }).click();
  const overhead = page.getByRole('application', { name: '36 by 36 inch overhead board' });
  await overhead.dispatchEvent('pointerdown', { pointerId: 44, pointerType: 'touch', button: 0, clientX: 320, clientY: 360 });
  await overhead.dispatchEvent('pointermove', { pointerId: 44, pointerType: 'touch', clientX: 420, clientY: 440 });
  await expect(overhead.locator('.construction-preview')).toHaveCount(1);
  await overhead.dispatchEvent('pointercancel', { pointerId: 44, pointerType: 'touch' });
  await expect(overhead.locator('.construction-preview')).toHaveCount(0);
});

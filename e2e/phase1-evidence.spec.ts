import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const viewports = [{ width: 1440, height: 960 }, { width: 1920, height: 1080 }] as const;
const seriousAxe = async (page: Page) => {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
};

for (const viewport of viewports) {
  test(`captures complete Phase 1 evidence at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.screenshot({ path: `ux-audit/screenshots/empty-board--overhead--${viewport.width}x${viewport.height}.png`, fullPage: true });

    await page.getByRole('button', { name: 'Load starter layout' }).click();
    await page.screenshot({ path: `ux-audit/screenshots/starter-board--overhead--${viewport.width}x${viewport.height}.png`, fullPage: true });
    await page.getByRole('button', { name: '3D planning' }).click();
    await expect(page.getByRole('application', { name: 'Interactive 3D planning board' })).toBeVisible();
    await page.screenshot({ path: `ux-audit/screenshots/starter-board--isometric-3d--${viewport.width}x${viewport.height}.png`, fullPage: true });
    await page.getByRole('button', { name: '3 Perspective' }).click();
    await page.screenshot({ path: `ux-audit/screenshots/starter-board--perspective-3d--${viewport.width}x${viewport.height}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Overhead' }).click();

    const rail = page.getByRole('navigation', { name: 'Workspace sections' });
    for (const drawer of ['Build', 'Setup', 'Layers'] as const) {
      await rail.getByRole('button', { name: drawer }).click();
      await expect(page.getByRole('complementary', { name: drawer })).toBeVisible();
      await page.screenshot({ path: `ux-audit/screenshots/${drawer.toLocaleLowerCase()}-drawer--overhead--${viewport.width}x${viewport.height}.png`, fullPage: true });
    }
    await page.getByRole('complementary', { name: 'Layers' }).getByRole('button', { name: /Relay station/ }).click();
    await expect(page.getByRole('complementary', { name: 'Relay station inspector' })).toBeVisible();
    await page.screenshot({ path: `ux-audit/screenshots/selected-inspector--overhead--${viewport.width}x${viewport.height}.png`, fullPage: true });

    await page.getByLabel('Canvas controls').getByRole('button', { name: 'Build' }).click();
    await page.getByRole('complementary', { name: 'Build' }).getByRole('button', { name: /Field building/ }).first().click();
    const board = page.getByRole('application', { name: '36 by 36 inch overhead board' });
    const bounds = await board.boundingBox();
    if (!bounds) throw new Error('Overhead board is unavailable for invalid-placement evidence.');
    const point = (x: number, y: number) => ({ clientX: bounds.x + bounds.width * (x / 36), clientY: bounds.y + bounds.height * (y / 36) });
    await board.dispatchEvent('pointerdown', { pointerId: 81, pointerType: 'mouse', button: 0, ...point(3, 4) });
    await board.dispatchEvent('pointermove', { pointerId: 81, pointerType: 'mouse', ...point(9, 8) });
    await expect(board.locator('.construction-preview--invalid')).toBeVisible();
    await page.screenshot({ path: `ux-audit/screenshots/invalid-placement--overhead--${viewport.width}x${viewport.height}.png`, fullPage: true });
    await board.dispatchEvent('pointercancel', { pointerId: 81, pointerType: 'mouse' });

    await page.getByLabel('Import board JSON').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{invalid') });
    await expect(page.getByRole('dialog', { name: 'Import failed' })).toBeVisible();
    await page.screenshot({ path: `ux-audit/screenshots/import-error--overhead--${viewport.width}x${viewport.height}.png`, fullPage: true });
  });
}

test('has no serious or critical axe violations in every required panel and recovery state', async ({ page }) => {
  await page.goto('/');
  await seriousAxe(page);
  const rail = page.getByRole('navigation', { name: 'Workspace sections' });
  for (const drawer of ['Board', 'Build', 'Layers', 'Setup'] as const) {
    await rail.getByRole('button', { name: drawer }).click();
    await seriousAxe(page);
  }
  await page.getByRole('button', { name: 'Load starter layout' }).click();
  await page.getByRole('button', { name: 'Select' }).click();
  await page.locator('[data-terrain-kind="building"]').first().click();
  const inspector = page.getByRole('complementary', { name: 'Relay station inspector' });
  for (const tab of ['Properties', 'Appearance', 'Structure', 'Access', 'Notes']) {
    await inspector.getByRole('tab', { name: tab }).click();
    await seriousAxe(page);
  }
  await page.getByLabel('Import board JSON').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{invalid') });
  await expect(page.getByRole('dialog', { name: 'Import failed' })).toBeVisible();
  await seriousAxe(page);
});

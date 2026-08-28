import AxeBuilder from '@axe-core/playwright';
import type { Page, TestInfo } from '@playwright/test';
import { expect, test } from './fixtures';

// Canonical evidence is refreshed deliberately with UPDATE_VISUAL_EVIDENCE=1.
// Ordinary test runs use Playwright's per-test output directory so antivirus,
// preview, or image tooling cannot lock a review artifact mid-suite.
test.describe.configure({ mode: 'serial' });

const viewports = [{ width: 1440, height: 960 }, { width: 1920, height: 1080 }] as const;
const seriousAxe = async (page: Page) => {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
};
const screenshot = (page: Page, testInfo: TestInfo, name: string) => page.screenshot({
  path: process.env.UPDATE_VISUAL_EVIDENCE === '1' ? `ux-audit/screenshots/${name}` : testInfo.outputPath(name),
  fullPage: true,
});

for (const viewport of viewports) {
  test(`captures complete Phase 1 evidence at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await screenshot(page, testInfo, `empty-board--overhead--${viewport.width}x${viewport.height}.png`);

    await page.getByRole('button', { name: 'Load starter layout' }).click();
    await screenshot(page, testInfo, `starter-board--overhead--${viewport.width}x${viewport.height}.png`);
    await page.getByRole('button', { name: '3D planning' }).click();
    await expect(page.getByRole('application', { name: 'Interactive 3D planning board' })).toBeVisible();
    await screenshot(page, testInfo, `starter-board--isometric-3d--${viewport.width}x${viewport.height}.png`);
    await page.getByRole('button', { name: '3 Perspective' }).click();
    await screenshot(page, testInfo, `starter-board--perspective-3d--${viewport.width}x${viewport.height}.png`);
    await page.getByRole('button', { name: 'Overhead' }).click();

    const rail = page.getByRole('navigation', { name: 'Workspace sections' });
    for (const drawer of ['Build', 'Setup', 'Layers'] as const) {
      await rail.getByRole('button', { name: drawer }).click();
      await expect(page.getByRole('complementary', { name: drawer })).toBeVisible();
      await screenshot(page, testInfo, `${drawer.toLocaleLowerCase()}-drawer--overhead--${viewport.width}x${viewport.height}.png`);
    }
    await page.getByRole('complementary', { name: 'Layers' }).getByRole('button', { name: /Relay station/ }).click();
    await expect(page.getByRole('complementary', { name: 'Relay station inspector' })).toBeVisible();
    await screenshot(page, testInfo, `selected-inspector--overhead--${viewport.width}x${viewport.height}.png`);

    await page.getByLabel('Canvas controls').getByRole('button', { name: 'Build' }).click();
    await page.getByRole('complementary', { name: 'Build' }).getByRole('button', { name: /Field building/ }).first().click();
    const board = page.getByRole('application', { name: '36 by 36 inch overhead board' });
    const bounds = await board.boundingBox();
    if (!bounds) throw new Error('Overhead board is unavailable for invalid-placement evidence.');
    const point = (x: number, y: number) => ({ clientX: bounds.x + bounds.width * (x / 36), clientY: bounds.y + bounds.height * (y / 36) });
    await board.dispatchEvent('pointerdown', { pointerId: 81, pointerType: 'mouse', button: 0, ...point(3, 4) });
    await board.dispatchEvent('pointermove', { pointerId: 81, pointerType: 'mouse', ...point(9, 8) });
    await expect(board.locator('.construction-preview--invalid')).toBeVisible();
    await screenshot(page, testInfo, `invalid-placement--overhead--${viewport.width}x${viewport.height}.png`);
    await board.dispatchEvent('pointercancel', { pointerId: 81, pointerType: 'mouse' });

    await page.getByLabel('Import board JSON').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{invalid') });
    await expect(page.getByRole('dialog', { name: 'Import failed' })).toBeVisible();
    await screenshot(page, testInfo, `import-error--overhead--${viewport.width}x${viewport.height}.png`);
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

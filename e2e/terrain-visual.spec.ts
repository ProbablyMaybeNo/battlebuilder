import { expect, test } from './fixtures';
import { captureEvidence } from './visual-evidence';

for (const viewport of [{ width: 1440, height: 960 }, { width: 1920, height: 1080 }]) {
  test(`renders tactical terrain at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.getByRole('button', { name: 'Load starter layout' }).click();
    await expect(page.locator('.terrain-piece')).toHaveCount(12);
    await expect(page.locator('[data-terrain-kind="building"]')).toBeVisible();
    await expect(page.locator('[data-terrain-kind="water"]')).toBeVisible();
    await captureEvidence(page, testInfo, `ux-audit/b05-populated-overhead-${viewport.width}x${viewport.height}.png`);
    await page.getByRole('button', { name: '3D planning' }).click();
    await expect(page.getByRole('application', { name: 'Interactive 3D planning board' })).toBeVisible();
    await captureEvidence(page, testInfo, `ux-audit/b05-populated-3d-${viewport.width}x${viewport.height}.png`);
  });
}

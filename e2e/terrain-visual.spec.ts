import { expect, test } from './fixtures';

for (const viewport of [{ width: 1440, height: 960 }, { width: 1920, height: 1080 }]) {
  test(`renders tactical terrain at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.getByRole('button', { name: 'Load starter layout' }).click();
    await expect(page.locator('.terrain-piece')).toHaveCount(12);
    await expect(page.locator('[data-terrain-kind="building"]')).toBeVisible();
    await expect(page.locator('[data-terrain-kind="water"]')).toBeVisible();
    await page.screenshot({ path: `ux-audit/b05-populated-overhead-${viewport.width}x${viewport.height}.png`, fullPage: true });
    await page.getByRole('button', { name: '3D planning' }).click();
    await expect(page.getByRole('application', { name: 'Interactive 3D planning board' })).toBeVisible();
    await page.screenshot({ path: `ux-audit/b05-populated-3d-${viewport.width}x${viewport.height}.png`, fullPage: true });
  });
}

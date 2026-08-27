import { expect, test } from './fixtures';

for (const viewport of [{ width: 1440, height: 960 }, { width: 1920, height: 1080 }]) {
  test(`captures B07 drawers at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.getByRole('button', { name: 'Load starter layout' }).click();
    await page.getByRole('navigation', { name: 'Workspace sections' }).getByRole('button', { name: 'Build' }).click();
    await expect(page.getByRole('complementary', { name: 'Build' })).toBeVisible();
    await page.screenshot({ path: `ux-audit/b07-build-${viewport.width}x${viewport.height}.png`, fullPage: true });
    await page.getByRole('navigation', { name: 'Workspace sections' }).getByRole('button', { name: 'Layers' }).click();
    await expect(page.getByRole('complementary', { name: 'Layers' })).toBeVisible();
    await page.screenshot({ path: `ux-audit/b07-layers-${viewport.width}x${viewport.height}.png`, fullPage: true });
    await page.getByRole('navigation', { name: 'Workspace sections' }).getByRole('button', { name: 'Setup' }).click();
    await expect(page.getByRole('complementary', { name: 'Setup' })).toBeVisible();
    await page.screenshot({ path: `ux-audit/b07-setup-${viewport.width}x${viewport.height}.png`, fullPage: true });
  });
}

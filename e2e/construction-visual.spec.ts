import { expect, test } from './fixtures';

for (const viewport of [{ width: 1440, height: 960 }, { width: 1920, height: 1080 }]) {
  test(`captures construction selection state at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.getByRole('button', { name: 'Load starter layout' }).click();
    await page.getByRole('button', { name: 'Select' }).click();
    await page.locator('[data-terrain-kind="building"]').first().click();
    await expect(page.getByRole('button', { name: 'Resize Relay station' })).toBeVisible();
    await page.screenshot({ path: `ux-audit/b06-construction-${viewport.width}x${viewport.height}.png`, fullPage: true });
  });
}

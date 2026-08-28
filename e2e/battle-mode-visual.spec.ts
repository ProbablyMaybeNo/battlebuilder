import { expect, test } from './fixtures';

const captureBoard = (page: import('@playwright/test').Page, testInfo: import('@playwright/test').TestInfo, canonicalPath: string) => page.locator('.canvas-void').screenshot({ path: process.env.UPDATE_VISUAL_EVIDENCE === '1' ? canonicalPath : testInfo.outputPath(canonicalPath.split('/').at(-1) ?? 'battle.png') });

for (const viewport of [{ width: 1440, height: 960 }, { width: 1920, height: 1080 }]) {
  test(`captures battle deployment at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.getByRole('button', { name: 'Load starter layout' }).click();
    await page.getByRole('button', { name: 'Enter Battle' }).click();
    await page.getByRole('button', { name: /Scout team/ }).click();
    await page.getByText('Scout team 1', { exact: true }).click();
    await page.getByLabel('Deploy', { exact: true }).click();
    await page.getByLabel('Deployment X inch').fill('1');
    await page.getByLabel('Deployment Y inch').fill('8');
    await page.getByRole('button', { name: 'Deploy selected unit' }).click();
    await expect(page.getByRole('button', { name: /Scout team 1, deployed/ })).toBeVisible();
    await captureBoard(page, testInfo, `ux-audit/screenshots/b14-battle-overhead-${viewport.width}x${viewport.height}.png`);
  });
}

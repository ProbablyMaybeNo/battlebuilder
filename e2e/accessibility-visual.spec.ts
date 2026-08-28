import { test } from './fixtures';
import { captureEvidence } from './visual-evidence';

for (const viewport of [{ width: 1440, height: 960 }, { width: 1920, height: 1080 }]) {
  test(`captures accessible focused board at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.getByRole('button', { name: 'Load starter layout' }).click();
    const piece = page.getByRole('application', { name: '36 by 36 inch overhead board' }).getByRole('button', { name: /Relay station/ });
    await piece.focus();
    await captureEvidence(page, testInfo, `ux-audit/b09-accessibility-${viewport.width}x${viewport.height}.png`);
  });
}

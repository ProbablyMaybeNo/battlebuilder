import { expect, test } from './fixtures';
import { captureEvidence } from './visual-evidence';

for (const viewport of [{ width: 1440, height: 960 }, { width: 1920, height: 1080 }]) {
  test(`captures lifecycle import recovery at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.getByRole('button', { name: 'Load starter layout' }).click();
    await page.getByLabel('Import board JSON').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{invalid') });
    await expect(page.getByRole('dialog', { name: 'Import failed' })).toBeVisible();
    await captureEvidence(page, testInfo, `ux-audit/b08-import-recovery-${viewport.width}x${viewport.height}.png`);
  });
}

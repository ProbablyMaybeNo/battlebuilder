import AxeBuilder from '@axe-core/playwright';
import type { Page, TestInfo } from '@playwright/test';
import { expect, test } from './fixtures';
import { captureEvidence } from './visual-evidence';

const viewports = [{ width: 1440, height: 960 }, { width: 1920, height: 1080 }] as const;
const axe = async (page: Page) => {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual([]);
};

async function deployTwoSides(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter Battle' }).click();
  await page.getByRole('button', { name: /Scout team/ }).click();
  await page.getByRole('button', { name: /Line team/ }).click();
  await page.getByText('Scout team 1', { exact: true }).click();
  await page.getByLabel('Deploy', { exact: true }).click();
  await page.getByLabel('Deployment X inch').fill('1');
  await page.getByLabel('Deployment Y inch').fill('2');
  await page.getByRole('button', { name: 'Deploy selected unit' }).click();
  await page.getByLabel('Roster', { exact: true }).click();
  await page.getByText('Line team 1', { exact: true }).click();
  await page.getByLabel('Deploy', { exact: true }).click();
  await page.getByLabel('Deployment X inch').fill('34');
  await page.getByLabel('Deployment Y inch').fill('2');
  await page.getByRole('button', { name: 'Deploy selected unit' }).click();
  await page.getByLabel('Roster', { exact: true }).click();
  await page.getByText('Scout team 1', { exact: true }).click();
}

async function selectUnit(page: Page, name: string) {
  await page.getByLabel('Roster', { exact: true }).click();
  await page.getByText(name, { exact: true }).click();
  await page.getByLabel('Command', { exact: true }).click();
}

async function moveTo(page: Page, x: number) {
  await page.getByRole('button', { name: 'Move' }).click();
  await page.getByLabel('Movement destination X').fill(String(x));
  await page.getByLabel('Movement destination Y').fill('2');
  await expect(page.getByRole('button', { name: 'Confirm move' })).toBeEnabled();
  await page.getByRole('button', { name: 'Confirm move' }).click();
}

for (const viewport of viewports) {
  test(`captures Battle evidence at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo: TestInfo) => {
    await page.setViewportSize(viewport);
    await deployTwoSides(page);
    await captureEvidence(page, testInfo, `ux-audit/screenshots/b17-deployment--${viewport.width}x${viewport.height}.png`);
    await page.getByLabel('Command', { exact: true }).click();
    await page.getByRole('button', { name: 'Advance phase' }).press('Enter');
    await expect(page.getByText(/Round 1 · command/)).toBeVisible();
    await captureEvidence(page, testInfo, `ux-audit/screenshots/b17-active-turn--${viewport.width}x${viewport.height}.png`);
    await page.getByRole('button', { name: 'Attack' }).press('Enter');
    await page.getByRole('complementary', { name: 'Battle command' }).getByRole('button', { name: /Line team 1/ }).press('Enter');
    await expect(page.getByText('Attack preview')).toBeVisible();
    await captureEvidence(page, testInfo, `ux-audit/screenshots/b17-target-los-cover--${viewport.width}x${viewport.height}.png`);
    await expect(page.getByRole('button', { name: 'Confirm attack' })).toBeDisabled();
    await captureEvidence(page, testInfo, `ux-audit/screenshots/b17-invalid-action--${viewport.width}x${viewport.height}.png`);
    await page.getByRole('button', { name: 'Advance phase' }).click();
    await page.getByRole('button', { name: 'Advance phase' }).click();
    await selectUnit(page, 'Line team 1');
    for (const x of [28, 22, 16, 10]) await moveTo(page, x);
    await page.getByRole('button', { name: 'Advance phase' }).click();
    await page.getByRole('button', { name: 'Advance phase' }).click();
    await selectUnit(page, 'Scout team 1');
    await page.getByRole('button', { name: 'Attack' }).click();
    await page.getByRole('complementary', { name: 'Battle command' }).getByRole('button', { name: /Line team 1/ }).click();
    await expect(page.getByRole('button', { name: 'Confirm attack' })).toBeEnabled();
    await page.getByRole('button', { name: 'Confirm attack' }).click();
    await expect(page.getByText('Deterministic roll')).toBeVisible();
    await captureEvidence(page, testInfo, `ux-audit/screenshots/b17-roll-explanation--${viewport.width}x${viewport.height}.png`);
    await page.getByLabel('Battle log', { exact: true }).press('Enter');
    await expect(page.getByText('Audit log')).toBeVisible();
    await page.getByRole('button', { name: 'Enter replay' }).press('Enter');
    await expect(page.getByText(/Read-only replay/)).toBeVisible();
    await captureEvidence(page, testInfo, `ux-audit/screenshots/b17-log-replay--${viewport.width}x${viewport.height}.png`);
    await page.getByRole('button', { name: 'Return live' }).press('Enter');
    await page.getByRole('button', { name: 'Return to Build' }).press('Enter');
    await expect(page.getByRole('button', { name: 'Enter Battle' })).toBeVisible();
    await captureEvidence(page, testInfo, `ux-audit/screenshots/b17-return-build--${viewport.width}x${viewport.height}.png`);
  });
}

test('has no serious or critical axe violations through Battle controls', async ({ page }) => {
  await deployTwoSides(page);
  await axe(page);
  await page.getByLabel('Command', { exact: true }).click();
  await axe(page);
  await page.getByRole('button', { name: 'Advance phase' }).click();
  await page.getByRole('button', { name: 'Move' }).click();
  await axe(page);
  await page.getByLabel('Battle log', { exact: true }).click();
  await axe(page);
  await page.getByRole('button', { name: 'Enter replay' }).click();
  await axe(page);
});

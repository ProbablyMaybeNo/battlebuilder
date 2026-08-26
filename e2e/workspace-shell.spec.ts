import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures';

for (const viewport of [{ width: 1440, height: 960 }, { width: 1920, height: 1080 }]) {
  test(`renders the command workspace at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.getByRole('banner')).toContainText('Battle Builder');
    await expect(page.getByRole('main', { name: 'Battle Builder workspace' })).toContainText('Start building the battlefield.');
    await expect(page.getByRole('navigation', { name: 'Workspace sections' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Build / add terrain' })).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });
}

test('opens drawers and restores focus with Escape', async ({ page }) => {
  await page.goto('/');
  const boardLauncher = page.getByRole('navigation', { name: 'Workspace sections' }).getByRole('button', { name: 'Board', exact: true });
  await boardLauncher.click();
  await expect(page.getByRole('complementary', { name: 'Board' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('complementary', { name: 'Board' })).toHaveCount(0);
  await expect(boardLauncher).toBeFocused();
  await page.getByRole('button', { name: 'Build / add terrain' }).click();
  await expect(page.getByRole('complementary', { name: 'Build' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Search terrain catalog' })).toBeVisible();
});

test('keeps one keyboard-operable Board menu and modal help dialog', async ({ page }) => {
  await page.goto('/');
  const boardMenuTrigger = page.locator('.document-bar').getByRole('button', { name: 'Board', exact: true });
  await boardMenuTrigger.click();
  await expect(page.getByRole('menu', { name: 'Board menu' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(boardMenuTrigger).toBeFocused();
  await page.getByRole('navigation', { name: 'Workspace sections' }).getByRole('button', { name: 'Board', exact: true }).click();
  await page.getByRole('button', { name: 'Open controls reference' }).click();
  await expect(page.getByRole('dialog', { name: 'Workspace controls' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open controls reference' })).toBeFocused();
});

test('has no serious or critical axe violations in the shell and drawer', async ({ page }) => {
  await page.goto('/');
  const shellResults = await new AxeBuilder({ page }).include('.app-shell').analyze();
  expect(shellResults.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
  await page.getByRole('button', { name: 'Build / add terrain' }).click();
  const drawerResults = await new AxeBuilder({ page }).include('.drawer').analyze();
  expect(drawerResults.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
});

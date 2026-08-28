import { expect, test } from './fixtures';

for (const viewport of [{ width: 1440, height: 960 }, { width: 1920, height: 1080 }] as const) {
  test(`replays the 36/72 inch grid and camera contract at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (error) => pageErrors.push(error));
    await page.setViewportSize(viewport);
    await page.goto('/');
    const overhead = page.getByRole('application', { name: '36 by 36 inch overhead board' });
    await expect(overhead.locator('.grid-major')).toHaveCount(6);
    await expect(overhead.locator('.grid-minor')).toHaveCount(68);
    await overhead.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('+');
    await page.keyboard.press('f');

    await page.getByRole('navigation', { name: 'Workspace sections' }).getByRole('button', { name: 'Setup' }).click();
    const setup = page.getByRole('complementary', { name: 'Setup' });
    await setup.getByRole('textbox', { name: 'Width (in)' }).fill('72');
    await setup.getByRole('textbox', { name: 'Width (in)' }).press('Enter');
    await setup.getByRole('textbox', { name: 'Height (in)' }).fill('72');
    await setup.getByRole('textbox', { name: 'Height (in)' }).press('Enter');
    const maximumBoard = page.getByRole('application', { name: '72 by 72 inch overhead board' });
    await expect(maximumBoard.locator('.grid-major')).toHaveCount(12);
    await expect(maximumBoard.locator('.grid-minor')).toHaveCount(134);

    await page.getByRole('button', { name: '3D planning' }).click();
    const three = page.getByRole('application', { name: 'Interactive 3D planning board' });
    const canvas = three.locator('canvas');
    await expect(canvas).toBeVisible();
    const bounds = await canvas.boundingBox();
    if (!bounds) throw new Error('3D canvas is unavailable for the camera review.');
    await page.mouse.move(bounds.x + 200, bounds.y + 180);
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(bounds.x + 250, bounds.y + 220);
    await page.mouse.up({ button: 'right' });
    await page.mouse.down({ button: 'middle' });
    await page.mouse.move(bounds.x + 270, bounds.y + 230);
    await page.mouse.up({ button: 'middle' });
    await canvas.dispatchEvent('wheel', { deltaY: -100 });
    await canvas.focus();
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('+');
    await page.keyboard.press('f');
    await page.getByRole('button', { name: '3 Perspective' }).click();
    await page.getByRole('button', { name: '4 Front' }).click();
    expect(pageErrors).toEqual([]);
  });
}

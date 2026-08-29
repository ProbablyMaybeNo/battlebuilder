import { expect, test } from './fixtures';

function battleProfileBoard(size: 36 | 72, count: number) {
  const kinds = ['road', 'water', 'wall', 'woods', 'rocks', 'scatter', 'objective', 'token', 'marker'] as const;
  const pieces = Array.from({ length: count }, (_, index) => ({ id: `battle-profile-${size}-${index}`, kind: kinds[index % kinds.length], name: `Battle profile terrain ${index + 1}`, x: (index % Math.floor(size / 3)) * 3, y: Math.floor(index / Math.floor(size / 3)) * 3, width: 2, height: 2, rotation: 0, locked: false, hidden: false, layer: index % 4, notes: '' }));
  return { version: 1, id: `battle-profile-${size}`, name: `${size} battle profile`, createdAt: '2026-08-28T12:00:00.000Z', updatedAt: '2026-08-28T12:00:00.000Z', settings: { widthInches: size, heightInches: size, orientation: 'landscape', surface: 'midnight', snap: true }, pieces };
}

for (const [size, count] of [[36, 72], [72, 288]] as const) {
  test(`profiles populated ${size} by ${size} planner-plus-battle overhead and 3D`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.addInitScript((board) => localStorage.setItem('battle-builder/v1/draft', JSON.stringify(board)), battleProfileBoard(size, count));
    await page.goto('/');
    const overheadStart = performance.now();
    await page.getByRole('button', { name: 'Enter Battle' }).click();
    await expect(page.getByRole('complementary', { name: 'Battle roster' })).toBeVisible();
    await page.getByRole('button', { name: /Scout team/ }).click();
    const overheadMs = performance.now() - overheadStart;
    const threeStart = performance.now();
    await page.getByRole('button', { name: '3D planning' }).click();
    await expect(page.getByRole('application', { name: 'Interactive 3D planning board' }).locator('canvas')).toBeVisible();
    const threeMs = performance.now() - threeStart;
    console.log(`B17 battle profile ${size}x${size}: overhead=${overheadMs.toFixed(0)}ms 3d=${threeMs.toFixed(0)}ms pieces=${count}`);
    expect(overheadMs).toBeLessThan(5_000);
    expect(threeMs).toBeLessThan(8_000);
  });
}

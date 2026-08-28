import { expect, test } from './fixtures';

type ProfilePiece = {
  id: string;
  kind: 'road' | 'water' | 'wall' | 'woods' | 'rocks' | 'scatter' | 'objective' | 'token' | 'marker';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  locked: boolean;
  hidden: boolean;
  layer: number;
  notes: string;
};

function populatedBoard(size: 36 | 72, count: number) {
  const now = '2026-08-28T12:00:00.000Z';
  const kinds: ProfilePiece['kind'][] = ['road', 'water', 'wall', 'woods', 'rocks', 'scatter', 'objective', 'token', 'marker'];
  const pieces: ProfilePiece[] = [];
  for (let index = 0; index < count; index += 1) {
    const column = index % Math.floor(size / 3);
    const row = Math.floor(index / Math.floor(size / 3));
    pieces.push({
      id: `profile-${size}-${index}`,
      kind: kinds[index % kinds.length],
      name: `Profile terrain ${index + 1}`,
      x: column * 3,
      y: row * 3,
      width: 2,
      height: 2,
      rotation: 0,
      locked: false,
      hidden: false,
      layer: index % 4,
      notes: '',
    });
  }
  return {
    version: 1,
    id: `profile-board-${size}`,
    name: `${size} inch renderer profile`,
    createdAt: now,
    updatedAt: now,
    settings: { widthInches: size, heightInches: size, orientation: 'landscape', surface: 'midnight', snap: true },
    pieces,
  };
}

for (const [size, count] of [[36, 72], [72, 288]] as const) {
  test(`profiles a populated ${size} by ${size} board in overhead and 3D`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    const board = populatedBoard(size, count);
    await page.addInitScript((document) => localStorage.setItem('battle-builder/v1/draft', JSON.stringify(document)), board);

    const overheadStart = performance.now();
    await page.goto('/');
    await expect(page.getByRole('application', { name: `${size} by ${size} inch overhead board` })).toBeVisible();
    const overheadMs = performance.now() - overheadStart;
    const threeStart = performance.now();
    await page.getByRole('button', { name: '3D planning' }).click();
    await expect(page.getByRole('application', { name: 'Interactive 3D planning board' }).locator('canvas')).toBeVisible();
    await page.waitForFunction(() => document.querySelector('.three-board canvas')?.getBoundingClientRect().width !== 0);
    const threeMs = performance.now() - threeStart;

    // These are intentionally conservative release guardrails. The test also
    // prints observed values for the B11 profile log on this machine.
    console.log(`B11 renderer profile ${size}x${size}: overhead=${overheadMs.toFixed(0)}ms 3d=${threeMs.toFixed(0)}ms pieces=${count}`);
    expect(overheadMs).toBeLessThan(5_000);
    expect(threeMs).toBeLessThan(8_000);
  });
}

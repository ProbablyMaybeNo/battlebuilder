import { expect, test } from './fixtures';

const importedBoard = {
  version: 1,
  id: 'imported-board',
  name: 'Imported recovery board',
  createdAt: '2026-08-26T12:00:00.000Z',
  updatedAt: '2026-08-26T12:00:00.000Z',
  settings: { widthInches: 36, heightInches: 36, orientation: 'landscape', surface: 'midnight', snap: true },
  pieces: [],
};

test('saves, renames, duplicates, opens, and exports boards from the Board menu', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load starter layout' }).click();
  const trigger = page.locator('.document-bar').getByRole('button', { name: 'Board', exact: true });
  await trigger.click();
  await page.getByRole('menuitem', { name: 'Save' }).click();
  await expect(page.getByText('Board saved to this browser.')).toBeVisible();
  await trigger.click();
  await page.getByRole('menuitem', { name: 'Rename' }).click();
  const rename = page.getByRole('dialog', { name: 'Rename board' });
  await rename.getByRole('textbox', { name: 'Board name' }).fill('North corridor');
  await rename.getByRole('button', { name: 'Rename' }).click();
  await expect(page.getByRole('textbox', { name: 'Board name' })).toHaveValue('North corridor');
  await trigger.click();
  await page.getByRole('menuitem', { name: 'Save' }).click();
  await trigger.click();
  await page.getByRole('menuitem', { name: 'Duplicate board' }).click();
  await expect(page.getByRole('textbox', { name: 'Board name' })).toHaveValue('Copy of North corridor');
  await trigger.click();
  await page.getByRole('menuitem', { name: 'Open…' }).click();
  const open = page.getByRole('dialog', { name: 'Open saved board' });
  await expect(open.getByRole('button', { name: /North corridor/ })).toBeVisible();
  await open.getByRole('button', { name: /North corridor/ }).click();
  await expect(page.getByRole('textbox', { name: 'Board name' })).toHaveValue('North corridor');
  await trigger.click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: 'Export JSON' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename().toLocaleLowerCase()).toContain('north-corridor');
});

test('keeps the active board on malformed import and accepts a validated document', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load starter layout' }).click();
  const boardName = page.getByRole('textbox', { name: 'Board name' });
  await expect(boardName).toHaveValue('Ashfall crossing');
  await page.getByLabel('Import board JSON').setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{broken') });
  const error = page.getByRole('dialog', { name: 'Import failed' });
  await expect(error).toContainText('current board was not changed');
  await expect(boardName).toHaveValue('Ashfall crossing');
  await error.getByRole('button', { name: 'Keep current board' }).click();
  await page.getByLabel('Import board JSON').setInputFiles({ name: 'valid.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(importedBoard)) });
  await expect(boardName).toHaveValue('Imported recovery board');
  await page.keyboard.press('Control+z');
  await expect(boardName).toHaveValue('Ashfall crossing');
});

test('confirms destructive clear and multi-delete while keeping both undoable', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load starter layout' }).click();
  const trigger = page.locator('.document-bar').getByRole('button', { name: 'Board', exact: true });
  await trigger.click();
  await page.getByRole('menuitem', { name: 'Clear board' }).click();
  const clear = page.getByRole('dialog', { name: 'Clear board?' });
  await expect(clear).toContainText(/undo/i);
  await clear.getByRole('button', { name: 'Clear board' }).click();
  await expect(page.getByText('Start building the battlefield.')).toBeVisible();
  await page.keyboard.press('Control+z');
  await expect(page.locator('.terrain-piece')).toHaveCount(12);
  await page.getByRole('button', { name: 'Select' }).click();
  await page.locator('[data-terrain-kind="building"]').first().click();
  await page.locator('[data-terrain-kind="ruin"]').first().click({ modifiers: ['Shift'] });
  await page.keyboard.press('Delete');
  const deletion = page.getByRole('dialog', { name: 'Delete selected terrain?' });
  await deletion.getByRole('button', { name: 'Delete 2 objects' }).click();
  await expect(page.locator('.terrain-piece')).toHaveCount(10);
  await page.keyboard.press('Control+z');
  await expect(page.locator('.terrain-piece')).toHaveCount(12);
});

import { expect } from '@playwright/test';
import { test } from './fixtures';

test('plays and audits a deterministic generic command, then uses read-only replay', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter Battle' }).click();
  await page.getByRole('button', { name: /Scout team/ }).click();
  await page.getByText('Scout team 1', { exact: true }).click();
  await page.getByLabel('Deploy', { exact: true }).click();
  await page.getByLabel('Deployment X inch').fill('1');
  await page.getByLabel('Deployment Y inch').fill('2');
  await page.getByRole('button', { name: 'Deploy selected unit' }).click();
  await page.getByLabel('Command', { exact: true }).click();
  await page.getByRole('button', { name: 'Advance phase' }).click();
  await expect(page.getByText(/Round 1 · command/)).toBeVisible();
  await page.getByRole('button', { name: 'Move' }).click();
  await page.getByLabel('Movement destination X').fill('3');
  await page.getByLabel('Movement destination Y').fill('2');
  await expect(page.getByText('Movement check')).toBeVisible();
  await page.getByRole('button', { name: 'Confirm move' }).click();
  await expect(page.getByText(/Movement confirmed and recorded/)).toBeVisible();
  await page.getByLabel('Battle log', { exact: true }).click();
  await expect(page.getByText('Audit log')).toBeVisible();
  await page.getByRole('button', { name: 'Enter replay' }).click();
  await expect(page.getByText(/Read-only replay/)).toBeVisible();
  await page.getByRole('button', { name: 'Return live' }).click();
});

test('keeps invalid battle previews non-destructive and honors reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter Battle' }).click();
  await page.getByRole('button', { name: /Scout team/ }).click();
  await page.getByText('Scout team 1', { exact: true }).click();
  await page.getByLabel('Deploy', { exact: true }).click();
  await page.getByLabel('Deployment X inch').fill('1');
  await page.getByLabel('Deployment Y inch').fill('2');
  await page.getByRole('button', { name: 'Deploy selected unit' }).click();
  await page.getByLabel('Command', { exact: true }).click();
  await page.getByRole('button', { name: 'Advance phase' }).click();
  await page.getByRole('button', { name: 'Move' }).click();
  await page.getByLabel('Movement destination X').fill('35');
  await page.getByLabel('Movement destination Y').fill('35');
  await expect(page.getByText(/Destination exceeds|No legal route|outside the board|cannot move outside/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirm move' })).toBeDisabled();
  await expect(page.locator('body')).toHaveCSS('transition-duration', '1e-05s');
});

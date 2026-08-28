import { expect } from '@playwright/test';
import { test } from './fixtures';

test('creates a separate battle session, deploys a roster unit, and returns to an untouched build board', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter Battle' }).click();
  await expect(page.locator('h2').filter({ hasText: 'Battle roster' })).toBeVisible();
  await page.getByRole('button', { name: /Scout team/ }).click();
  await expect(page.getByText('Scout team 1', { exact: true })).toBeVisible();
  await page.getByText('Scout team 1', { exact: true }).click();
  await page.getByLabel('Deploy', { exact: true }).click();
  await page.getByLabel('Deployment X inch').fill('1');
  await page.getByLabel('Deployment Y inch').fill('8');
  await page.getByRole('button', { name: 'Deploy selected unit' }).click();
  await expect(page.getByText(/Unit deployed in Cyan command deployment zone/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Scout team 1, deployed at 1, 8/ })).toBeVisible();
  await page.getByRole('button', { name: '3D planning' }).click();
  await expect(page.getByRole('application', { name: 'Interactive 3D planning board' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Scout team 1, deployed at 1, 8/ })).toBeVisible();
  await page.getByRole('button', { name: 'Overhead' }).click();
  await page.getByRole('button', { name: 'Return to Build' }).click();
  await expect(page.getByRole('button', { name: 'Enter Battle' })).toBeVisible();
  await expect(page.getByRole('application', { name: /overhead board/ })).toBeVisible();
  await page.getByRole('button', { name: 'Enter Battle' }).click();
  await expect(page.getByText('Scout team 1', { exact: true })).toBeVisible();
});

test('keeps battle persistence separate from the normal board draft namespace', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter Battle' }).click();
  await page.getByRole('button', { name: /Line team/ }).click();
  await expect.poll(() => page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('battle-builder/e2e/v1/')))).toEqual(expect.arrayContaining(['battle-builder/e2e/v1/draft', 'battle-builder/e2e/v1/session/draft']));
  const stored = await page.evaluate(() => ({ board: localStorage.getItem('battle-builder/v1/draft'), battle: localStorage.getItem('battle-builder/v1/session/draft') }));
  expect(stored.board).toBeTruthy();
  expect(stored.battle).toBeTruthy();
  expect(stored.board).not.toBe(stored.battle);
});

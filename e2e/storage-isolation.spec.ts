import { expect, test } from './fixtures';

test('rewrites the user draft namespace in the isolated browser context', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('battle-builder/v1/draft', 'browser-test');
  });

  const storageKeys = await page.evaluate(() => Object.keys(localStorage));
  expect(storageKeys).toContain('battle-builder/e2e/v1/draft');
  expect(storageKeys).not.toContain('battle-builder/v1/draft');
});

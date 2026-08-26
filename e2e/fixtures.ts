import { expect, test as base } from '@playwright/test';

/**
 * Use this `test` instead of Playwright's base test for browser-state tests.
 * It preserves a real browser's behaviour while preventing test runs from
 * writing to the user's normal local-draft namespace.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      const userPrefix = 'battle-builder/v1/';
      const e2ePrefix = 'battle-builder/e2e/v1/';
      const rewrite = (key: string) => key.startsWith(userPrefix)
        ? `${e2ePrefix}${key.slice(userPrefix.length)}`
        : key;
      const originalSetItem = Storage.prototype.setItem;
      const originalGetItem = Storage.prototype.getItem;
      const originalRemoveItem = Storage.prototype.removeItem;
      Storage.prototype.setItem = function setItem(key, value) {
        originalSetItem.call(this, rewrite(String(key)), value);
      };
      Storage.prototype.getItem = function getItem(key) {
        return originalGetItem.call(this, rewrite(String(key)));
      };
      Storage.prototype.removeItem = function removeItem(key) {
        originalRemoveItem.call(this, rewrite(String(key)));
      };
    });
    await use(page);
  },
});

export { expect };

import type { Page, TestInfo } from '@playwright/test';

/**
 * Canonical review screenshots are refreshed only when explicitly requested.
 * Normal test runs keep their captures in the isolated Playwright output tree,
 * avoiding transient Windows file locks on checked-in review evidence.
 */
export function captureEvidence(page: Page, testInfo: TestInfo, canonicalPath: string) {
  const filename = canonicalPath.split('/').at(-1) ?? 'evidence.png';
  return page.screenshot({
    path: process.env.UPDATE_VISUAL_EVIDENCE === '1' ? canonicalPath : testInfo.outputPath(filename),
    fullPage: true,
  });
}

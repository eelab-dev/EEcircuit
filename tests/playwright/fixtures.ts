import { test as base, expect, type Page } from "@playwright/test";

/**
 * Keep the final browser state visible for manual inspection. This is an
 * intentional presentation pause, not a readiness wait; readiness assertions
 * remain explicit in each test.
 */
export const test = base.extend<{ finalViewPause: void }>({
  finalViewPause: [
    async ({ page }, use) => {
      await use();
      if (!page.isClosed()) await page.waitForTimeout(3000);
    },
    { auto: true },
  ],
});

export { expect };
export type { Page };

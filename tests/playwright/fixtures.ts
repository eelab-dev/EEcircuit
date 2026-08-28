import {
  devices,
  expect,
  test as base,
  type BrowserContext,
  type CDPSession,
  type Page,
} from "@playwright/test";

const APP_ORIGIN = "http://localhost:5173";
const desktopChrome = devices["Desktop Chrome"];

interface SharedChrome {
  browserContextId: string;
  browserSession: CDPSession;
  context: BrowserContext;
  currentPage: Page;
  initialPageAvailable: boolean;
  pageSession: CDPSession;
}

async function resetBrowserState(sharedChrome: SharedChrome): Promise<void> {
  const { context, currentPage, pageSession } = sharedChrome;

  // A test may open additional tabs. Remove them before clearing the shared
  // profile so no live document can immediately write its state back.
  for (const openPage of context.pages()) {
    if (openPage !== currentPage && !openPage.isClosed()) {
      await openPage.close({ runBeforeUnload: false });
    }
  }

  if (!currentPage.isClosed()) {
    await currentPage.goto("about:blank", { waitUntil: "commit" });
  }

  await context.clearCookies();
  await context.clearPermissions();
  await pageSession.send("Network.clearBrowserCache");
  await pageSession.send("Network.clearBrowserCookies");
  await pageSession.send("Storage.clearDataForOrigin", {
    origin: APP_ORIGIN,
    storageTypes: "all",
  });
}

export const test = base.extend<
  { finalViewPause: void },
  { sharedChrome: SharedChrome }
>({
  sharedChrome: [
    async ({ browser }, run) => {
      // One headed context keeps one Chrome window alive for the worker. Each
      // test gets a new tab below, avoiding per-test window launch/focus churn.
      const context = await browser.newContext({
        baseURL: APP_ORIGIN,
        deviceScaleFactor: desktopChrome.deviceScaleFactor,
        hasTouch: desktopChrome.hasTouch,
        isMobile: desktopChrome.isMobile,
        serviceWorkers: "block",
        userAgent: desktopChrome.userAgent,
        viewport: desktopChrome.viewport,
      });
      const currentPage = await context.newPage();
      const pageSession = await context.newCDPSession(currentPage);
      const { targetInfo } = await pageSession.send("Target.getTargetInfo");

      if (!targetInfo.browserContextId) {
        await pageSession.detach();
        await context.close();
        throw new Error("Chrome did not expose the shared browser context ID.");
      }

      const browserSession = await browser.newBrowserCDPSession();
      const sharedChrome: SharedChrome = {
        browserContextId: targetInfo.browserContextId,
        browserSession,
        context,
        currentPage,
        initialPageAvailable: true,
        pageSession,
      };

      try {
        await run(sharedChrome);
      } finally {
        await sharedChrome.pageSession.detach().catch(() => undefined);
        await browserSession.detach().catch(() => undefined);
        await context.close().catch(() => undefined);
      }
    },
    { scope: "worker" },
  ],

  page: async ({ sharedChrome }, run) => {
    await resetBrowserState(sharedChrome);

    let page = sharedChrome.currentPage;
    if (sharedChrome.initialPageAvailable) {
      sharedChrome.initialPageAvailable = false;
    } else {
      const pageCreated = sharedChrome.context.waitForEvent("page");
      await sharedChrome.browserSession.send("Target.createTarget", {
        background: true,
        browserContextId: sharedChrome.browserContextId,
        url: "about:blank",
      });
      const replacementPage = await pageCreated;

      await sharedChrome.pageSession.detach();
      await page.close({ runBeforeUnload: false });
      sharedChrome.currentPage = replacementPage;
      sharedChrome.pageSession = await sharedChrome.context.newCDPSession(
        replacementPage,
      );
      page = replacementPage;
    }

    try {
      await run(page);
    } finally {
      for (const openPage of sharedChrome.context.pages()) {
        if (openPage !== sharedChrome.currentPage && !openPage.isClosed()) {
          await openPage.close({ runBeforeUnload: false });
        }
      }
    }
  },

  /**
   * Keep the final browser state visible for manual inspection. This is an
   * intentional presentation pause, not a readiness wait; readiness assertions
   * remain explicit in each test.
   */
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

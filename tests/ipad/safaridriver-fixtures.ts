import { expect, test as base, type TestInfo } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import type { WebDriver } from "selenium-webdriver";
import { createPhysicalSafariDriver, SafariIPadDriver } from "./safari-driver";

type Fixtures = { ipad: SafariIPadDriver };
type WorkerFixtures = { ipadSession: SafariIPadDriver };

const attachDiagnostics = async (ipad: SafariIPadDriver, testInfo: TestInfo): Promise<void> => {
  const diagnostics: Record<string, unknown> = {};
  try { diagnostics.metadata = await ipad.metadata(); } catch (error) { diagnostics.metadataError = String(error); }
  try { diagnostics.events = await ipad.events(); } catch (error) { diagnostics.eventsError = String(error); }
  try {
    diagnostics.browserErrors = await ipad.allBrowserErrors();
    diagnostics.unexpectedBrowserErrors = await ipad.browserErrors();
  } catch (error) { diagnostics.browserErrorsReadError = String(error); }
  try { diagnostics.dom = await ipad.pageSource(); } catch (error) { diagnostics.domError = String(error); }
  const diagnosticsPath = testInfo.outputPath("physical-ipad-safaridriver-diagnostics.json");
  await writeFile(diagnosticsPath, JSON.stringify(diagnostics, null, 2));
  await testInfo.attach("physical-ipad-safaridriver-diagnostics.json", {
    path: diagnosticsPath,
    contentType: "application/json",
  });
  try {
    const screenshotPath = testInfo.outputPath("physical-ipad-safaridriver-failure.png");
    await writeFile(screenshotPath, Buffer.from(await ipad.screenshot(), "base64"));
    await testInfo.attach("physical-ipad-safaridriver-failure.png", {
      path: screenshotPath,
      contentType: "image/png",
    });
  } catch {
    // A failed SafariDriver session may no longer accept screenshots.
  }
};

export const test = base.extend<Fixtures, WorkerFixtures>({
  ipadSession: [async ({ playwright }, use) => {
    void playwright;
    let webdriver: WebDriver | undefined;
    try {
      webdriver = await createPhysicalSafariDriver();
      await use(new SafariIPadDriver(webdriver));
    } finally {
      if (webdriver) await webdriver.quit().catch(() => undefined);
    }
  }, { scope: "worker" }],

  ipad: async ({ ipadSession }, use, testInfo) => {
    void testInfo;
    await use(ipadSession);
  },
});

test.afterEach(async ({ ipad }, testInfo) => {
  let browserError: unknown;
  try { expect(await ipad.browserErrors(), "unexpected iPad Safari errors").toEqual([]); }
  catch (error) { browserError = error; }
  if (browserError !== undefined || testInfo.status !== testInfo.expectedStatus || testInfo.errors.length > 0) {
    await attachDiagnostics(ipad, testInfo);
  }
  if (browserError !== undefined) throw browserError;
});

export { expect };

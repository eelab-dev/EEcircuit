import { expect, test as base, type TestInfo } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { startAppiumServer, XCUITestIPadDriver, type AppiumServer } from "./xcuitest-driver";

type Fixtures = { ipad: XCUITestIPadDriver };
type WorkerFixtures = { appiumServer: AppiumServer; ipadSession: XCUITestIPadDriver };

const attachDiagnostics = async (ipad: XCUITestIPadDriver, server: AppiumServer, testInfo: TestInfo): Promise<void> => {
  const diagnostics: Record<string, unknown> = { appiumLog: server.logs() };
  try { diagnostics.device = await ipad.deviceInfo(); } catch (error) { diagnostics.deviceError = String(error); }
  try { diagnostics.metadata = await ipad.metadata(); } catch (error) { diagnostics.metadataError = String(error); }
  try { diagnostics.orientation = await ipad.orientation(); } catch (error) { diagnostics.orientationError = String(error); }
  try { diagnostics.calibration = ipad.calibrationInfo(); } catch (error) { diagnostics.calibrationError = String(error); }
  try { diagnostics.events = await ipad.events(); } catch (error) { diagnostics.eventsError = String(error); }
  try {
    diagnostics.browserErrors = await ipad.allBrowserErrors();
    diagnostics.unexpectedBrowserErrors = await ipad.browserErrors();
  } catch (error) { diagnostics.browserErrorsReadError = String(error); }
  try { diagnostics.dom = await ipad.pageSource(); } catch (error) { diagnostics.domError = String(error); }
  const diagnosticsPath = testInfo.outputPath("physical-ipad-xcuitest-diagnostics.json");
  await writeFile(diagnosticsPath, JSON.stringify(diagnostics, null, 2));
  await testInfo.attach("physical-ipad-xcuitest-diagnostics.json", {
    path: diagnosticsPath, contentType: "application/json",
  });
  try {
    const screenshotPath = testInfo.outputPath("physical-ipad-xcuitest-failure.png");
    await writeFile(screenshotPath, Buffer.from(await ipad.screenshot(), "base64"));
    await testInfo.attach("physical-ipad-xcuitest-failure.png", {
      path: screenshotPath, contentType: "image/png",
    });
  } catch {
    // A failed WebDriverAgent session may no longer accept screenshots.
  }
};

export const test = base.extend<Fixtures, WorkerFixtures>({
  appiumServer: [async ({ playwright }, use) => {
    void playwright;
    const server = await startAppiumServer();
    try { await use(server); } finally { await server.stop(); }
  }, { scope: "worker" }],

  ipadSession: [async ({ appiumServer }, use) => {
    let ipad: XCUITestIPadDriver | undefined;
    try {
      ipad = await XCUITestIPadDriver.create(appiumServer.url);
      await use(ipad);
    } catch (error) {
      throw new Error(
        "Unable to create the physical-iPad XCUITest session. Confirm the iPad is connected and unlocked, Developer Mode/UI Automation and Safari Remote Automation are enabled, and WebDriverAgent signing is valid. " +
        `Appium log:\n${appiumServer.logs()}`,
        { cause: error },
      );
    } finally {
      if (ipad) await ipad.quit().catch(() => undefined);
    }
  }, { scope: "worker" }],

  ipad: async ({ ipadSession, appiumServer }, use, testInfo) => {
    void appiumServer;
    void testInfo;
    await use(ipadSession);
  },
});

test.afterEach(async ({ ipad, appiumServer }, testInfo) => {
  let browserError: unknown;
  try { expect(await ipad.browserErrors(), "unexpected iPad Safari errors").toEqual([]); }
  catch (error) { browserError = error; }
  if (browserError !== undefined || testInfo.status !== testInfo.expectedStatus || testInfo.errors.length > 0) {
    await attachDiagnostics(ipad, appiumServer, testInfo);
  }
  if (browserError !== undefined) throw browserError;
});

export { expect };

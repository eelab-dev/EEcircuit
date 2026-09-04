import { access } from "node:fs/promises";
import { createServer } from "node:net";
import { join } from "node:path";
import { once } from "node:events";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Builder, Capabilities, type WebDriver } from "selenium-webdriver";
import { Command, Name } from "selenium-webdriver/lib/command.js";
import type { Executor as HttpExecutor } from "selenium-webdriver/http";
import { SafariIPadDriver, type Point } from "./safari-driver";
import { ipadBaseUrl } from "./test-url";

const execFileAsync = promisify(execFile);
const getContextsCommand = "appium:getContexts";
const getContextCommand = "appium:getCurrentContext";
const setContextCommand = "appium:setContext";
const getOrientationCommand = "appium:getOrientation";
const setOrientationCommand = "appium:setOrientation";

export type IPadOrientation = "PORTRAIT" | "LANDSCAPE";
export type DeviceInfo = { name?: string; model?: string; uuid?: string; userInterfaceIdiom?: number; isSimulator?: boolean | number };
export type CoordinateCalibration = { offsetX: number; offsetY: number; pixelRatioX: number; pixelRatioY: number };
export type AppiumServer = { url: string; logs: () => string; stop: () => Promise<void> };

const commandOutput = async (command: string, args: string[]): Promise<string> => {
  try {
    const result = await execFileAsync(command, args, { timeout: 15_000 });
    return `${result.stdout}${result.stderr}`;
  } catch (error) {
    throw new Error(`Physical-iPad prerequisite failed: ${command} ${args.join(" ")}\n${String(error)}`, { cause: error });
  }
};

export const assertXCUITestHostReady = async (): Promise<void> => {
  const developerDirectory = (await commandOutput("/usr/bin/xcode-select", ["-p"])).trim();
  if (developerDirectory === "/Library/Developer/CommandLineTools") {
    throw new Error("Physical-iPad multi-touch requires full Xcode selected through xcode-select, not Command Line Tools.");
  }
  await commandOutput("/usr/bin/xcodebuild", ["-version"]);
  const devices = await commandOutput("/usr/bin/xcrun", ["devicectl", "list", "devices"]);
  if (!/iPad/iu.test(devices)) {
    throw new Error("No physical iPad is visible to Xcode. Connect, trust, unlock, and enable Developer Mode on the device.");
  }
};

const reservePort = async (): Promise<number> => new Promise((resolve, reject) => {
  const server = createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address || typeof address === "string") {
      server.close();
      reject(new Error("Unable to reserve a local Appium port"));
      return;
    }
    server.close((error) => error ? reject(error) : resolve(address.port));
  });
});

export const startAppiumServer = async (): Promise<AppiumServer> => {
  await assertXCUITestHostReady();
  const executable = join(process.cwd(), "node_modules", ".bin", "appium");
  await access(executable);
  const port = await reservePort();
  const url = `http://127.0.0.1:${port}`;
  let output = "";
  const child: ChildProcessWithoutNullStreams = spawn(executable, [
    "--address", "127.0.0.1", "--port", String(port), "--use-drivers", "xcuitest",
    "--log-no-colors", "--log-timestamp",
  ], { cwd: process.cwd(), env: process.env, stdio: "pipe" });
  const append = (chunk: Buffer): void => { output = `${output}${chunk.toString()}`.slice(-120_000); };
  child.stdout.on("data", append);
  child.stderr.on("data", append);

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Appium exited before becoming ready.\n${output}`);
    try { if ((await fetch(`${url}/status`)).ok) break; } catch { /* Appium is still starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (Date.now() >= deadline) throw new Error(`Appium did not become ready.\n${output}`);

  return {
    url,
    logs: () => output,
    stop: async () => {
      if (child.exitCode !== null) return;
      child.kill("SIGTERM");
      await Promise.race([once(child, "exit"), new Promise((resolve) => setTimeout(resolve, 5_000))]);
      if (child.exitCode === null) child.kill("SIGKILL");
    },
  };
};

const setOptionalCapability = (capabilities: Capabilities, name: string, value: string | undefined): void => {
  const trimmed = value?.trim();
  if (trimmed) capabilities.set(name, trimmed);
};

const createWebDriver = async (serverUrl: string): Promise<WebDriver> => {
  const capabilities = new Capabilities();
  capabilities.setBrowserName("Safari");
  capabilities.setPlatform("iOS");
  capabilities.set("appium:automationName", "XCUITest");
  capabilities.set("appium:deviceName", "iPad");
  capabilities.set("appium:noReset", true);
  capabilities.set("appium:forceAppLaunch", true);
  capabilities.set("appium:shouldTerminateApp", true);
  capabilities.set("appium:useNewWDA", false);
  capabilities.set("appium:nativeWebTap", true);
  capabilities.set("appium:nativeWebTapStrict", true);
  capabilities.set("appium:safariInitialUrl", `${ipadBaseUrl()}/safari-coordinate-calibration.html`);
  capabilities.set("appium:wdaLaunchTimeout", 180_000);
  capabilities.set("appium:webviewConnectTimeout", 20_000);
  capabilities.set("appium:showXcodeLog", process.env.APPIUM_SHOW_XCODE_LOG === "1");
  capabilities.set("appium:udid", process.env.SAFARI_DEVICE_UDID?.trim() || "auto");
  setOptionalCapability(capabilities, "appium:xcodeOrgId", process.env.APPIUM_XCODE_ORG_ID);
  setOptionalCapability(capabilities, "appium:xcodeSigningId", process.env.APPIUM_XCODE_SIGNING_ID);
  setOptionalCapability(capabilities, "appium:xcodeConfigFile", process.env.APPIUM_XCODE_CONFIG_FILE);
  setOptionalCapability(capabilities, "appium:updatedWDABundleId", process.env.APPIUM_WDA_BUNDLE_ID);
  if (process.env.APPIUM_ALLOW_PROVISIONING_UPDATES === "1") {
    capabilities.set("appium:allowProvisioningUpdates", true);
    capabilities.set("appium:allowProvisioningDeviceRegistration", true);
  }
  if (process.env.APPIUM_USE_PREINSTALLED_WDA === "1") capabilities.set("appium:usePreinstalledWDA", true);

  const driver = await new Builder().usingServer(serverUrl).withCapabilities(capabilities).build();
  await driver.manage().setTimeouts({ script: 30_000 });
  const executor = driver.getExecutor() as HttpExecutor;
  executor.defineCommand(getContextsCommand, "GET", "/session/:sessionId/contexts");
  executor.defineCommand(getContextCommand, "GET", "/session/:sessionId/context");
  executor.defineCommand(setContextCommand, "POST", "/session/:sessionId/context");
  executor.defineCommand(getOrientationCommand, "GET", "/session/:sessionId/orientation");
  executor.defineCommand(setOrientationCommand, "POST", "/session/:sessionId/orientation");
  return driver;
};

const asCalibration = (value: unknown): CoordinateCalibration => {
  const candidate = value as Partial<CoordinateCalibration> | null;
  for (const key of ["offsetX", "offsetY", "pixelRatioX", "pixelRatioY"] as const) {
    if (typeof candidate?.[key] !== "number" || !Number.isFinite(candidate[key])) {
      throw new Error(`Appium returned invalid Safari coordinate calibration: ${JSON.stringify(value)}`);
    }
  }
  return candidate as CoordinateCalibration;
};

const decodeXMLAttribute = (value: string): string => value
  .replace(/&quot;/gu, '"')
  .replace(/&apos;/gu, "'")
  .replace(/&lt;/gu, "<")
  .replace(/&gt;/gu, ">")
  .replace(/&amp;/gu, "&");

const nativeNodeCenter = (source: string, label: string): Point | undefined => {
  const tags = source.match(/<XCUIElementType[^>]+>/gu) ?? [];
  for (const tag of tags) {
    const attributes = Object.fromEntries(
      [...tag.matchAll(/([A-Za-z]+)="([^"]*)"/gu)]
        .map((match) => [match[1] ?? "", decodeXMLAttribute(match[2] ?? "")]),
    );
    if (attributes.visible !== "true" ||
      ![attributes.name, attributes.label, attributes.value].includes(label)) continue;
    const x = Number(attributes.x);
    const y = Number(attributes.y);
    const width = Number(attributes.width);
    const height = Number(attributes.height);
    if ([x, y, width, height].every(Number.isFinite) && width > 0 && height > 0) {
      return { x: x + width / 2, y: y + height / 2 };
    }
  }
  return undefined;
};

const nativeKeyboardNodeCenter = (
  source: string,
  label: string,
  includeButtons = false,
): Point | undefined => {
  const keyboardStart = source.indexOf("<XCUIElementTypeKeyboard");
  const keyboardEnd = keyboardStart < 0 ? -1 : source.indexOf("</XCUIElementTypeKeyboard>", keyboardStart);
  if (keyboardStart < 0 || keyboardEnd < 0) return undefined;
  const keyboardSource = source.slice(keyboardStart, keyboardEnd);
  const nodePattern = includeButtons
    ? /<XCUIElementType(?:Key|Button)[^>]*>/gu
    : /<XCUIElementTypeKey[^>]*>/gu;
  const keySource = (keyboardSource.match(nodePattern) ?? []).join("\n");
  const center = nativeNodeCenter(keySource, label);
  if (!center) return undefined;
  const appTag = source.match(/<XCUIElementTypeApplication[^>]+>/u)?.[0];
  const keyboardTag = source.match(/<XCUIElementTypeKeyboard[^>]+>/u)?.[0];
  const dimensions = (tag: string | undefined): { width: number; height: number } | undefined => {
    if (!tag) return undefined;
    const width = Number(tag.match(/\bwidth="([^"]+)"/u)?.[1]);
    const height = Number(tag.match(/\bheight="([^"]+)"/u)?.[1]);
    return Number.isFinite(width) && Number.isFinite(height) ? { width, height } : undefined;
  };
  const app = dimensions(appTag);
  const keyboard = dimensions(keyboardTag);
  if (app && keyboard && app.width > app.height && keyboard.height > keyboard.width) {
    return { x: center.y, y: app.height - center.x };
  }
  return center;
};

export class XCUITestIPadDriver extends SafariIPadDriver {
  private calibration: CoordinateCalibration | undefined;

  static async create(serverUrl: string): Promise<XCUITestIPadDriver> {
    return new XCUITestIPadDriver(await createWebDriver(serverUrl));
  }

  async start(): Promise<void> {
    const calibrationUrl = `${ipadBaseUrl()}/safari-coordinate-calibration.html`;
    await this.openCalibrationPage(calibrationUrl);
    try {
      this.calibration = asCalibration(await this.driver.executeScript(
        "mobile: calibrateWebToRealCoordinatesTranslation", {},
      ));
    } catch (appiumError) {
      try {
        await this.openCalibrationPage(`${calibrationUrl}?fallback=1`);
        this.calibration = await this.calibrateFromNativeTapGrid();
      } catch (firstFallbackError) {
        try {
          await this.openCalibrationPage(`${calibrationUrl}?fallback=2`);
          this.calibration = await this.calibrateFromNativeTapGrid();
        } catch (secondFallbackError) {
          throw new Error(
            "Unable to calibrate physical iPad Safari coordinates through Appium or two fresh native-tap fallbacks. " +
            `Appium: ${String(appiumError)}; first fallback: ${String(firstFallbackError)}`,
            { cause: secondFallbackError },
          );
        }
      }
    }
    await super.open();
    await this.refreshCalibrationOffset();
    const device = await this.deviceInfo();
    if (device.isSimulator === true || device.isSimulator === 1) {
      throw new Error(`XCUITest connected to a simulator instead of a physical iPad: ${JSON.stringify(device)}`);
    }
  }

  quit(): Promise<void> { return this.driver.quit(); }
  deviceInfo(): Promise<DeviceInfo> { return this.driver.executeScript<DeviceInfo>("mobile: deviceInfo", {}); }
  orientation(): Promise<IPadOrientation> {
    return this.driver.execute(new Command(getOrientationCommand)).then((value) => String(value) as IPadOrientation);
  }
  calibrationInfo(): CoordinateCalibration {
    if (!this.calibration) throw new Error("Safari coordinate calibration has not completed");
    return { ...this.calibration };
  }

  override async tapSelector(selector: string, key = selector): Promise<void> {
    await this.mark(selector, key);
    const beforeEvents = (await this.events()).filter((event) => event.targetKey === key);
    const before = beforeEvents.filter((event) => event.type === "click").length;
    const beforePointerDown = beforeEvents.filter((event) => event.type === "pointerdown").length;
    const beforeChange = beforeEvents.filter((event) => event.type === "change").length;
    const activatesLabelControl = await this.driver.executeScript<boolean>(`
      const element = document.querySelector(arguments[0]);
      return element?.tagName === 'LABEL' && Boolean(element.control);
    `, selector);
    await this.tapWebPoint(await this.selectorCenter(selector));
    try {
      await this.driver.wait(async () => (await this.events())
        .filter((event) => event.type === "click" && event.targetKey === key).length > before, 1_000);
    } catch {
      const delivered = (await this.events()).filter((event) => event.targetKey === key);
      const trustedStart = delivered.some((event) => event.isTrusted &&
        (event.type === "pointerdown" || event.type === "touchstart"));
      const trustedEnd = delivered.some((event) => event.isTrusted &&
        (event.type === "pointerup" || event.type === "touchend"));
      if (!trustedStart || !trustedEnd) {
        throw new Error(`Native iPad tap on ${selector} was incomplete. Events: ${JSON.stringify(delivered)}`);
      }
      await this.driver.executeScript("document.querySelector(arguments[0]).click()", selector);
    }
    const delivered = (await this.events()).filter((event) => event.targetKey === key);
    const clickDelta = delivered.filter((event) => event.type === "click").length - before;
    const pointerDownDelta = delivered.filter((event) => event.type === "pointerdown").length - beforePointerDown;
    const changeDelta = delivered.filter((event) => event.type === "change").length - beforeChange;
    const activatedOnce = activatesLabelControl
      ? pointerDownDelta === 1 && clickDelta === 2 && changeDelta <= 1
      : clickDelta === 1;
    if (!activatedOnce) {
      throw new Error(
        `Native iPad tap on ${selector} did not activate exactly once ` +
        `(pointerdown=${pointerDownDelta}, click=${clickDelta}, change=${changeDelta}). ` +
        `Events: ${JSON.stringify(delivered)}`,
      );
    }
    await this.settle();
  }

  override async tapWithin(selector: string, xFraction: number, yFraction: number, key = selector): Promise<void> {
    await this.mark(selector, key);
    const rect = await this.selectorRect(selector);
    await this.tapWebPoint({ x: rect.x + rect.width * xFraction, y: rect.y + rect.height * yFraction });
    await this.settle();
  }

  async dragWithin(selector: string, fromFraction: Point, toFraction: Point): Promise<void> {
    const rect = await this.selectorRect(selector);
    const from = this.webToNative({ x: rect.x + rect.width * fromFraction.x, y: rect.y + rect.height * fromFraction.y });
    const to = this.webToNative({ x: rect.x + rect.width * toFraction.x, y: rect.y + rect.height * toFraction.y });
    await this.performNativeTouch([
      { type: "pointerMove", duration: 0, origin: "viewport", x: Math.round(from.x), y: Math.round(from.y) },
      { type: "pointerDown", button: 0 },
      { type: "pause", duration: 120 },
      { type: "pointerMove", duration: 400, origin: "viewport", x: Math.round(to.x), y: Math.round(to.y) },
      { type: "pointerUp", button: 0 },
    ], "physical-ipad-drag");
    await this.settle();
  }

  async pinchWithin(selector: string, startSpread = .12, endSpread = .34): Promise<void> {
    const rect = await this.selectorRect(selector);
    const center = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    const y = center.y;
    const startA = this.webToNative({ x: center.x - rect.width * startSpread, y });
    const startB = this.webToNative({ x: center.x + rect.width * startSpread, y });
    const endA = this.webToNative({ x: center.x - rect.width * endSpread, y });
    const endB = this.webToNative({ x: center.x + rect.width * endSpread, y });
    const finger = (id: string, start: Point, end: Point): Record<string, unknown> => ({
      type: "pointer", id, parameters: { pointerType: "touch" }, actions: [
        { type: "pointerMove", duration: 0, origin: "viewport", x: Math.round(start.x), y: Math.round(start.y) },
        { type: "pointerDown", button: 0 }, { type: "pause", duration: 100 },
        ...Array.from({ length: 4 }, (_, index) => ({
          type: "pointerMove", duration: 120, origin: "viewport",
          x: Math.round(start.x + (end.x - start.x) * ((index + 1) / 4)),
          y: Math.round(start.y + (end.y - start.y) * ((index + 1) / 4)),
        })),
        { type: "pointerUp", button: 0 },
      ],
    });
    await this.withNativeContext(async () => {
      await this.driver.execute(new Command(Name.ACTIONS).setParameter("actions", [
        finger("physical-ipad-finger-1", startA, endA), finger("physical-ipad-finger-2", startB, endB),
      ]));
      await this.driver.execute(new Command(Name.CLEAR_ACTIONS));
    });
    await this.settle();
  }

  async doubleTapWithin(selector: string, xFraction = .5, yFraction = .5): Promise<void> {
    const rect = await this.selectorRect(selector);
    const point = this.webToNative({ x: rect.x + rect.width * xFraction, y: rect.y + rect.height * yFraction });
    await this.performNativeTouch([
      { type: "pointerMove", duration: 0, origin: "viewport", x: Math.round(point.x), y: Math.round(point.y) },
      { type: "pointerDown", button: 0 }, { type: "pause", duration: 60 }, { type: "pointerUp", button: 0 },
      { type: "pause", duration: 120 },
      { type: "pointerDown", button: 0 }, { type: "pause", duration: 60 }, { type: "pointerUp", button: 0 },
    ], "physical-ipad-double-tap");
    await this.settle();
  }

  async typeWithOnScreenKeyboard(selector: string, value: string, pressReturn = false): Promise<string> {
    await this.driver.executeScript(`
      const input = document.querySelector(arguments[0]);
      if (!input) throw new Error('Missing input: ' + arguments[0]);
      input.dataset.xcuitestOriginalStyle = input.getAttribute('style') || '';
      const panel = input.closest('[data-properties-dialog]');
      if (panel) {
        panel.dataset.xcuitestOriginalStyle = panel.getAttribute('style') || '';
        Object.assign(panel.style, {
          position: 'fixed', left: 'auto', right: '16px', top: '16px',
          transform: 'none', zIndex: '2147483646', maxHeight: 'calc(100vh - 32px)',
        });
        input.scrollIntoView({ block: 'center', inline: 'nearest' });
      } else {
        Object.assign(input.style, {
          position: 'fixed', left: '16px', top: '40vh', bottom: 'auto',
          zIndex: '2147483647',
        });
      }
    `, selector);
    await this.driver.wait(async () => this.driver.executeScript<boolean>(`
      const input = document.querySelector(arguments[0]);
      if (!input) return false;
      const rect = input.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      return centerX > 0 && centerX < innerWidth && centerY > 0 && centerY < innerHeight &&
        document.elementFromPoint(centerX, centerY) === input;
    `, selector), 5_000);
    const existingLength = await this.driver.executeScript<number>(
      "return document.querySelector(arguments[0]).value.length", selector,
    );
    const nativeInputCenter = this.webToNative(await this.selectorCenter(selector));
    const waitForKeyboard = async (): Promise<boolean> => {
      try {
        await this.withNativeContext(() => this.driver.wait(async () =>
          this.driver.executeScript<boolean>("mobile: isKeyboardShown", {}), 3_000));
        return true;
      } catch {
        return false;
      }
    };
    await this.tapWebPoint(await this.selectorCenter(selector));
    let keyboardShown = await waitForKeyboard();
    if (!keyboardShown) {
      await this.withNativeContext(() =>
        this.driver.executeScript("mobile: tap", nativeInputCenter).then(() => undefined));
      keyboardShown = await waitForKeyboard();
    }
    if (!keyboardShown) {
      keyboardShown = await this.withNativeContext(async () => {
        for (let attempt = 0; attempt < 2; attempt += 1) {
          const source = await this.driver.getPageSource();
          const showCenter = ["Show Keyboard", "show keyboard", "Show keyboard", "Keyboard"]
            .map((label) => nativeNodeCenter(source, label)).find(Boolean);
          if (!showCenter) return false;
          await this.driver.executeScript("mobile: tap", showCenter);
          try {
            await this.driver.wait(async () => this.driver.executeScript<boolean>(
              "mobile: isKeyboardShown", {},
            ), 2_000);
            return true;
          } catch {
            // An attached keyboard may expose a menu before Show Keyboard can be chosen.
          }
        }
        return false;
      });
    }
    if (!keyboardShown) {
      const inputDiagnostic = await this.driver.executeScript<Record<string, unknown>>(`
        const input = document.querySelector(arguments[0]);
        const rect = input?.getBoundingClientRect();
        return { activeLabel: input?.getAttribute('aria-label'), disabled: input?.disabled,
          readOnly: input?.readOnly, value: input?.value, rect: rect && {
            x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          innerHeight, scrollY, hasFocus: document.hasFocus() };
      `, selector);
      const nativeSource = await this.withNativeContext(() => this.driver.getPageSource());
      throw new Error(
        `The native iPad keyboard did not appear for ${selector}. Input: ${JSON.stringify(inputDiagnostic)}; ` +
        `keyboard nodes: ${JSON.stringify(nativeSource.match(/<XCUIElementTypeKeyboard[^>]*>/gu) ?? [])}`,
      );
    }
    await this.withNativeContext(async () => {
      if (existingLength === 0) return;
      const source = await this.driver.getPageSource();
      const deleteCenter = ["delete", "Delete"]
        .map((label) => nativeKeyboardNodeCenter(source, label)).find(Boolean);
      if (!deleteCenter) throw new Error(`The visible iPad keyboard did not expose Delete for ${selector}`);
      for (let index = 0; index < existingLength; index += 1) {
        await this.driver.executeScript("mobile: tap", deleteCenter);
      }
    });
    await this.driver.wait(async () => this.driver.executeScript<string>(
      "return document.querySelector(arguments[0]).value", selector,
    ).then((actual) => actual.length === 0), 5_000);
    for (let index = 0; index < value.length; index += 1) {
      const character = value.charAt(index);
      const keyDiagnostic = await this.withNativeContext(async () => {
        let source = await this.driver.getPageSource();
        const labels = [...new Set([character, character.toLowerCase(), character.toUpperCase()])];
        let center = labels.map((label) => nativeKeyboardNodeCenter(source, label)).find(Boolean);
        if (!center) {
          const modeLabels = /[0-9]/u.test(character)
            ? ["numbers", "Numbers", "more"]
            : ["letters", "Letters", "ABC", "more"];
          const modeCenter = modeLabels
            .map((label) => nativeKeyboardNodeCenter(source, label)).find(Boolean);
          if (modeCenter) {
            await this.driver.executeScript("mobile: tap", modeCenter);
            source = await this.driver.getPageSource();
            center = labels.map((label) => nativeKeyboardNodeCenter(source, label)).find(Boolean);
          }
        }
        const keys = source.match(/<XCUIElementTypeKey[^>]*>/gu) ?? [];
        if (!center) {
          throw new Error(
            `The visible iPad keyboard did not expose ${JSON.stringify(character)} for ${selector}. ` +
            `Visible keys: ${JSON.stringify(keys)}`,
          );
        }
        await this.driver.executeScript("mobile: tap", center);
        return { center, keys };
      });
      const expected = value.slice(0, index + 1).toLowerCase();
      const actual = await this.driver.executeScript<string>(
        "return document.querySelector(arguments[0]).value", selector,
      );
      if (actual.toLowerCase() !== expected) {
        throw new Error(
          `Visible iPad key ${JSON.stringify(character)} produced ${JSON.stringify(actual)} at ` +
          `${JSON.stringify(keyDiagnostic.center)}. Keyboard keys: ${JSON.stringify(keyDiagnostic.keys)}`,
        );
      }
    }
    const typedValue = await this.driver.executeScript<string>(
      "return document.querySelector(arguments[0]).value", selector,
    );
    const restoreStyles = async (): Promise<void> => {
      await this.driver.executeScript(`
        const input = document.querySelector(arguments[0]);
        if (!input) return;
        const panel = input.closest('[data-properties-dialog]');
        const inputStyle = input.dataset.xcuitestOriginalStyle;
        if (inputStyle) input.setAttribute('style', inputStyle); else input.removeAttribute('style');
        delete input.dataset.xcuitestOriginalStyle;
        if (panel) {
          const panelStyle = panel.dataset.xcuitestOriginalStyle;
          if (panelStyle) panel.setAttribute('style', panelStyle); else panel.removeAttribute('style');
          delete panel.dataset.xcuitestOriginalStyle;
        }
      `, selector);
    };
    if (pressReturn) {
      await restoreStyles();
      await this.withNativeContext(async () => {
        const source = await this.driver.getPageSource();
        const returnCenter = ["return", "Return", "done", "Done"]
          .map((label) => nativeKeyboardNodeCenter(source, label, true)).find(Boolean);
        if (!returnCenter) throw new Error(`The visible iPad keyboard did not expose Return for ${selector}`);
        await this.driver.executeScript("mobile: tap", returnCenter);
      });
    } else {
      await this.withNativeContext(async () => {
        if (!await this.driver.executeScript<boolean>("mobile: isKeyboardShown", {})) return;
        const source = await this.driver.getPageSource();
        const hideCenter = ["Hide keyboard", "hide keyboard", "Dismiss keyboard", "dismiss keyboard"]
          .map((label) => nativeKeyboardNodeCenter(source, label, true)).find(Boolean);
        if (!hideCenter) {
          const controls = (source.match(/<XCUIElementType(?:Button|Key)[^>]*>/gu) ?? [])
            .filter((node) => /keyboard|dismiss|hide/iu.test(node));
          throw new Error(`The visible iPad keyboard did not expose its hide control: ${JSON.stringify(controls)}`);
        }
        await this.driver.executeScript("mobile: tap", hideCenter);
      });
      await this.withNativeContext(() => this.driver.wait(async () =>
        !await this.driver.executeScript<boolean>("mobile: isKeyboardShown", {}), 5_000));
    }
    await this.refreshCalibrationOffset();
    if (!pressReturn) await restoreStyles();
    return typedValue;
  }

  async setOrientation(orientation: IPadOrientation): Promise<void> {
    await this.driver.execute(new Command(setOrientationCommand).setParameter("orientation", orientation));
    await this.driver.wait(async () => this.driver.executeScript<boolean>(
      "return arguments[0] === 'PORTRAIT' ? innerHeight >= innerWidth : innerWidth > innerHeight", orientation,
    ), 15_000);
    this.calibration = await this.calibrateFromNativeTapGrid();
    await this.settle();
  }

  private selectorCenter(selector: string): Promise<Point> {
    return this.driver.executeScript<Point>(`
      const rect = document.querySelector(arguments[0])?.getBoundingClientRect();
      if (!rect || !rect.width || !rect.height) throw new Error('Missing or hidden selector: ' + arguments[0]);
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    `, selector);
  }

  private async openCalibrationPage(url: string): Promise<void> {
    await this.driver.get(url);
    try {
      await this.driver.wait(async () => this.driver.executeScript<boolean>(
        "return document.body?.dataset.coordinateCalibration === 'ready'",
      ), 30_000);
    } catch (error) {
      throw new Error(
        `The physical iPad could not load ${url}. Keep it unlocked and ensure SAFARI_IPAD_BASE_URL is reachable from the device.`,
        { cause: error },
      );
    }
  }

  private selectorRect(selector: string): Promise<{ x: number; y: number; width: number; height: number }> {
    return this.driver.executeScript(`
      const rect = document.querySelector(arguments[0])?.getBoundingClientRect();
      if (!rect || !rect.width || !rect.height) throw new Error('Missing or hidden selector: ' + arguments[0]);
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    `, selector);
  }

  private async tapWebPoint(web: Point): Promise<void> {
    const native = this.webToNative(web);
    await this.performNativeTouch([
      { type: "pointerMove", duration: 0, origin: "viewport", x: Math.round(native.x), y: Math.round(native.y) },
      { type: "pointerDown", button: 0 }, { type: "pause", duration: 100 }, { type: "pointerUp", button: 0 },
    ], "physical-ipad-tap");
  }

  private webToNative(point: Point): Point {
    if (!this.calibration) throw new Error("Safari coordinate calibration has not completed");
    return {
      x: this.calibration.offsetX + point.x * this.calibration.pixelRatioX,
      y: this.calibration.offsetY + point.y * this.calibration.pixelRatioY,
    };
  }

  private async performNativeTouch(actions: ReadonlyArray<Record<string, unknown>>, id: string): Promise<void> {
    await this.withNativeContext(async () => {
      await this.driver.execute(new Command(Name.ACTIONS).setParameter("actions", [{
        type: "pointer", id, parameters: { pointerType: "touch" }, actions,
      }]));
      await this.driver.execute(new Command(Name.CLEAR_ACTIONS));
    });
  }

  private async calibrateFromNativeTapGrid(): Promise<CoordinateCalibration> {
    await this.driver.executeScript(`
      const overlay = document.createElement('button');
      overlay.id = 'xcuitest-coordinate-calibration';
      overlay.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;opacity:.01;z-index:2147483647;touch-action:none';
      window.__xcuiCalibrationTaps = [];
      let lastAt = -Infinity;
      const record = event => {
        if (performance.now() - lastAt < 100) return;
        lastAt = performance.now();
        const point = event.changedTouches?.[0] || event.touches?.[0] || event;
        window.__xcuiCalibrationTaps.push({ x: point.clientX, y: point.clientY });
      };
      for (const type of ['pointerdown', 'touchstart', 'click']) overlay.addEventListener(type, record, { passive: true });
      document.body.append(overlay);
    `);
    try {
      const nativeRect = await this.withNativeContext(() => this.driver.manage().window().getRect());
      const samples: Array<{ native: Point; web: Point }> = [];
      for (const candidate of [{ x: .4, y: .4 }, { x: .6, y: .6 }, { x: .4, y: .6 }, { x: .6, y: .4 }]) {
        const native = { x: nativeRect.x + nativeRect.width * candidate.x, y: nativeRect.y + nativeRect.height * candidate.y };
        const count = await this.driver.executeScript<number>("return window.__xcuiCalibrationTaps.length");
        await this.withNativeContext(() => this.driver.executeScript("mobile: tap", native).then(() => undefined));
        try {
          const taps = await this.driver.wait(async () => {
            const values = await this.driver.executeScript<Point[]>("return window.__xcuiCalibrationTaps.slice()");
            return values.length > count ? values : false;
          }, 2_000);
          if (Array.isArray(taps) && taps[count]) samples.push({ native, web: taps[count] });
        } catch { /* Candidate landed in Safari chrome. */ }
      }
      const first = samples[0];
      const xSample = first && samples.find((sample) => Math.abs(sample.web.x - first.web.x) > 10);
      const ySample = first && samples.find((sample) => Math.abs(sample.web.y - first.web.y) > 10);
      if (!first || !xSample || !ySample) throw new Error(`Native calibration did not yield independent samples: ${JSON.stringify(samples)}`);
      const pixelRatioX = (xSample.native.x - first.native.x) / (xSample.web.x - first.web.x);
      const pixelRatioY = (ySample.native.y - first.native.y) / (ySample.web.y - first.web.y);
      return asCalibration({
        offsetX: first.native.x - first.web.x * pixelRatioX,
        offsetY: first.native.y - first.web.y * pixelRatioY,
        pixelRatioX,
        pixelRatioY,
      });
    } finally {
      await this.driver.executeScript("document.querySelector('#xcuitest-coordinate-calibration')?.remove()").catch(() => undefined);
    }
  }

  private async refreshCalibrationOffset(): Promise<void> {
    const calibration = this.calibration;
    if (!calibration) throw new Error("Safari coordinate calibration has not completed");
    await this.driver.executeScript(`
      const overlay = document.createElement('button');
      overlay.id = 'xcuitest-offset-refresh';
      overlay.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;opacity:.01;z-index:2147483647;touch-action:none';
      window.__xcuiOffsetTap = null;
      overlay.addEventListener('click', event => window.__xcuiOffsetTap = { x: event.clientX, y: event.clientY });
      document.body.append(overlay);
    `);
    try {
      const web = await this.driver.executeScript<Point>("return { x: innerWidth / 2, y: innerHeight / 2 }");
      const native = this.webToNative(web);
      await this.withNativeContext(() => this.driver.executeScript("mobile: tap", native).then(() => undefined));
      const observed = await this.driver.wait(async () =>
        (await this.driver.executeScript<Point | null>("return window.__xcuiOffsetTap")) ?? false, 2_000);
      if (!observed || typeof observed !== "object") throw new Error("Loaded Safari viewport did not observe calibration tap");
      this.calibration = asCalibration({
        ...calibration,
        offsetX: native.x - observed.x * calibration.pixelRatioX,
        offsetY: native.y - observed.y * calibration.pixelRatioY,
      });
    } finally {
      await this.driver.executeScript("document.querySelector('#xcuitest-offset-refresh')?.remove()").catch(() => undefined);
    }
  }

  private async withNativeContext<T>(operation: () => Promise<T>): Promise<T> {
    const current = String(await this.driver.execute(new Command(getContextCommand)));
    const contextsValue = await this.driver.execute(new Command(getContextsCommand));
    const contexts = Array.isArray(contextsValue) ? contextsValue.map(String) : [];
    if (!contexts.includes("NATIVE_APP")) throw new Error(`Appium did not expose NATIVE_APP: ${JSON.stringify(contextsValue)}`);
    await this.driver.execute(new Command(setContextCommand).setParameter("name", "NATIVE_APP"));
    try { return await operation(); }
    finally { await this.driver.execute(new Command(setContextCommand).setParameter("name", current)); }
  }
}

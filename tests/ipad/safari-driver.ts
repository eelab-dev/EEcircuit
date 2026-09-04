import { Browser, Builder, By, type WebDriver } from "selenium-webdriver";
import { Command, Name } from "selenium-webdriver/lib/command.js";
import { Options } from "selenium-webdriver/safari.js";
import { ipadBaseUrl } from "./test-url";

export type Point = { x: number; y: number };

export type RecordedInputEvent = {
  type: string;
  isTrusted: boolean;
  pointerType?: string;
  pointerId?: number;
  touches?: number;
  clientX?: number;
  clientY?: number;
  targetKey?: string;
  targetId?: string;
  ariaLabel?: string;
  value?: string;
};

export type SelectorSnapshot = {
  exists: boolean;
  visible: boolean;
  text: string | null;
  value: string | null;
  checked: boolean | null;
  disabled: boolean | null;
  attributes: Record<string, string>;
  rect: { x: number; y: number; width: number; height: number } | null;
};

export type BrowserMetadata = {
  browserName: string;
  browserVersion: string;
  platformName: string;
  userAgent: string;
  maxTouchPoints: number;
  viewport: { width: number; height: number; dpr: number };
};

export type BrowserErrorRecord = {
  source: "error" | "unhandledrejection";
  name: string;
  message: string;
  stack: string;
};

const isExpectedMonacoSafariCancellation = (error: BrowserErrorRecord): boolean =>
  error.name === "Canceled" && /\/assets\/(?:editor|editorExtensions)-/u.test(error.stack);

export const createPhysicalSafariDriver = async (): Promise<WebDriver> => {
  const options = new Options();
  options.set("platformName", "iOS");
  options.set("safari:deviceType", "iPad");
  options.set("safari:useSimulator", false);
  const udid = process.env.SAFARI_DEVICE_UDID?.trim();
  if (udid) options.set("safari:deviceUDID", udid);
  try {
    return await new Builder().forBrowser(Browser.SAFARI).setSafariOptions(options).build();
  } catch (error) {
    throw new Error(
      "Unable to start Safari on a physical iPad. Connect, trust, and unlock the iPad; enable Web Inspector and Remote Automation; and run safaridriver --enable once.",
      { cause: error },
    );
  }
};

export class SafariIPadDriver {
  constructor(protected readonly driver: WebDriver) {}

  async open(path = "/"): Promise<void> {
    await this.driver.get(`${ipadBaseUrl()}/safari-coordinate-calibration.html`);
    await this.driver.executeScript("localStorage.clear()");
    await this.driver.get(`${ipadBaseUrl()}${path}`);
    await this.driver.execute(new Command(Name.CLEAR_ACTIONS)).catch(() => undefined);
    try {
      await this.driver.wait(async () => this.driver.executeScript<boolean>(
        "return document.querySelector('[data-canvas-ready=\"true\"]') !== null",
      ), 30_000);
    } catch (error) {
      throw new Error(
        `The physical iPad opened ${ipadBaseUrl()}, but EEcircuit did not become ready. ` +
        "Keep the device unlocked and on a network that can reach the Mac, or set SAFARI_IPAD_BASE_URL to a reachable address.",
        { cause: error },
      );
    }
    await this.installDiagnostics();
  }

  async installDiagnostics(): Promise<void> {
    await this.driver.executeScript(`
      window.__eecircuitIPadEvents = [];
      window.__eecircuitIPadErrors = [];
      const record = event => {
        const target = event.target instanceof Element ? event.target : null;
        const marked = target?.closest('[data-native-ipad-target]');
        const point = event.changedTouches?.[0] || event.touches?.[0] || event;
        window.__eecircuitIPadEvents.push({
          type: event.type,
          isTrusted: event.isTrusted,
          pointerType: event.pointerType || undefined,
          pointerId: event.pointerId || undefined,
          touches: event.touches ? event.touches.length : undefined,
          clientX: point.clientX,
          clientY: point.clientY,
          targetKey: marked?.dataset.nativeIpadTarget,
          targetId: target?.id || undefined,
          ariaLabel: target?.getAttribute('aria-label') || marked?.getAttribute('aria-label') || undefined,
          value: target && 'value' in target ? target.value : undefined,
        });
      };
      for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'touchstart', 'touchmove', 'touchend', 'click', 'input', 'change']) {
        document.addEventListener(type, record, { capture: true, passive: true });
      }
      addEventListener('error', event => window.__eecircuitIPadErrors.push({
        source: 'error', name: String(event.error?.name || ''),
        message: String(event.error?.message || event.message || ''),
        stack: String(event.error?.stack || ''),
      }));
      addEventListener('unhandledrejection', event => window.__eecircuitIPadErrors.push({
        source: 'unhandledrejection', name: String(event.reason?.name || ''),
        message: String(event.reason?.message || event.reason || ''),
        stack: String(event.reason?.stack || ''),
      }));
    `);
  }

  async waitFor(selector: string, predicate?: (snapshot: SelectorSnapshot) => boolean, timeout = 15_000): Promise<SelectorSnapshot> {
    let result: SelectorSnapshot | false;
    try {
      result = await this.driver.wait(async () => {
        const snapshot = await this.inspect(selector);
        return snapshot.exists && snapshot.visible && (!predicate || predicate(snapshot)) ? snapshot : false;
      }, timeout);
    } catch (error) {
      const snapshot = await this.inspect(selector).catch(() => undefined);
      throw new Error(
        `Timed out waiting for visible selector ${selector}. Last snapshot: ${JSON.stringify(snapshot)}`,
        { cause: error },
      );
    }
    if (!result || typeof result !== "object") throw new Error(`Timed out waiting for ${selector}`);
    return result;
  }

  async waitForAbsent(selector: string, timeout = 10_000): Promise<void> {
    await this.driver.wait(async () => !(await this.inspect(selector)).exists, timeout);
  }

  inspect(selector: string, attributes: string[] = []): Promise<SelectorSnapshot> {
    return this.driver.executeScript<SelectorSnapshot>(`
      const element = document.querySelector(arguments[0]);
      const attributes = {};
      for (const name of new Set([...arguments[1], 'aria-expanded', 'aria-pressed', 'data-scale-x', 'data-offset-x'])) {
        const value = element?.getAttribute(name);
        if (value !== null && value !== undefined) attributes[name] = value;
      }
      const rect = element?.getBoundingClientRect();
      return {
        exists: Boolean(element),
        visible: Boolean(element && rect && rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== 'hidden'),
        text: element?.textContent ?? null,
        value: element && 'value' in element ? element.value : null,
        checked: element && 'checked' in element ? Boolean(element.checked) : null,
        disabled: element && 'disabled' in element ? Boolean(element.disabled) : null,
        attributes,
        rect: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null,
      };
    `, selector, attributes);
  }

  async mark(selector: string, key: string): Promise<void> {
    await this.driver.executeScript(`
      const element = document.querySelector(arguments[0]);
      if (!element) throw new Error('Missing selector: ' + arguments[0]);
      element.dataset.nativeIpadTarget = arguments[1];
    `, selector, key);
  }

  async tapSelector(selector: string, key = selector): Promise<void> {
    await this.mark(selector, key);
    const before = (await this.events()).filter((event) => event.type === "click" && event.targetKey === key).length;
    const element = await this.driver.findElement(By.css(selector));
    const command = new Command(Name.ACTIONS).setParameter("actions", [{
      type: "pointer",
      id: `safaridriver-${Date.now()}`,
      parameters: { pointerType: "touch" },
      actions: [
        { type: "pointerMove", duration: 100, origin: element, x: 0, y: 0 },
        { type: "pointerDown", button: 0 },
        { type: "pause", duration: 80 },
        { type: "pointerUp", button: 0 },
      ],
    }]);
    await this.driver.execute(command);
    await this.driver.execute(new Command(Name.CLEAR_ACTIONS));
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
        throw new Error(`Physical iPad tap on ${selector} was incomplete. Events: ${JSON.stringify(delivered)}`);
      }
      // iOS SafariDriver can omit the compatibility click after a complete
      // trusted touch sequence. Supply one semantic activation only when the
      // page observed no click, matching the sibling physical-iPad harness.
      await this.driver.executeScript("arguments[0].click()", element);
    }
    const clickCount = (await this.events())
      .filter((event) => event.type === "click" && event.targetKey === key).length;
    if (clickCount !== before + 1) {
      const delivered = (await this.events()).filter((event) => event.targetKey === key);
      throw new Error(
        `Physical iPad tap on ${selector} activated ${clickCount - before} times instead of once. Events: ${JSON.stringify(delivered)}`,
      );
    }
    await this.settle();
  }

  async tapWithin(selector: string, xFraction: number, yFraction: number, key = selector): Promise<void> {
    await this.mark(selector, key);
    const element = await this.driver.findElement(By.css(selector));
    const snapshot = await this.waitFor(selector);
    if (!snapshot.rect) throw new Error(`Cannot measure ${selector}`);
    const x = Math.round((xFraction - .5) * snapshot.rect.width);
    const y = Math.round((yFraction - .5) * snapshot.rect.height);
    const command = new Command(Name.ACTIONS).setParameter("actions", [{
      type: "pointer",
      id: `safaridriver-canvas-${Date.now()}`,
      parameters: { pointerType: "touch" },
      actions: [
        { type: "pointerMove", duration: 100, origin: element, x, y },
        { type: "pointerDown", button: 0 },
        { type: "pause", duration: 80 },
        { type: "pointerUp", button: 0 },
      ],
    }]);
    await this.driver.execute(command);
    await this.driver.execute(new Command(Name.CLEAR_ACTIONS));
    await this.settle();
  }

  execute<T>(script: string, ...args: unknown[]): Promise<T> {
    return this.driver.executeScript<T>(script, ...args);
  }

  async settle(): Promise<void> {
    await this.driver.executeAsyncScript(`
      const done = arguments[arguments.length - 1];
      requestAnimationFrame(() => requestAnimationFrame(() => done()));
    `);
  }

  events(): Promise<RecordedInputEvent[]> {
    return this.driver.executeScript<RecordedInputEvent[]>("return window.__eecircuitIPadEvents || []");
  }

  allBrowserErrors(): Promise<BrowserErrorRecord[]> {
    return this.driver.executeScript<BrowserErrorRecord[]>("return window.__eecircuitIPadErrors || []");
  }

  async browserErrors(): Promise<BrowserErrorRecord[]> {
    return (await this.allBrowserErrors()).filter((error) => !isExpectedMonacoSafariCancellation(error));
  }

  screenshot(): Promise<string> { return this.driver.takeScreenshot(); }
  pageSource(): Promise<string> { return this.driver.getPageSource(); }

  async metadata(): Promise<BrowserMetadata> {
    const capabilities = await this.driver.getCapabilities();
    const browser = await this.driver.executeScript<{
      userAgent: string; maxTouchPoints: number; width: number; height: number; dpr: number;
    }>(`
      return { userAgent: navigator.userAgent, maxTouchPoints: navigator.maxTouchPoints,
        width: innerWidth, height: innerHeight, dpr: devicePixelRatio };
    `);
    return {
      browserName: String(capabilities.get("browserName") ?? "Safari"),
      browserVersion: String(capabilities.get("browserVersion") ?? "unknown"),
      platformName: String(capabilities.get("platformName") ?? "iOS"),
      userAgent: browser.userAgent,
      maxTouchPoints: browser.maxTouchPoints,
      viewport: { width: browser.width, height: browser.height, dpr: browser.dpr },
    };
  }
}

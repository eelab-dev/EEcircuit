function copyThroughDocument(text: string): void {
  const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const textarea = document.createElement("textarea");
  textarea.setAttribute("aria-hidden", "true");
  textarea.style.cssText = "position:fixed;left:-10000px;top:0;width:1px;height:1px";
  textarea.value = text;
  document.body.append(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
  activeElement?.focus();
}

function isWebKitBrowser(): boolean {
  return /AppleWebKit/iu.test(navigator.userAgent) && !/(?:Chrome|Chromium|CriOS|EdgiOS|FxiOS)/iu.test(navigator.userAgent);
}

/**
 * Monaco's WebKit clipboard service assumes `navigator.clipboard.write` is
 * available. Physical iPad Safari omits the API for an HTTP LAN origin, then
 * Monaco throws on every click after the editor loads. Install the smallest
 * compatible adapter only for that insecure WebKit case; secure contexts keep
 * the native asynchronous clipboard implementation.
 */
export function installInsecureWebKitClipboardFallback(): void {
  if (!isWebKitBrowser() || navigator.clipboard) return;

  if (typeof globalThis.ClipboardItem === "undefined") {
    type ClipboardPayload = string | Blob | PromiseLike<string | Blob>;
    class InsecureOriginClipboardItem {
      readonly presentationStyle: PresentationStyle = "unspecified";
      readonly types: string[];

      constructor(private readonly data: Record<string, ClipboardPayload>) {
        this.types = Object.keys(data);
      }

      async getType(type: string): Promise<Blob> {
        const payload = this.data[type];
        if (payload === undefined) throw new DOMException(`Clipboard type ${type} is unavailable`, "NotFoundError");
        const resolved = await payload;
        return resolved instanceof Blob ? resolved : new Blob([resolved], { type });
      }

      static supports(type: string): boolean { return type === "text/plain"; }
    }

    Object.defineProperty(globalThis, "ClipboardItem", {
      configurable: true,
      value: InsecureOriginClipboardItem,
    });
  }

  const fallback = Object.assign(new EventTarget(), {
    async write(items: ClipboardItem[]): Promise<void> {
      try {
        const item = items[0];
        if (!item || !item.types.includes("text/plain")) return;
        copyThroughDocument(await (await item.getType("text/plain")).text());
      } catch (error) {
        // Monaco cancels the prior deferred clipboard item on the next user
        // gesture. Cancellation is expected and must not become a page error.
        if (error instanceof Error && error.name === "Canceled") return;
        throw error;
      }
    },
    async writeText(text: string): Promise<void> { copyThroughDocument(text); },
    async read(): Promise<ClipboardItems> { return []; },
    async readText(): Promise<string> { return ""; },
  }) satisfies Clipboard;

  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    enumerable: true,
    value: fallback,
  });
}

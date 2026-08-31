import { readdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test.use({ baseURL: "http://127.0.0.1:4174" });

test("SPICE Monaco editor supports highlighting, completion, and editing features", async ({ page }) => {
  test.setTimeout(45_000);
  const browserErrors: Error[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/");
  await expect(page.locator('[data-canvas-ready="true"]')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".monaco-editor")).toHaveCount(0);

  await page.getByRole("button", { name: "Simulate Circuit" }).click();
  await expect(page.getByRole("tab", { name: "simulation config" })).toHaveAttribute(
    "aria-selected",
    "true",
    { timeout: 15_000 },
  );

  const editor = page.locator(".monaco-editor").first();
  const editorInput = page.getByRole("textbox", { name: "Editor content" });
  await expect(editor).toBeVisible({ timeout: 15_000 });
  await editorInput.focus();
  const editorModifier = await page.evaluate(() =>
    /Mac|iPhone|iPad/.test(navigator.userAgent) ? "Meta" : "Control",
  );

  await page.keyboard.press(`${editorModifier}+KeyA`);
  await page.keyboard.insertText(`${[
    "* SPICE token coverage",
    ".param gain=1e9",
    "V1 n1 0 DC 1",
    "Rk n1 0 1k",
    "Rmeg n2 0 100Meg",
    "Rg n3 0 1G",
    "Rt n4 0 1T",
    "Rsweep n5 0 [0:2:10]u",
    ".end",
  ].join("\n")}\n`);

  const collectHighlightedTokens = () =>
    editor.locator('.view-line span[class*="mtk"]').evaluateAll((spans) =>
      spans.map((span) => ({
        className: span.className,
        text: span.textContent?.replaceAll("\u00a0", " ") ?? "",
      })),
    );
  await expect.poll(async () => {
    const tokens = await collectHighlightedTokens();
    const identifierClass = tokens.find(({ text }) => text === "Rk")?.className;
    return ["1e9", "1k", "100Meg", "1G", "1T", "0:2:10"].every((text) => {
      const tokenClass = tokens.find((token) => token.text === text)?.className;
      return Boolean(tokenClass && tokenClass !== identifierClass);
    });
  }).toBe(true);

  const highlightedTokens = await collectHighlightedTokens();
  const tokenFor = (text: string) =>
    highlightedTokens.find((token) => token.text === text) ??
    highlightedTokens.find((token) => token.text.includes(text));
  const identifierToken = tokenFor("Rk");
  expect(identifierToken).toBeDefined();
  for (const number of ["1e9", "1k", "100Meg", "1G", "1T", "0:2:10"]) {
    const token = tokenFor(number);
    expect(token?.className, `${number} should be a highlighted numeric token`).toBeTruthy();
    expect(token?.className, `${number} should not be an identifier`).not.toBe(
      identifierToken?.className,
    );
  }
  expect(tokenFor(".param")?.className).toBeTruthy();

  const suggestionWidget = page.locator(".suggest-widget");
  const openSuggestions = async () => {
    await editorInput.focus();
    await expect(editorInput).toBeFocused();
    await expect.poll(async () => {
      if (await suggestionWidget.isVisible()) return true;
      await page.keyboard.press("Control+Space");
      return suggestionWidget.isVisible();
    }, { timeout: 5_000 }).toBe(true);
  };
  await editor.locator(".view-line").filter({ hasText: ".end" }).last().click();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("  R");
  await openSuggestions();
  const resistorSuggestion = suggestionWidget.getByText("R (resistor)", { exact: false });
  await expect(resistorSuggestion).toBeVisible();
  await resistorSuggestion.click();
  await expect(editor.locator(".view-lines")).toContainText("  Rnumber node1 node2 value");
  await page.keyboard.press("Escape");

  await editor.locator(".view-line").filter({ hasText: "Rnumber node1 node2 value" }).last().click();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("  .a");
  await openSuggestions();
  const acSuggestion = suggestionWidget.getByText(".ac", { exact: true });
  await expect(acSuggestion).toBeVisible();
  await acSuggestion.click();
  await expect(editor.locator(".view-lines")).toContainText("  .ac dec points start_frequency stop_frequency");
  await expect(editor.locator(".view-lines")).not.toContainText("dec | oct | lin");
  await page.keyboard.press("Escape");

  await editor
    .locator(".view-line")
    .filter({ hasText: ".ac dec points start_frequency stop_frequency" })
    .last()
    .click();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("  .pa");
  await openSuggestions();
  const paramSuggestion = suggestionWidget.getByText(".param", { exact: true });
  await expect(paramSuggestion).toBeVisible();
  await expect(suggestionWidget.getByText(".parameter", { exact: true })).toHaveCount(0);
  await paramSuggestion.click();
  await expect(editor.locator(".view-lines")).toContainText("  .param name=value");
  await page.keyboard.press("Escape");

  await editorInput.focus();
  await page.keyboard.press(`${editorModifier}+KeyF`);
  await expect(page.locator(".find-widget")).toBeVisible();
  await page.keyboard.press("Escape");

  await editorInput.focus();
  const replaceShortcut = editorModifier === "Meta" ? "Meta+Alt+KeyF" : "Control+KeyH";
  await page.keyboard.press(replaceShortcut);
  await expect(page.locator(".find-widget .replace-part")).toBeVisible();
  await page.keyboard.press("Escape");

  await editor.locator(".view-lines").click({ button: "right" });
  await expect(page.locator(".monaco-menu-container")).toBeVisible();
  await page.keyboard.press("Escape");

  const initialThemeClass = await editor.getAttribute("class");
  await page.getByRole("button", { name: "Toggle color mode" }).click();
  await expect.poll(() => editor.getAttribute("class")).not.toBe(initialThemeClass);

  const loadedLanguageWorkers = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((entry) => entry.name)
      .filter((name) => /\/(?:editor|css|html|json|ts)\.worker-[^/]+\.js$/.test(name)),
  );
  expect(loadedLanguageWorkers.every((worker) => worker.includes("/editor.worker-"))).toBe(true);

  const emittedLanguageWorkers = (await readdir("dist/assets"))
    .filter((file) => /^(?:editor|css|html|json|ts)\.worker-[^/]+\.js$/.test(file));
  expect(emittedLanguageWorkers).toHaveLength(1);
  expect(emittedLanguageWorkers[0]).toMatch(/^editor\.worker-/);
  expect(browserErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

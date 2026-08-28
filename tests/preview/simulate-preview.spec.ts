import { readdir } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

const backgroundChunkNames = [
  "simulate-",
  "ScientificPlot-",
  "NewSchematicDialog-",
  "SettingsDialog-",
  "AboutDialog-",
  "properties-",
  "ShortcutsDialog-",
  "ExportImageDialog-",
];

const expectBackgroundUiPreloaded = async (page: Page, url: string) => {
  await page.goto(url);
  await expect(page.locator('[data-canvas-ready="true"]')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("tab", { name: "Schematic" })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  await expect
    .poll(
      () =>
        page.evaluate((chunkNames) => {
          const resources = performance
            .getEntriesByType("resource")
            .map((entry) => entry.name)
            .filter((name) => name.endsWith(".js"));
          return chunkNames.filter(
            (chunkName) => !resources.some((resource) => resource.includes(chunkName)),
          );
        }, backgroundChunkNames),
      { timeout: 15_000 },
    )
    .toEqual([]);

  const preloadTiming = await page.evaluate((chunkNames) => {
    const readyMark = performance.getEntriesByName("eecircuit:schematic-ready").at(-1);
    const resources = performance
      .getEntriesByType("resource")
      .filter((entry) => entry.name.endsWith(".js"));

    return {
      readyAt: readyMark?.startTime ?? -1,
      starts: chunkNames.map((chunkName) => ({
        chunkName,
        startTimes: resources
          .filter((resource) => resource.name.includes(chunkName))
          .map((resource) => resource.startTime),
      })),
    };
  }, backgroundChunkNames);

  expect(preloadTiming.readyAt).toBeGreaterThanOrEqual(0);
  for (const chunk of preloadTiming.starts) {
    expect(chunk.startTimes, `${chunk.chunkName} should load exactly once`).toHaveLength(1);
    expect(chunk.startTimes[0], `${chunk.chunkName} loaded before schematic readiness`).toBeGreaterThanOrEqual(
      preloadTiming.readyAt,
    );
  }

  await expect(page.locator(".monaco-editor")).toHaveCount(0);
  await expect(page.getByText("Plot Variables")).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
};

test("production preview evaluates lazy features and every browser chunk without errors", async ({ page }) => {
  test.setTimeout(60_000);
  const browserErrors: Error[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await expectBackgroundUiPreloaded(page, "/?clean=true");
  await expectBackgroundUiPreloaded(page, "/");

  await page.getByRole("button", { name: "New Schematic" }).click();
  await expect(page.getByText("Create New Schematic", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Load Demo" }).click();

  await page.getByRole("button", { name: "Simulation Settings" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();

  await page.getByRole("button", { name: "About EEcircuit" }).click();
  await expect(page.getByText("About EEcircuit", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();

  await page.getByRole("button", { name: "Open keyboard shortcuts" }).click();
  await expect(page.getByText("Keyboard Shortcuts", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close shortcuts dialog" }).click();

  await page.getByRole("button", { name: "Export schematic image" }).click();
  await expect(page.getByText("Export Schematic", { exact: true })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Close export dialog" }).click();

  await page.getByRole("button", { name: "Simulate Circuit" }).click();

  await expect(page.getByRole("tab", { name: "simulation config" })).toHaveAttribute(
    "aria-selected",
    "true",
    { timeout: 15_000 },
  );
  await expect(page.locator(".monaco-editor")).toBeVisible({ timeout: 15_000 });

  const editor = page.locator(".monaco-editor").first();
  const editorInput = page.getByRole("textbox", { name: "Editor content" });
  await editorInput.focus();

  await expect
    .poll(() =>
      editor.locator('.view-lines span[class*="mtk"]').evaluateAll((tokens) =>
        new Set(tokens.map((token) => token.className)).size,
      ),
    )
    .toBeGreaterThan(1);

  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("R");
  await page.keyboard.press("Control+Space");
  const suggestionWidget = page.locator(".suggest-widget");
  await expect(suggestionWidget).toBeVisible();
  await expect(suggestionWidget.getByText("R (resistor)", { exact: false })).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(editor.locator(".view-lines")).toContainText("Rnumber node1 node2 value");

  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.press("Enter");
  await page.keyboard.type(".");
  await expect(suggestionWidget).toBeVisible();
  await expect(suggestionWidget.getByText(".tran", { exact: false })).toBeVisible();
  await page.keyboard.press("Escape");

  await editorInput.focus();
  const findModifier = await page.evaluate(() =>
    /Mac|iPhone|iPad/.test(navigator.userAgent) ? "Meta" : "Control",
  );
  await page.keyboard.press(`${findModifier}+KeyF`);
  await expect(page.locator(".find-widget")).toBeVisible();
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
  expect(
    loadedLanguageWorkers.every((worker) => worker.includes("/editor.worker-")),
  ).toBe(true);

  await page.getByText("Transient", { exact: true }).click();
  await page.getByLabel("Stop Time").fill("10m");
  await page.getByLabel("Time Step").fill("100u");
  await page.getByRole("button", { name: /Run Simulation|Run/i }).click();
  await expect(page.getByText("Plot Variables")).toBeVisible({ timeout: 20_000 });

  const browserChunks = (await readdir("dist/assets"))
    .filter((file) => file.endsWith(".js"))
    .filter((file) => !/^(?:canvas|exporters|simulationWorker)-/.test(file))
    .filter((file) => !/^(?:editor|json|html|css|ts)\.worker-/.test(file));

  expect(browserChunks.length).toBeGreaterThan(0);
  for (const chunk of browserChunks) {
    await page.evaluate(async (url) => {
      await import(url);
    }, `/assets/${chunk}`);
  }

  expect(browserErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

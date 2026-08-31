import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "./fixtures";

const waitForSchematic = async (page: Page, clean = true) => {
  await page.goto(clean ? "/?clean=true" : "/");
  await expect(page.locator("#schematic-canvas")).toHaveAttribute(
    "data-canvas-ready",
    "true",
    { timeout: 15_000 },
  );
  await page.locator("#canvas-container").focus();
};

const modeButton = (page: Page, name: RegExp) =>
  page.getByRole("button", { name });

const dispatchKey = async (
  page: Page,
  key: string,
  modifiers: { altKey?: boolean; ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean } = {},
) => {
  await page.evaluate(({ keyValue, modifierValues }) => {
    document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", {
      key: keyValue,
      bubbles: true,
      cancelable: true,
      ...modifierValues,
    }));
  }, { keyValue: key, modifierValues: modifiers });
};

test("toolbar modes and shortcuts share exclusive application state", async ({ page }) => {
  await waitForSchematic(page);

  const select = modeButton(page, /^Select$/);
  const wire = modeButton(page, /^Wire \(W\)$/);
  const move = modeButton(page, /^Move \(M\)$/);
  const text = modeButton(page, /^Text \(T\)$/);
  const remove = modeButton(page, /^Remove \(Shift\+D\)$/);
  const hand = modeButton(page, /^Hand Tool$/);

  for (const [active, previous] of [
    [select, null],
    [wire, select],
    [move, wire],
    [text, move],
    [remove, text],
    [hand, remove],
  ] as const) {
    await active.click();
    await expect(active).toHaveAttribute("aria-pressed", "true");
    if (previous) await expect(previous).toHaveAttribute("aria-pressed", "false");
  }

  await hand.click();
  await expect(hand).toHaveAttribute("aria-pressed", "false");

  // The toolbar is part of the schematic keyboard scope, so shortcuts must
  // continue working while its last-used button retains focus.
  await page.keyboard.press("w");
  await expect(wire).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("m");
  await expect(move).toHaveAttribute("aria-pressed", "true");
  await expect(wire).toHaveAttribute("aria-pressed", "false");
  await page.keyboard.press("t");
  await expect(text).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Shift+d");
  await expect(remove).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await expect(remove).toHaveAttribute("aria-pressed", "false");

  await page.keyboard.press("w");
  await dispatchKey(page, "§");
  await expect(wire).toHaveAttribute("aria-pressed", "false");
});

test("component browser keyboard navigation and focus guards are app scoped", async ({ page }) => {
  await waitForSchematic(page);
  const wire = modeButton(page, /^Wire \(W\)$/);
  const addButton = page.getByRole("button", { name: "Open add component popover" });

  await page.keyboard.press("a");
  await expect(addButton).toHaveAttribute("aria-expanded", "true");
  const search = page.getByPlaceholder("Search components...");
  await expect(search).toBeFocused();
  await search.fill("res");

  await page.keyboard.press("w");
  await expect(search).toHaveValue("resw");
  await expect(wire).toHaveAttribute("aria-pressed", "false");

  await search.fill("");
  await page.keyboard.press("Tab");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  await expect(addButton).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("button", { name: "Rotate selection" })).toBeVisible();
  await page.locator("#canvas-container").focus();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Cancel move" })).toBeHidden();
  await expect(page.locator("#schematic-canvas")).toHaveAttribute(
    "data-last-editor-command",
    "reset-modes",
  );

  await page.locator("#canvas-container").focus();
  for (const [key, modifiers] of [
    ["a", { altKey: true }],
    ["m", { metaKey: true }],
    ["w", { ctrlKey: true }],
  ] as const) {
    await dispatchKey(page, key, modifiers);
  }
  await expect(addButton).toHaveAttribute("aria-expanded", "false");
  await expect(wire).toHaveAttribute("aria-pressed", "false");

  await page.keyboard.press("a");
  await expect(search).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(addButton).toHaveAttribute("aria-expanded", "false");
  await expect(addButton).toBeFocused();
});

test("view and help controls work through buttons and keyboard without editor errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await waitForSchematic(page, false);

  await page.getByRole("button", { name: "Fit schematic to screen" }).click();
  await expect(page.locator("#schematic-canvas")).toHaveAttribute("data-last-editor-command", "fit-view");
  await page.getByRole("button", { name: "Return view to origin" }).click();
  await expect(page.locator("#schematic-canvas")).toHaveAttribute("data-last-editor-command", "return-to-origin");
  await page.locator("#canvas-container").focus();
  await page.keyboard.press("f");
  await expect(page.locator("#schematic-canvas")).toHaveAttribute("data-last-editor-command", "fit-view");
  await page.keyboard.press("o");
  await expect(page.locator("#schematic-canvas")).toHaveAttribute("data-last-editor-command", "return-to-origin");

  const shortcutsButton = page.getByRole("button", { name: "Open keyboard shortcuts" });
  await shortcutsButton.click();
  await expect(page.getByText("Keyboard Shortcuts", { exact: true })).toBeVisible();
  for (const binding of ["A", "F", "O", "M", "W", "T", "Shift + D", "Esc or §", "R", "H", "V", "Shift + Z", "Shift + R", "Shift + H", "Ctrl + H"]) {
    await expect(page.getByText(binding, { exact: true })).toBeVisible();
  }
  await page.getByRole("button", { name: "Close shortcuts dialog" }).click();

  await page.locator("#canvas-container").focus();
  await page.keyboard.press("Shift+h");
  await expect(page.getByText("Keyboard Shortcuts", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close shortcuts dialog" }).click();
  await page.locator("#canvas-container").focus();
  await page.keyboard.press("Control+h");
  await expect(page.getByText("Keyboard Shortcuts", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close shortcuts dialog" }).click();

  expect(errors).toEqual([]);
});

test("transform buttons and shortcuts produce equivalent saved schematic fields", async ({ page }) => {
  const placeAndRead = async (kind: "button" | "key", action: "rotate" | "horizontal" | "vertical") => {
    await waitForSchematic(page);
    await page.keyboard.press("a");
    await page.getByPlaceholder("Search components...").fill("resistor");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Rotate selection" })).toBeVisible();

    if (kind === "button") {
      const names = {
        rotate: "Rotate selection",
        horizontal: "Flip horizontal",
        vertical: "Flip vertical",
      } as const;
      await page.getByRole("button", { name: names[action] }).click();
    } else {
      await page.locator("#canvas-container").focus();
      await page.keyboard.press(action === "rotate" ? "r" : action === "horizontal" ? "h" : "v");
    }

    const canvas = page.locator("#schematic-canvas");
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Schematic canvas has no bounding box");
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.getByRole("button", { name: "Cancel move" }).click();

    const downloadPromise = page.waitForEvent("download");
    await page.getByLabel("Save EEcircuit file").first().click();
    const download = await downloadPromise;
    const path = await download.path();
    if (!path) throw new Error("Saved schematic download has no path");
    const saved = JSON.parse(await readFile(path, "utf8")) as {
      schematic: { componentInstances: Array<{ rotation: string; flip: string }> };
    };
    expect(saved.schematic.componentInstances).toHaveLength(1);
    return saved.schematic.componentInstances[0]!;
  };

  for (const action of ["rotate", "horizontal", "vertical"] as const) {
    const buttonResult = await placeAndRead("button", action);
    const keyResult = await placeAndRead("key", action);
    expect(keyResult).toEqual(buttonResult);
    if (action === "rotate") expect(buttonResult.rotation).not.toBe("0");
    else expect(buttonResult.flip).toBe(action);
  }
});

test("app integration smoke covers add, transform, edit, move, wire, and delete", async ({ page }) => {
  await waitForSchematic(page);
  const canvas = page.locator("#schematic-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Schematic canvas has no bounding box");
  const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const moved = { x: center.x + 60, y: center.y };

  await page.keyboard.press("a");
  await page.getByPlaceholder("Search components...").fill("resistor");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Rotate selection" })).toBeVisible();
  await page.keyboard.press("r");
  await page.mouse.click(center.x, center.y);
  await page.getByRole("button", { name: "Cancel move" }).click();

  await modeButton(page, /^Select$/).click();
  await page.mouse.click(center.x, center.y);
  const properties = page.locator("[data-properties-dialog]");
  await expect(properties).toBeVisible();
  await page.getByPlaceholder("Component name (e.g., R1, C1)").fill("R_SMOKE");
  await page.getByPlaceholder("e.g., 1k, 10ohm, 100").fill("2.2k");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(properties).toBeHidden();

  await modeButton(page, /^Move \(M\)$/).click();
  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await page.mouse.move(moved.x, moved.y, { steps: 5 });
  await page.mouse.up();
  const cancelMove = page.getByRole("button", { name: "Cancel move" });
  if (await cancelMove.isVisible()) await cancelMove.click();

  const editedDownloadPromise = page.waitForEvent("download");
  await page.getByLabel("Save EEcircuit file").first().click();
  const editedDownload = await editedDownloadPromise;
  const editedPath = await editedDownload.path();
  if (!editedPath) throw new Error("Edited schematic download has no path");
  const edited = JSON.parse(await readFile(editedPath, "utf8")) as {
    schematic: {
      componentInstances: Array<{
        name: string;
        value: string;
        origin: { x: number; y: number };
      }>;
    };
  };
  expect(edited.schematic.componentInstances).toHaveLength(1);
  expect(edited.schematic.componentInstances[0]).toMatchObject({
    name: "R_SMOKE",
    value: "2.2k",
  });
  expect(edited.schematic.componentInstances[0]?.origin).not.toEqual({ x: 0, y: 0 });

  await page.locator("#canvas-container").focus();
  await page.keyboard.press("w");
  await page.mouse.click(center.x - 100, center.y + 100);
  await page.mouse.click(center.x - 60, center.y + 100);
  await page.getByRole("button", { name: "Undo last wire point" }).click();
  await page.getByRole("button", { name: "Cancel wire" }).click();

  await page.locator("#canvas-container").focus();
  await page.keyboard.press("Shift+d");
  // Depending on snapping, the drag target can land on either adjacent grid point.
  // Trying the original point as well keeps this app smoke focused on dispatch,
  // while exact movement geometry remains covered by eecircuit-schematic.
  await page.mouse.click(moved.x, moved.y);
  await page.mouse.click(center.x, center.y);

  const downloadPromise = page.waitForEvent("download");
  await page.getByLabel("Save EEcircuit file").first().click();
  const download = await downloadPromise;
  const path = await download.path();
  if (!path) throw new Error("Saved schematic download has no path");
  const saved = JSON.parse(await readFile(path, "utf8")) as {
    schematic: { componentInstances: Array<{ name: string; value: string }> };
  };
  expect(saved.schematic.componentInstances).toEqual([]);
});

test("wire contextual controls dispatch undo and cancel while preserving mode state", async ({ page }) => {
  await waitForSchematic(page);
  const wire = modeButton(page, /^Wire \(W\)$/);
  await page.keyboard.press("w");
  const undo = page.getByRole("button", { name: "Undo last wire point" });
  const cancel = page.getByRole("button", { name: "Cancel wire" });
  await expect(undo).toBeVisible();
  await expect(cancel).toBeVisible();

  const box = await page.locator("#schematic-canvas").boundingBox();
  if (!box) throw new Error("Schematic canvas has no bounding box");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.click(box.x + box.width / 2 + 40, box.y + box.height / 2);
  await undo.click();
  await expect(wire).toHaveAttribute("aria-pressed", "true");
  await cancel.click();
  await expect(undo).toBeHidden();
  await expect(wire).toHaveAttribute("aria-pressed", "false");
});

test("schematic shortcuts do not activate while another tab is active", async ({ page }) => {
  await waitForSchematic(page, false);
  await page.getByLabel("Simulate Circuit").click();
  await expect(page.getByRole("tab", { name: "simulation config" })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("w");
  await page.getByRole("tab", { name: "Schematic" }).click();
  await expect(modeButton(page, /^Wire \(W\)$/)).toHaveAttribute("aria-pressed", "false");
});

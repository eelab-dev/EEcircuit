<script lang="ts">
  import { onMount } from "svelte";
  import {
    createSchematicEditor,
    type AvailableComponent,
    type EditorEvent,
    type EditorMode,
    type PointerInfo,
    type Schematic,
    type SchematicEditor,
    type SelectedItem,
  } from "eecircuit-schematic";
  import { ArrowBigRight, Cable, CirclePlus, LayoutDashboard, Square } from "@lucide/svelte";
  import { demoSchematic } from "../../schematic/demoSchematic";
  import { executeSchematicEditorCommand, type SchematicEditorCommand } from "../../schematic/schematicCommands";
  import { resolveSchematicShortcut } from "../../schematic/schematicShortcuts";
  import { formatToBePlottedLabel, normalizeTerminalSelection, parseTerminalPointerInfo } from "../../utils/toBePlotted";
  import { appState, getAppState } from "../state/appState.svelte";
  import { browserProject, hasBrowserProject, resetBrowserRecovery } from "../state/browserSession";
  import ExportImageModal from "./ExportImageModal.svelte";
  import PropertiesPanel from "./PropertiesPanel.svelte";
  import SchematicToolbar from "./SchematicToolbar.svelte";
  import ShortcutsModal from "./ShortcutsModal.svelte";

  let { onReady }: { onReady?: () => void } = $props();

  const blankSchematic: Schematic = { componentInstances: [], wires: [] };
  let container: HTMLDivElement;
  let canvas: HTMLCanvasElement;
  let editor = $state<SchematicEditor | null>(null);
  let coord = $state({ x: 0, y: 0 });
  let pointerInfo = $state<PointerInfo>(null);
  let lastPointerInfo: PointerInfo = null;
  let lastPointerAt = 0;
  let selectedItem = $state<SelectedItem>({ type: "none" });
  let availableComponents = $state<AvailableComponent[]>([]);
  let propertiesDismissed = $state(false);
  let canvasMessage = $state<{ text: string; type: "error" | "warning" } | null>(null);
  let shortcutsOpen = $state(false);
  let exportOpen = $state(false);
  let svgContent = $state<string | null>(null);
  let svgLoading = $state(false);
  let readyPromise: Promise<void> = Promise.resolve();
  let replacingDocument = false;
  let lastSimulationSnapshot = "";
  // The shared worker seeds history with a blank document. Keep Undo inside
  // this session's opened document without persisting or exposing that seed.
  let undoDepth = 0;
  let navigatingHistory = false;
  let editorTask: Promise<void> = Promise.resolve();
  let resolveReady: () => void = () => undefined;

  function reportError(operation: string, error: unknown) {
    const text = error instanceof Error ? error.message : String(error);
    console.error(`Schematic ${operation} failed:`, error);
    appState.addMessage({ text, type: "error", category: "Schematic", mLevel: "user" });
    canvasMessage = { text, type: "error" };
  }

  async function command(value: SchematicEditorCommand) {
    editorTask = editorTask.then(async () => {
      if (!editor || (value === "undo" && undoDepth === 0)) return;
      try {
        if (value === "undo" || value === "redo") {
          navigatingHistory = true;
          const changed = value === "undo" ? await editor.undo() : await editor.redo();
          if (changed) undoDepth += value === "undo" ? -1 : 1;
        } else await executeSchematicEditorCommand(editor, value);
        canvas.dataset.lastEditorCommand = value;
      } catch (error) {
        reportError(value, error);
      } finally { navigatingHistory = false; }
    });
    await editorTask;
  }

  function setMode(mode: EditorMode) {
    appState.setEditorMode(mode);
  }

  function formatCoordinate(value: number) {
    const text = value.toString();
    return value >= 0 ? ` ${text.padStart(3, " ")}` : text.padStart(4, " ");
  }

  function handlePlotSelection(item: SelectedItem) {
    if (!getAppState().isToBePlottedMode) return;
    if (item.type === "wire" || item.type === "junction") {
      appState.addToBePlotted({ type: "voltage", netName: item.netName.trim() || "unknown" });
      return;
    }
    const pointer = pointerInfo ?? (Date.now() - lastPointerAt < 500 ? lastPointerInfo : null);
    if (pointer?.type === "wire" || pointer?.type === "junction") {
      appState.addToBePlotted({ type: "voltage", netName: pointer.name?.trim() || "unknown" });
    } else if (pointer?.type === "terminal") {
      const parsed = parseTerminalPointerInfo(pointer.name);
      if (parsed) {
        const corrected = normalizeTerminalSelection(parsed);
        appState.addToBePlotted({ type: "current", componentName: corrected.componentName, terminalName: corrected.terminalName });
      }
    }
  }

  function handleCanvasClick() {
    if (!getAppState().isToBePlottedMode) return;
    const pointer = pointerInfo ?? (Date.now() - lastPointerAt < 2_000 ? lastPointerInfo : null);
    if (pointer?.type === "wire" || pointer?.type === "junction") {
      appState.addToBePlotted({ type: "voltage", netName: pointer.name?.trim() || "unknown" });
    } else if (pointer?.type === "terminal") {
      const parsed = parseTerminalPointerInfo(pointer.name);
      if (parsed) {
        const corrected = normalizeTerminalSelection(parsed);
        appState.addToBePlotted({ type: "current", componentName: corrected.componentName, terminalName: corrected.terminalName });
      }
    }
  }

  function onEditorEvent(message: EditorEvent) {
    switch (message.type) {
      case "change":
        if (!replacingDocument) {
          if (!navigatingHistory) undoDepth++;
          appState.setHasSchematicDocument(true);
          appState.setCurrentSchematic(message.schematic);
        }
        break;
      case "pointerCoords":
        coord = message.pointerCoords;
        break;
      case "pointerInfo":
        pointerInfo = message.pointerInfo;
        if (message.pointerInfo) {
          lastPointerInfo = message.pointerInfo;
          lastPointerAt = Date.now();
        }
        break;
      case "selectedItem":
        selectedItem = message.selectedItem;
        propertiesDismissed = false;
        handlePlotSelection(message.selectedItem);
        break;
      case "availableComponents":
        availableComponents = message.availableComponents;
        break;
      case "info":
        appState.addMessage({ text: message.msg, type: message.mType, category: "Schematic", mLevel: message.mLevel });
        if (message.mType !== "info") canvasMessage = { text: message.msg, type: message.mType };
        break;
      case "error":
        appState.addMessage({ text: message.msg, type: message.mType, category: "Schematic", mLevel: message.mLevel });
        canvasMessage = { text: message.msg, type: message.mType === "error" ? "error" : "warning" };
        break;
      case "fatalError":
        reportError("worker", message.message);
        break;
      case "liveWireStatus":
        canvasMessage = message.status.isValid || !message.status.reason ? null : { text: message.status.reason, type: "warning" };
        break;
      case "schematicEditorActivity":
        appState.setIsWiring(message.activity === "wiring");
        appState.setIsMoving(message.activity === "moving");
        break;
      case "status":
        if (message.status === "worker-error") reportError("worker", "Schematic worker stopped unexpectedly.");
        break;
    }
  }

  async function addComponent(type: AvailableComponent["type"]) {
    try { await editor?.addComponent(type); } catch (error) { reportError("component placement", error); }
  }

  async function synchronizeSimulation(force: boolean, shiftPressed = false): Promise<boolean> {
    await readyPromise;
    await editorTask;
    if (!editor) return false;
    appState.setOverrideSimulateOnNetlistErrorsOnce(shiftPressed);
    try {
      const schematicSnapshot = await editor.getSchematic();
      appState.setCurrentSchematic(schematicSnapshot);
      const snapshot = JSON.stringify(schematicSnapshot);
      if (!force && snapshot === lastSimulationSnapshot) {
        appState.setOverrideSimulateOnNetlistErrorsOnce(false);
        return true;
      }
      const { netList, success } = await editor.getNetList();
      if (success || getAppState().overrideSimulateOnNetlistErrorsOnce) {
        await appState.exportNetlist(netList);
        lastSimulationSnapshot = JSON.stringify(schematicSnapshot);
        appState.setOverrideSimulateOnNetlistErrorsOnce(false);
        return true;
      } else {
        appState.addMessage({ text: "Netlist Generation Failed — fix errors before simulating, or hold Shift to proceed.", type: "error", category: "Schematic", mLevel: "user" });
        appState.setOverrideSimulateOnNetlistErrorsOnce(false);
        return false;
      }
    } catch (error) {
      reportError("netlist generation", error);
      appState.setOverrideSimulateOnNetlistErrorsOnce(false);
      return false;
    }
  }

  async function sendToSimulation(shiftPressed: boolean) {
    await synchronizeSimulation(true, shiftPressed);
  }

  export async function synchronizeSimulationNetlist(): Promise<boolean> {
    return synchronizeSimulation(false);
  }

  async function openExport() {
    exportOpen = true;
    svgLoading = true;
    svgContent = null;
    try { svgContent = await editor?.getSvg() ?? null; } catch (error) { reportError("SVG export", error); }
    finally { svgLoading = false; }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (appState.isToBePlottedMode && (event.key === "Escape" || event.key === "§")) {
      event.preventDefault();
      appState.exitToBePlottedMode();
      return;
    }
    const target = event.target as HTMLElement | null;
    const action = resolveSchematicShortcut(event, {
      isTabVisible: appState.mainTabValue === "schematic",
      isFocusInCanvas: !!target && (container.contains(target) || target === document.body),
      isEditableTarget: !!target?.closest("input, textarea, select, [contenteditable='true']"),
      isWithinPropertiesDialog: !!target?.closest("[data-properties-dialog]"),
      isToBePlottedMode: appState.isToBePlottedMode,
      isMoving: appState.isMoving,
    });
    if (!action) return;
    event.preventDefault();
    event.stopPropagation();
    if (action.type === "open-components") {
      document.querySelector<HTMLButtonElement>('[aria-label="Open add component popover"]')?.click();
    } else if (action.type === "open-shortcuts") setTimeout(() => { shortcutsOpen = true; }, 0);
    else if (action.type === "set-mode") setMode(action.mode);
    else if (action.type === "reset-modes") {
      if (appState.editorMode === "none") void command("reset-modes"); else appState.resetSchematicModes();
    } else void command(action.command);
  }

  export async function loadSchematic(schematic: unknown) {
    await readyPromise;
    await editorTask;
    if (!editor) throw new Error("Schematic editor is not ready");
    replacingDocument = true;
    try {
      await editor.loadSchematic(JSON.parse(JSON.stringify(schematic)));
      appState.setCurrentSchematic(await editor.getSchematic());
      appState.setHasSchematicDocument(true);
      lastSimulationSnapshot = "";
      undoDepth = 0;
    } finally { replacingDocument = false; }
    await editor.fitView();
    appState.setHasViewedSchematic(true);
  }

  export async function getSchematic(): Promise<Schematic> {
    await readyPromise;
    await editorTask;
    if (!editor) throw new Error("Schematic editor is not ready");
    return editor.getSchematic();
  }

  export async function clear() {
    await readyPromise;
    await editorTask;
    if (!editor) throw new Error("Schematic editor is not ready");
    replacingDocument = true;
    try {
      await editor.clear();
      appState.setCurrentSchematic(await editor.getSchematic());
      appState.setHasSchematicDocument(false);
      lastSimulationSnapshot = "";
      undoDepth = 0;
    } finally { replacingDocument = false; }
  }

  onMount(() => {
    let cancelled = false;
    let sizeObserver: ResizeObserver | undefined;
    readyPromise = new Promise<void>((resolve) => { resolveReady = resolve; });
    canvas.dataset.canvasReady = "false";
    const initialSchematic = new URLSearchParams(location.search).get("clean") === "true"
      ? blankSchematic
      : appState.currentSchematic ?? demoSchematic;

    const waitForRenderedSize = () => new Promise<void>((resolve) => {
      if (canvas.clientWidth > 0 && canvas.clientHeight > 0) { resolve(); return; }
      sizeObserver = new ResizeObserver(() => {
        if (canvas.clientWidth <= 0 || canvas.clientHeight <= 0) return;
        sizeObserver?.disconnect();
        sizeObserver = undefined;
        resolve();
      });
      sizeObserver.observe(canvas);
    });

    void (async () => {
      await waitForRenderedSize();
      if (cancelled) return;
      replacingDocument = true;
      const instance = await createSchematicEditor({
        canvas,
        // Validate restored documents in a usable blank editor so rejection can recover.
        initialSchematic: blankSchematic,
        theme: appState.isDarkMode ? "dark" : "light",
        inputProfile: appState.inputProfile,
        wheelPanDirections: {
          horizontal: appState.reverseHorizontalWheelPan ? "reversed" : "system",
          vertical: appState.reverseVerticalWheelPan ? "reversed" : "system",
        },
        onEvent: onEditorEvent,
      });
      if (cancelled) { await instance.destroy(); return; }
      try { await instance.loadSchematic(JSON.parse(JSON.stringify(initialSchematic))); }
      catch (error) {
        if (!hasBrowserProject()) { await instance.destroy(); throw error; }
        resetBrowserRecovery(error);
      }
      if (cancelled) { await instance.destroy(); return; }
      editor = instance;
      resolveReady();
      appState.setCurrentSchematic(await instance.getSchematic());
      appState.setHasSchematicDocument(hasBrowserProject() ? appState.hasSchematicDocument && !browserProject.recovering : new URLSearchParams(location.search).get("clean") !== "true");
      replacingDocument = false;
      undoDepth = 0;
      availableComponents = await instance.getAvailableComponents();
      if (!appState.hasViewedSchematic) {
        await instance.fitView();
        appState.setHasViewedSchematic(true);
      }
      canvas.dataset.canvasReady = "true";
      performance.mark("eecircuit:schematic-ready");
      onReady?.();
    })().catch((error) => { resolveReady(); reportError("initialization", error); });

    document.addEventListener("keydown", handleKeydown, true);
    return () => {
      cancelled = true;
      sizeObserver?.disconnect();
      document.removeEventListener("keydown", handleKeydown, true);
      const instance = editor;
      editor = null;
      if (instance) void instance.destroy();
    };
  });

  $effect(() => {
    if (!editor) return;
    const operation = appState.isToBePlottedMode
      ? editor.setMode("select")
      : appState.editorMode === "none" ? editor.resetModes() : editor.setMode(appState.editorMode);
    void operation.catch((error) => reportError("mode update", error));
  });

  $effect(() => {
    if (editor) void editor.setTheme(appState.isDarkMode ? "dark" : "light").catch((error) => reportError("theme update", error));
  });

  $effect(() => {
    if (editor) void editor.setInputProfile(appState.inputProfile).catch((error) => reportError("input profile update", error));
  });

  $effect(() => {
    if (!canvasMessage) return;
    const timer = setTimeout(() => { canvasMessage = null; }, 3000);
    return () => clearTimeout(timer);
  });
</script>

<section class="schematic-workspace">
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div class="canvas-container" id="canvas-container" bind:this={container} role="application" aria-label="Schematic editor" tabindex="0">
    <canvas id="schematic-canvas" bind:this={canvas} data-canvas-ready="false" onclick={handleCanvasClick}></canvas>
    {#if editor && !appState.isToBePlottedMode}
      <SchematicToolbar
        {availableComponents}
        onAddComponent={addComponent}
        onCommand={command}
        onSetMode={setMode}
        onExport={openExport}
        onShortcuts={() => shortcutsOpen = true}
      />
    {/if}
    {#if editor && !appState.isToBePlottedMode && !propertiesDismissed && selectedItem.type !== "none"}
      <PropertiesPanel
        {selectedItem}
        onApply={(name, value) => { void editor?.setSelectedItemNameValue(name, value).catch((error) => reportError("property update", error)); }}
        onClose={() => propertiesDismissed = true}
      />
    {/if}
    {#if canvasMessage}<div class:error={canvasMessage.type === "error"} class="canvas-message">{canvasMessage.text}</div>{/if}
    {#if appState.isToBePlottedMode}
      <div class="selection-overlay">
        <strong>🎯 To-Be-Plotted Selection Active</strong>
        <span>Click a component terminal for current or a wire for voltage. Press Esc when done.</span>
        {#if appState.toBePlotted.length}
          <small>Selected ({appState.toBePlotted.length}): {appState.toBePlotted.map(formatToBePlottedLabel).join(", ")}</small>
        {/if}
      </div>
    {/if}
    <div class="schematic-bottom-bar">
      <output aria-label="Schematic coordinates">X:{formatCoordinate(coord.x)}, Y:{formatCoordinate(coord.y)}</output>
      {#if pointerInfo}
        <output class="pointer-output" aria-label="Schematic pointer information">
          {#if pointerInfo.type === "wire"}<Cable size={16} />
          {:else if pointerInfo.type === "junction"}<CirclePlus size={16} />
          {:else if pointerInfo.type === "instance" || pointerInfo.type === "text"}<LayoutDashboard size={16} />
          {:else if pointerInfo.type === "terminal"}<Square size={16} />{/if}
          <span>{pointerInfo.name} — {pointerInfo.uid}</span>
        </output>
      {/if}
      <button class="simulate-button" aria-label="Simulate Circuit" onclick={(event) => { if (appState.isToBePlottedMode) appState.exitToBePlottedMode(); void sendToSimulation(event.shiftKey); }}>
        <span>Simulate <span class="wide-label">(Netlist)</span></span><ArrowBigRight size={18} />
      </button>
    </div>
  </div>
</section>

<ShortcutsModal bind:open={shortcutsOpen} />
<ExportImageModal bind:open={exportOpen} {svgContent} loading={svgLoading} />

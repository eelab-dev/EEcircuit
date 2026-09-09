<script lang="ts">
  import { onMount, type Component } from "svelte";
  import { Tabs } from "@ark-ui/svelte/tabs";
  import { Activity, BookOpen, Bug, CodeXml, ExternalLink, RotateCcw, Settings, Settings2 } from "@lucide/svelte";
  import type { Schematic } from "eecircuit-schematic";
  import Logo from "./components/Logo.svelte";
  import HeaderActions from "./components/HeaderActions.svelte";
  import Modal from "./components/Modal.svelte";
  import Notifications from "./components/Notifications.svelte";
  import SchematicView from "./schematic/SchematicView.svelte";
  import { appState } from "./state/appState.svelte";
  import { validateEEcircuitFile } from "../utils/eeCircuitFileValidator";
  import { convertEEcircuitV1ToV2, isEEcircuitV1 } from "../utils/convertEEcircuitV1ToV2";
  import type { EEcircuitFile, SimulationType } from "../types/commonTypes";
  import { demoSchematic } from "../schematic/demoSchematic";
  import { createDemoSimulationConfigs } from "../simulation/simulationProfiles";

  type SchematicExports = {
    loadSchematic: (value: unknown) => Promise<void>;
    getSchematic: () => Promise<Schematic>;
    clear: () => Promise<void>;
  };

  let schematic: SchematicExports;
  let shell: HTMLElement;
  let isSaving = $state(false);
  let fullscreen = $state(false);
  let newDialogOpen = $state(false);
  let settingsOpen = $state(false);
  let aboutOpen = $state(false);
  let conversionOpen = $state(false);
  let conversionSource = $state.raw<{ value: unknown; name: string } | null>(null);
  let conversionErrors = $state<string[]>([]);
  let converting = $state(false);
  let settingsCategory = $state<"general" | "simulation" | "plotting">("simulation");
  let dragActive = $state(false);
  let SimulationComponent = $state<Component>();
  let PlotComponent = $state<Component>();
  let simulationActivated = $state(appState.mainTabValue === "simulate");
  let plotActivated = $state(appState.mainTabValue === "plot");
  let primaryUiError = $state<string | null>(null);
  let primaryUiPromise: Promise<void> | undefined;
  let tempMaxWorkers = $state(appState.maxWebWorkers);
  let tempResetVariableSelections = $state(appState.resetVariableSelectionsOnNewSim);
  let tempShowInternalSignals = $state(appState.showInternalSignals);
  let tempLineThickness = $state(appState.lineThickness);
  let tempResetPlotState = $state(appState.resetPlotStateOnNewSim);
  let tempReverseHorizontalWheelPan = $state(appState.reverseHorizontalWheelPan);
  let tempReverseVerticalWheelPan = $state(appState.reverseVerticalWheelPan);

  function ensurePrimaryUi(): Promise<void> {
    if (primaryUiPromise) return primaryUiPromise;
    primaryUiError = null;
    primaryUiPromise = (async () => {
      const [simulationModule, plotModule, simulationRuntime] = await Promise.all([
        import("./simulation/SimulationView.svelte"),
        import("./plot/PlotView.svelte"),
        import("../simulation/parallelSimulation"),
      ]);
      SimulationComponent = simulationModule.default;
      PlotComponent = plotModule.default;
      performance.mark("eecircuit:primary-ui-ready");
      try {
        await simulationRuntime.prewarmSimulationEngine();
      } catch (error) {
        appState.addMessage({
          text: error instanceof Error ? error.message : "Simulation engine prewarming failed.",
          type: "warning",
          category: "Simulation",
          mLevel: "dev",
        });
      }
    })().catch((error: unknown) => {
      primaryUiPromise = undefined;
      primaryUiError = error instanceof Error ? error.message : "Unable to load the simulation and plotting interface.";
      appState.addMessage({
        text: primaryUiError,
        type: "error",
        category: "Simulation",
        mLevel: "user",
      });
      throw error;
    });
    return primaryUiPromise;
  }

  function loadPrimaryUi() {
    void ensurePrimaryUi().catch(() => undefined);
  }

  function handleSchematicReady() {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(loadPrimaryUi, { timeout: 1_500 });
    } else {
      setTimeout(loadPrimaryUi, 0);
    }
  }

  function selectTab(tab: "schematic" | "simulate" | "plot") {
    if (tab === "simulate" && !appState.isSimulationTabEnabled) return;
    if (tab === "plot" && !appState.isPlottingTabEnabled) return;
    if (tab !== "schematic") loadPrimaryUi();
    appState.setMainTabValue(tab);
    if (tab === "schematic" && appState.hasResizedSinceSchematicView) appState.setShouldFitToScreen(true);
  }

  function blockUnavailableTab(event: Event, enabled: boolean) {
    if (enabled) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function blockUnavailableTabKey(event: KeyboardEvent, enabled: boolean) {
    if (event.key === "Enter" || event.key === " ") blockUnavailableTab(event, enabled);
  }

  function openSettings() {
    tempMaxWorkers = appState.maxWebWorkers;
    tempResetVariableSelections = appState.resetVariableSelectionsOnNewSim;
    tempShowInternalSignals = appState.showInternalSignals;
    tempLineThickness = appState.lineThickness;
    tempResetPlotState = appState.resetPlotStateOnNewSim;
    tempReverseHorizontalWheelPan = appState.reverseHorizontalWheelPan;
    tempReverseVerticalWheelPan = appState.reverseVerticalWheelPan;
    settingsOpen = true;
  }

  function saveSettings() {
    appState.setMaxWebWorkers(tempMaxWorkers);
    appState.setResetVariableSelectionsOnNewSim(tempResetVariableSelections);
    appState.setShowInternalSignals(tempShowInternalSignals);
    appState.setLineThickness(tempLineThickness);
    appState.setResetPlotStateOnNewSim(tempResetPlotState);
    appState.setWheelPanDirectionPreferences({
      reverseHorizontalWheelPan: tempReverseHorizontalWheelPan,
      reverseVerticalWheelPan: tempReverseVerticalWheelPan,
    });
    settingsOpen = false;
  }

  async function waitForCanvasReady() {
    if (document.querySelector('[data-canvas-ready="true"]')) return;
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => { observer.disconnect(); reject(new Error("Schematic canvas did not become ready in time.")); }, 5000);
      const observer = new MutationObserver(() => {
        if (document.querySelector('[data-canvas-ready="true"]')) {
          clearTimeout(timeout);
          observer.disconnect();
          resolve();
        }
      });
      observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["data-canvas-ready"] });
    });
  }

  function validFileType(file: File) {
    return file.type === "application/json" || file.type === "text/plain" || /\.(json|txt)$/i.test(file.name);
  }

  async function processFile(file: File) {
    dragActive = false;
    if (!validFileType(file)) {
      appState.addMessage({ text: "Choose a JSON or text EEcircuit file.", type: "error", category: "Schematic", mLevel: "user" });
      return;
    }
    appState.setMainTabValue("schematic");
    appState.setIsSchematicLoading(true);
    appState.setSchematicLoadingMessage("Processing file...");
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error("EEcircuit files must be smaller than 10 MiB.");
      let parsed: unknown;
      try { parsed = JSON.parse(await file.text()); }
      catch { throw new Error("The selected file is not valid JSON."); }
      if (isEEcircuitV1(parsed)) {
        conversionSource = { value: parsed, name: file.name };
        conversionErrors = [];
        conversionOpen = true;
        appState.addMessage({
          text: "EEcircuitV1 is obsolete. Convert this file to EEcircuitV2 before opening it.",
          type: "warning",
          category: "Schematic",
          mLevel: "user",
        });
        return;
      }
      const validation = validateEEcircuitFile(parsed);
      if (!validation.valid) throw new Error(validation.error);
      const data = validation.file;
      if (data.schematic) {
        appState.setSchematicLoadingMessage("Loading schematic...");
        await waitForCanvasReady();
        await schematic.loadSchematic(data.schematic);
      }
      if (data.simulations?.length) {
        appState.setAllSimulationConfigs(data.simulations);
      } else {
        appState.setAllSimulationConfigs([]);
      }
    } catch (error) {
      appState.addMessage({ text: error instanceof Error ? error.message : "Unable to load the selected file.", type: "error", category: "Schematic", mLevel: "user" });
    } finally { appState.setIsSchematicLoading(false); }
  }

  async function saveFile() {
    if (isSaving) return;
    isSaving = true;
    try {
      appState.setMainTabValue("schematic");
      await waitForCanvasReady();
      const latest = await schematic.getSchematic();
      const simulations = appState.allSimulationConfigs.filter((config: SimulationType) => config.type !== "None");
      const data: EEcircuitFile = {
        schema: "EEcircuitV2",
        title: "EEcircuit",
        description: "EEcircuit Schematic",
        date: new Date().toISOString(),
        schematic: latest,
        simulations: simulations.length ? simulations : undefined,
      };
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `EEcircuit-${new Date().toISOString()}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      appState.addMessage({ text: "EEcircuit file saved.", type: "success", category: "Schematic", mLevel: "user" });
    } catch (error) {
      appState.addMessage({ text: error instanceof Error ? error.message : "Unable to save file.", type: "error", category: "Schematic", mLevel: "user" });
    } finally { isSaving = false; }
  }

  function closeConversion() {
    conversionOpen = false;
    conversionSource = null;
    conversionErrors = [];
  }

  async function convertLegacyFile() {
    if (!conversionSource || converting) return;
    converting = true;
    conversionErrors = [];
    try {
      const result = await convertEEcircuitV1ToV2(conversionSource.value);
      if (!result.success) {
        conversionErrors = result.errors;
        return;
      }
      const url = URL.createObjectURL(new Blob([JSON.stringify(result.file, null, 2)], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      const baseName = conversionSource.name.replace(/\.(json|txt)$/i, "");
      anchor.download = `${baseName}-v2.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      appState.addMessage({
        text: `Converted ${conversionSource.name} to EEcircuitV2. Open the downloaded file to load it.`,
        type: "success",
        category: "Schematic",
        mLevel: "user",
      });
      closeConversion();
    } catch (error) {
      conversionErrors = [error instanceof Error ? error.message : "Unable to convert this file."];
    } finally {
      converting = false;
    }
  }

  async function toggleFullscreen() {
    type NavigatorWithKeyboard = Navigator & { keyboard?: { lock?: (keys?: string[]) => Promise<void>; unlock?: () => void } };
    const keyboard = (navigator as NavigatorWithKeyboard).keyboard;
    try {
      if (document.fullscreenElement) {
        keyboard?.unlock?.();
        await document.exitFullscreen();
        return;
      }
      await document.documentElement.requestFullscreen();
      if (keyboard?.lock) {
        try { await keyboard.lock(["Escape"]); }
        catch { appState.addMessage({ text: "Fullscreen is active, but this browser could not lock the Escape key.", type: "warning", category: "Schematic", mLevel: "user" }); }
      } else {
        const shortcut = /Mac|iPhone|iPad/.test(navigator.userAgent) ? "Control+Command+F" : "F11";
        appState.addMessage({ text: `Browser keyboard lock is unavailable. Use ${shortcut} if you need browser-level fullscreen.`, type: "warning", category: "Schematic", mLevel: "user" });
      }
    } catch (error) {
      appState.addMessage({ text: error instanceof Error ? error.message : "Fullscreen is unavailable.", type: "warning", category: "Schematic", mLevel: "user" });
    }
  }

  function clearLocalData() {
    if (!window.confirm("Are you sure you want to clear all local storage? This will reset all application settings and data.")) return;
    localStorage.clear();
    location.reload();
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) void processFile(file); else dragActive = false;
  }

  onMount(() => {
    const onFullscreenChange = () => { fullscreen = !!document.fullscreenElement; };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  });

  $effect(() => {
    if (appState.mainTabValue === "simulate") {
      simulationActivated = true;
      loadPrimaryUi();
    } else if (appState.mainTabValue === "plot") {
      plotActivated = true;
      loadPrimaryUi();
    }
  });
</script>

<svelte:head><title>EEcircuit</title></svelte:head>

<main
  class="app-shell"
  data-ui-runtime="svelte"
  bind:this={shell}
  ondragover={(event) => { event.preventDefault(); if (event.dataTransfer?.types.includes("Files")) dragActive = true; }}
  ondragleave={(event) => { if (!shell.contains(event.relatedTarget as Node | null)) dragActive = false; }}
  ondrop={handleDrop}
>
  <Tabs.Root class="app-tabs-root" value={appState.mainTabValue} onValueChange={(details) => selectTab(details.value as "schematic" | "simulate" | "plot")}>
  <header class="main-header">
    <Logo />
    <Tabs.List class="main-tabs" aria-label="EEcircuit workspaces">
      <Tabs.Trigger value="schematic" aria-label="Schematic">Schematic</Tabs.Trigger>
      <span class:disabled={!appState.isSimulationTabEnabled} class="disabled-tab-wrap">
        <Tabs.Trigger value="simulate" aria-label="simulation config" aria-disabled={!appState.isSimulationTabEnabled} onclick={(event) => blockUnavailableTab(event, appState.isSimulationTabEnabled)} onkeydown={(event) => blockUnavailableTabKey(event, appState.isSimulationTabEnabled)}>Simulation</Tabs.Trigger>
        {#if !appState.isSimulationTabEnabled}<span class="disabled-tab-tooltip" role="tooltip">Click Simulate on the schematic to generate a netlist first.</span>{/if}
      </span>
      <span class:disabled={!appState.isPlottingTabEnabled} class="disabled-tab-wrap">
        <Tabs.Trigger value="plot" aria-label="plot display" aria-disabled={!appState.isPlottingTabEnabled} onclick={(event) => blockUnavailableTab(event, appState.isPlottingTabEnabled)} onkeydown={(event) => blockUnavailableTabKey(event, appState.isPlottingTabEnabled)}>Plotting</Tabs.Trigger>
        {#if !appState.isPlottingTabEnabled}<span class="disabled-tab-tooltip" role="tooltip">Run a successful simulation to create plot results first.</span>{/if}
      </span>
    </Tabs.List>
    <HeaderActions
      {isSaving}
      isDarkMode={appState.isDarkMode}
      inputProfile={appState.inputProfile}
      {fullscreen}
      onNew={() => newDialogOpen = true}
      onOpen={processFile}
      onSave={saveFile}
      onToggleTheme={appState.toggleTheme}
      onToggleInput={appState.toggleInputProfile}
      onFullscreen={toggleFullscreen}
      onSettings={openSettings}
      onAbout={() => aboutOpen = true}
    />
  </header>

  <div class="workspace-stack">
    <div role="tabpanel" class:hidden={appState.mainTabValue !== "schematic"} class="workspace-panel">
      <SchematicView bind:this={schematic} onReady={handleSchematicReady} />
      {#if appState.isSchematicLoading}
        <div class="loading-overlay" role="status"><div class="loading-card"><span class="spinner"></span><span>{appState.schematicLoadingMessage}</span></div></div>
      {/if}
    </div>
    {#if simulationActivated}
      <div role="tabpanel" aria-hidden={appState.mainTabValue !== "simulate"} class:hidden={appState.mainTabValue !== "simulate"} class="workspace-panel">
        {#if SimulationComponent}
          <SimulationComponent />
        {:else if primaryUiError}
          <div class="feature-loading feature-load-error" role="alert"><span>{primaryUiError}</span><button onclick={loadPrimaryUi}>Retry</button></div>
        {:else}
          <div class="feature-loading" data-tab-panel-loading="simulation">Loading simulation tools…</div>
        {/if}
      </div>
    {/if}
    {#if plotActivated}
      <div role="tabpanel" aria-hidden={appState.mainTabValue !== "plot"} class:hidden={appState.mainTabValue !== "plot"} class="workspace-panel">
        {#if PlotComponent}
          <PlotComponent />
        {:else if primaryUiError}
          <div class="feature-loading feature-load-error" role="alert"><span>{primaryUiError}</span><button onclick={loadPrimaryUi}>Retry</button></div>
        {:else}
          <div class="feature-loading" data-tab-panel-loading="plot">Loading plot tools…</div>
        {/if}
      </div>
    {/if}
  </div>

  {#if dragActive}<div class="drop-overlay">Drop EEcircuit file here</div>{/if}
  <Notifications />
  </Tabs.Root>
</main>

<Modal bind:open={newDialogOpen} title="Create New Schematic" closeLabel="Close new schematic dialog">
  <p>Start with an empty canvas or load the demonstration circuit. Unsaved work will be replaced.</p>
  {#snippet footer()}
    <button onclick={() => newDialogOpen = false}>Cancel</button>
    <button class="primary-button" onclick={async () => {
      await schematic.loadSchematic(demoSchematic);
      appState.setAllSimulationConfigs(createDemoSimulationConfigs());
      newDialogOpen = false;
    }}>Load Demo</button>
    <button class="danger-button" onclick={async () => {
      await schematic.clear();
      appState.setAllSimulationConfigs([]);
      newDialogOpen = false;
    }}>New Empty Schematic</button>
  {/snippet}
</Modal>

<Modal bind:open={conversionOpen} title="Obsolete EEcircuit file" closeLabel="Cancel V1 conversion">
  <p>EEcircuitV1 is obsolete. Convert this file to EEcircuitV2 before opening it.</p>
  <p>The conversion downloads a new file and does not replace the circuit currently open.</p>
  {#if conversionErrors.length}
    <div role="alert">
      <strong>Conversion failed</strong>
      <ul>{#each conversionErrors as error, index (`${index}:${error}`)}<li>{error}</li>{/each}</ul>
    </div>
  {/if}
  {#snippet footer()}
    <button disabled={converting} onclick={closeConversion}>Cancel</button>
    <button class="primary-button" disabled={converting} onclick={convertLegacyFile}>
      {converting ? "Converting…" : "Convert and download"}
    </button>
  {/snippet}
</Modal>

<Modal bind:open={settingsOpen} title="Settings" contentClass="settings-modal">
  <div class="settings-layout">
    <nav class="settings-nav" aria-label="Settings categories">
      <button aria-label="General Settings" class:active={settingsCategory === "general"} aria-current={settingsCategory === "general" ? "page" : undefined} onclick={() => settingsCategory = "general"}>
        <Settings size={18} /><span><strong>General</strong><small>Interface and diagnostics</small></span>
      </button>
      <button aria-label="Simulation Settings" class:active={settingsCategory === "simulation"} aria-current={settingsCategory === "simulation" ? "page" : undefined} onclick={() => settingsCategory = "simulation"}>
        <Activity size={18} /><span><strong>Simulation</strong><small>Workers and run behavior</small></span>
      </button>
      <button aria-label="Plotting Settings" class:active={settingsCategory === "plotting"} aria-current={settingsCategory === "plotting" ? "page" : undefined} onclick={() => settingsCategory = "plotting"}>
        <Settings2 size={18} /><span><strong>Plotting</strong><small>Signals and appearance</small></span>
      </button>
    </nav>
    <section class="settings-panel">
      {#if settingsCategory === "general"}
        <header class="settings-panel-heading"><h3>General</h3><p>Control input behavior and developer feedback.</p></header>
        <div class="settings-list">
          <label class="setting-row setting-row-inline">
            <span class="setting-copy"><strong>Developer messages</strong><small>Show technical status messages alongside user-facing notifications.</small></span>
            <input type="checkbox" checked={appState.showDevMessages} onchange={(event) => appState.setShowDevMessages(event.currentTarget.checked)} />
          </label>
          <label class="setting-row setting-row-inline">
            <span class="setting-copy"><strong>Reverse horizontal panning</strong><small>Reverse horizontal wheel and trackpad panning on the schematic.</small></span>
            <input aria-label="Reverse horizontal panning" type="checkbox" bind:checked={tempReverseHorizontalWheelPan} />
          </label>
          <label class="setting-row setting-row-inline">
            <span class="setting-copy"><strong>Reverse vertical panning</strong><small>Reverse vertical wheel and trackpad panning on the schematic.</small></span>
            <input aria-label="Reverse vertical panning" type="checkbox" bind:checked={tempReverseVerticalWheelPan} />
          </label>
          <p class="settings-reload-note">Reload required for pan-direction changes.</p>
          <div class="setting-row">
            <span class="setting-copy"><strong>Data management</strong><small>Clear locally stored settings and simulation state from this browser.</small></span>
            <button class="danger-outline-button" onclick={clearLocalData}>Clear Local Storage</button>
          </div>
        </div>
      {:else if settingsCategory === "simulation"}
        <header class="settings-panel-heading"><h3>Simulation</h3><p>Tune parallel execution and what is retained between runs.</p></header>
        <div class="settings-list">
          <label class="setting-row">
            <span class="setting-copy"><strong>Maximum parallel workers</strong><small>Higher values can speed up bracket sweeps but use more system resources.</small></span>
            <span class="number-control"><input aria-label="Maximum simulation workers" type="number" min="1" max={navigator.hardwareConcurrency || 8} bind:value={tempMaxWorkers} /><small>Maximum {navigator.hardwareConcurrency || 8} on this device</small></span>
          </label>
          <label class="setting-row setting-row-inline">
            <span class="setting-copy"><strong>Reset variable selection</strong><small>Select all available output variables when a new simulation starts.</small></span>
            <input type="checkbox" bind:checked={tempResetVariableSelections} />
          </label>
        </div>
      {:else}
        <header class="settings-panel-heading"><h3>Plotting</h3><p>Choose signal visibility and the default plot appearance.</p></header>
        <div class="settings-list">
          <label class="setting-row setting-row-inline">
            <span class="setting-copy"><strong>Show internal subcircuit signals</strong><small>Include internal subcircuit nodes in the variable list.</small></span>
            <input type="checkbox" bind:checked={tempShowInternalSignals} />
          </label>
          <label class="setting-row">
            <span class="setting-copy"><strong>Line thickness</strong><small>Adjust the stroke width used for every plotted signal.</small></span>
            <span class="range-control"><input aria-label="Plot line thickness" type="range" min="1" max="10" step="1" bind:value={tempLineThickness} /><output>{tempLineThickness}px</output></span>
          </label>
          <label class="setting-row setting-row-inline">
            <span class="setting-copy"><strong>Reset plot state</strong><small>Return to a single canvas and linear scales for each new run.</small></span>
            <input type="checkbox" bind:checked={tempResetPlotState} />
          </label>
          <div class="settings-reset-actions">
            <button title="Reset variable selections to default" onclick={appState.resetVariableSelections}><RotateCcw size={15} />Reset variables</button>
            <button title="Reset plot settings to default" onclick={appState.resetPlotState}><RotateCcw size={15} />Reset plot</button>
          </div>
        </div>
      {/if}
    </section>
  </div>
  {#snippet footer()}<button onclick={() => settingsOpen = false}>Cancel</button><button class="primary-button" onclick={saveSettings}>Save changes</button>{/snippet}
</Modal>

<Modal bind:open={aboutOpen} title="About EEcircuit" contentClass="about-modal">
  <div class="about-list">
    <section><BookOpen size={19} /><div><strong>Need help?</strong><p>Find comprehensive guides and documentation at <a href="https://help.eecircuit.com" target="_blank" rel="noreferrer">help.eecircuit.com <ExternalLink size={12} /></a>.</p></div></section>
    <section><CodeXml size={19} /><div><strong>Open Source</strong><p>Explore the code and contribute through the <a href="https://github.com/eelab-dev/EEcircuit" target="_blank" rel="noreferrer">GitHub repository <ExternalLink size={12} /></a>.</p></div></section>
    <section><Bug size={19} /><div><strong>Found a bug?</strong><p>Report reproducible problems through the <a href="https://github.com/eelab-dev/EEcircuit/issues" target="_blank" rel="noreferrer">Issue Tracker <ExternalLink size={12} /></a>.</p></div></section>
  </div>
  {#snippet footer()}<button class="primary-button" onclick={() => aboutOpen = false}>Okay</button>{/snippet}
</Modal>

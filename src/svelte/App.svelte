<script lang="ts">
  import { onMount, type Component } from "svelte";
  import { Activity, RotateCcw, Settings, Settings2 } from "@lucide/svelte";
  import type { Schematic } from "eecircuit-schematic";
  import Logo from "./components/Logo.svelte";
  import HeaderActions from "./components/HeaderActions.svelte";
  import Modal from "./components/Modal.svelte";
  import SchematicView from "./schematic/SchematicView.svelte";
  import { appState } from "./state/appState.svelte";
  import { validateEEcircuitFile } from "../utils/eeCircuitFileValidator";
  import type { EEcircuitFile, SimulationType } from "../types/commonTypes";
  import { demoSchematic } from "../schematic/demoSchematic";

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
  let settingsCategory = $state<"general" | "simulation" | "plotting">("simulation");
  let dragActive = $state(false);
  let SimulationComponent = $state<Component>();
  let PlotComponent = $state<Component>();
  let primaryUiPromise: Promise<void> | undefined;
  let tempMaxWorkers = $state(appState.maxWebWorkers);
  let tempResetVariableSelections = $state(appState.resetVariableSelectionsOnNewSim);
  let tempShowInternalSignals = $state(appState.showInternalSignals);
  let tempLineThickness = $state(appState.lineThickness);
  let tempResetPlotState = $state(appState.resetPlotStateOnNewSim);

  const activeMessages = $derived(
    appState.messages.filter((message) => appState.showDevMessages || message.mLevel !== "dev").slice(-4),
  );

  function ensurePrimaryUi(): Promise<void> {
    if (primaryUiPromise) return primaryUiPromise;
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
    })();
    return primaryUiPromise;
  }

  function handleSchematicReady() {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(() => void ensurePrimaryUi(), { timeout: 1_500 });
    } else {
      setTimeout(() => void ensurePrimaryUi(), 0);
    }
  }

  function selectTab(tab: "schematic" | "simulate" | "plot") {
    if (tab === "simulate" && !appState.isSimulationTabEnabled) return;
    if (tab === "plot" && !appState.isPlottingTabEnabled) return;
    if (tab !== "schematic") void ensurePrimaryUi();
    appState.setMainTabValue(tab);
    if (tab === "schematic" && appState.hasResizedSinceSchematicView) appState.setShouldFitToScreen(true);
  }

  function openSettings() {
    tempMaxWorkers = appState.maxWebWorkers;
    tempResetVariableSelections = appState.resetVariableSelectionsOnNewSim;
    tempShowInternalSignals = appState.showInternalSignals;
    tempLineThickness = appState.lineThickness;
    tempResetPlotState = appState.resetPlotStateOnNewSim;
    settingsOpen = true;
  }

  function saveSettings() {
    appState.setMaxWebWorkers(tempMaxWorkers);
    appState.setResetVariableSelectionsOnNewSim(tempResetVariableSelections);
    appState.setShowInternalSignals(tempShowInternalSignals);
    appState.setLineThickness(tempLineThickness);
    appState.setResetPlotStateOnNewSim(tempResetPlotState);
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
        appState.setSelectedSimType(data.simulations[0]!.type);
        appState.setSimulationConfig(data.simulations[0]);
      } else {
        appState.setAllSimulationConfigs([]);
        appState.setSimulationConfig(undefined);
        appState.setSelectedSimType("None");
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
        schema: "EEcircuitV1",
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

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (error) {
      appState.addMessage({ text: error instanceof Error ? error.message : "Fullscreen is unavailable.", type: "warning", category: "Schematic", mLevel: "user" });
    }
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
  <header class="main-header">
    <Logo />
    <div class="main-tabs" role="tablist" aria-label="EEcircuit workspaces">
      <button role="tab" aria-selected={appState.mainTabValue === "schematic"} class:active={appState.mainTabValue === "schematic"} onclick={() => selectTab("schematic")}>Schematic</button>
      <button role="tab" aria-label="simulation config" aria-selected={appState.mainTabValue === "simulate"} class:active={appState.mainTabValue === "simulate"} disabled={!appState.isSimulationTabEnabled} onclick={() => selectTab("simulate")}>Simulation</button>
      <button role="tab" aria-label="plot display" aria-selected={appState.mainTabValue === "plot"} class:active={appState.mainTabValue === "plot"} disabled={!appState.isPlottingTabEnabled} onclick={() => selectTab("plot")}>Plotting</button>
    </div>
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
    {#if appState.mainTabValue === "simulate"}
      <div role="tabpanel" class="workspace-panel">
        {#if SimulationComponent}<SimulationComponent />{:else}<div class="feature-loading" data-tab-panel-loading="simulation">Loading simulation tools…</div>{/if}
      </div>
    {/if}
    {#if appState.mainTabValue === "plot"}
      <div role="tabpanel" class="workspace-panel">
        {#if PlotComponent}<PlotComponent />{:else}<div class="feature-loading" data-tab-panel-loading="plot">Loading plot tools…</div>{/if}
      </div>
    {/if}
  </div>

  {#if dragActive}<div class="drop-overlay">Drop EEcircuit file here</div>{/if}
  <div class="toast-stack" aria-live="polite">
    {#each activeMessages as message (message.id)}
      <div class:error={message.type === "error"} class:warning={message.type === "warning"} class:success={message.type === "success"} class="toast">
        <span>{message.text}</span><button aria-label="Dismiss message" onclick={() => appState.removeMessage(message.id)}>×</button>
      </div>
    {/each}
  </div>
</main>

<Modal bind:open={newDialogOpen} title="Create New Schematic" closeLabel="Close new schematic dialog">
  <p>Start with an empty canvas or load the demonstration circuit. Unsaved work will be replaced.</p>
  {#snippet footer()}
    <button onclick={() => newDialogOpen = false}>Cancel</button>
    <button class="primary-button" onclick={async () => { await schematic.loadSchematic(demoSchematic); newDialogOpen = false; }}>Load Demo</button>
    <button class="danger-button" onclick={async () => { await schematic.clear(); newDialogOpen = false; }}>New Empty Schematic</button>
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
        <header class="settings-panel-heading"><h3>General</h3><p>Control interface diagnostics and developer feedback.</p></header>
        <div class="settings-list">
          <label class="setting-row setting-row-inline">
            <span class="setting-copy"><strong>Developer messages</strong><small>Show technical status messages alongside user-facing notifications.</small></span>
            <input type="checkbox" checked={appState.showDevMessages} onchange={(event) => appState.setShowDevMessages(event.currentTarget.checked)} />
          </label>
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
            <span class="range-control"><input aria-label="Plot line thickness" type="range" min="1" max="8" step="1" bind:value={tempLineThickness} /><output>{tempLineThickness}px</output></span>
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

<Modal bind:open={aboutOpen} title="About EEcircuit">
  <p>EEcircuit is a browser-based circuit editor and ngspice simulator. Schematics, simulation, and plotting run locally in your browser.</p>
</Modal>

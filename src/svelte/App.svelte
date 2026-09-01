<script lang="ts">
  import { onMount } from "svelte";
  import type { Schematic } from "eecircuit-schematic";
  import Logo from "./components/Logo.svelte";
  import HeaderActions from "./components/HeaderActions.svelte";
  import Modal from "./components/Modal.svelte";
  import SchematicView from "./schematic/SchematicView.svelte";
  import SimulationView from "./simulation/SimulationView.svelte";
  import PlotView from "./plot/PlotView.svelte";
  import { appState } from "./state/appState.svelte";
  import { validateEEcircuitFile } from "../utils/eeCircuitFileValidator";
  import type { EEcircuitFile, SimulationType } from "../types/commonTypes";

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
  let dragActive = $state(false);

  const activeMessages = $derived(
    appState.messages.filter((message) => appState.showDevMessages || message.mLevel !== "dev").slice(-4),
  );

  function selectTab(tab: "schematic" | "simulate" | "plot") {
    if (tab === "simulate" && !appState.isSimulationTabEnabled) return;
    if (tab === "plot" && !appState.isPlottingTabEnabled) return;
    appState.setMainTabValue(tab);
    if (tab === "schematic" && appState.hasResizedSinceSchematicView) appState.setShouldFitToScreen(true);
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
      onSettings={() => settingsOpen = true}
      onAbout={() => aboutOpen = true}
    />
  </header>

  <div class="workspace-stack">
    <div role="tabpanel" class:hidden={appState.mainTabValue !== "schematic"} class="workspace-panel">
      <SchematicView bind:this={schematic} />
      {#if appState.isSchematicLoading}
        <div class="loading-overlay" role="status"><div class="loading-card"><span class="spinner"></span><span>{appState.schematicLoadingMessage}</span></div></div>
      {/if}
    </div>
    {#if appState.mainTabValue === "simulate"}
      <div role="tabpanel" class="workspace-panel"><SimulationView /></div>
    {/if}
    {#if appState.mainTabValue === "plot"}
      <div role="tabpanel" class="workspace-panel"><PlotView /></div>
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
    <button class="primary-button" onclick={async () => { const { demoSchematic } = await import("../schematic/demoSchematic"); await schematic.loadSchematic(demoSchematic); newDialogOpen = false; }}>Load Demo</button>
    <button class="danger-button" onclick={async () => { await schematic.clear(); newDialogOpen = false; }}>New Empty Schematic</button>
  {/snippet}
</Modal>

<Modal bind:open={settingsOpen} title="Settings">
  <div class="settings-list">
    <label>Maximum simulation workers<input type="number" min="1" max={navigator.hardwareConcurrency || 8} value={appState.maxWebWorkers} onchange={(event) => appState.setMaxWebWorkers(Number(event.currentTarget.value))} /></label>
    <label class="check-row"><input type="checkbox" checked={appState.showDevMessages} onchange={(event) => appState.setShowDevMessages(event.currentTarget.checked)} />Show developer messages</label>
    <label class="check-row"><input type="checkbox" checked={appState.resetVariableSelectionsOnNewSim} onchange={(event) => appState.setResetVariableSelectionsOnNewSim(event.currentTarget.checked)} />Reset variable selection for each run</label>
  </div>
  {#snippet footer()}<button class="primary-button" onclick={() => settingsOpen = false}>Save</button>{/snippet}
</Modal>

<Modal bind:open={aboutOpen} title="About EEcircuit">
  <p>EEcircuit is a browser-based circuit editor and ngspice simulator. Schematics, simulation, and plotting run locally in your browser.</p>
</Modal>

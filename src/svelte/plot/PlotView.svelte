<script lang="ts">
  import type { SharedPlotTransform } from "../../utils/plotCoordinates";
  import { onMount } from "svelte";
  import { ChevronRight, Download, Pin, PinOff, SlidersHorizontal } from "@lucide/svelte";
  import { filterInternalSignals } from "../../components/ScientificPlot/utils/resultFiltering";
  import { exportResultsToCSV } from "../../utils/csvExport";
  import { formatEngineering, parseSpiceNumber } from "../../components/ScientificPlot/utils/formatUtils";
  import { appState } from "../state/appState.svelte";
  import WebglPlotCanvas from "./WebglPlotCanvas.svelte";

  let sidebarOpen = $state(true);
  let sidebarPinned = $state(true);
  let desktopPinnedPreference = true;
  let isMobile = $state(false);
  let cursorEnabled = $state(false);
  let sharedCursorX = $state<number | null>(null);
  let snapCanvas1 = $state(false);
  let snapCanvas2 = $state(false);
  let emphasized = $state(0);
  let sharedXTransform = $state<SharedPlotTransform | undefined>();
  let filteredResults = $derived(filterInternalSignals(appState.results, appState.showInternalSignals));
  let result = $derived(filteredResults[0]);
  let variables = $derived(result?.variableNames.slice(1) ?? []);
  let acMode = $derived(appState.plotAnalysis === "AC");
  let noiseMode = $derived(appState.plotAnalysis === "Noise");
  let canvasCount = $derived(acMode ? 2 : noiseMode ? 1 : appState.numCanvases);
  let canvas1Available = $derived(acMode ? variables.filter((name) => !name.toLowerCase().includes("[phase]")) : variables);
  let canvas2Available = $derived(acMode ? variables.filter((name) => name.toLowerCase().includes("[phase]")) : variables);
  let progressPercent = $derived(
    Math.min(100, Math.max(0,
      (appState.parallelSimulationProgress.completed / Math.max(1, appState.parallelSimulationProgress.total)) * 100,
    )),
  );
  let activeThreads = $derived(
    appState.parallelSimulationProgress.threads.filter((thread) =>
      thread.totalAssignedSimulations > 0 || thread.completedSimulations > 0 || thread.isRunning
    ),
  );

  function toggle(list: string[], name: string, setter: (values: string[]) => void) {
    setter(list.includes(name) ? list.filter((item) => item !== name) : [...list, name]);
  }

  function selectedForCanvas1() {
    return canvasCount === 1 ? appState.selectedVariables : appState.canvas1SelectedVariables;
  }

  function setCanvas1Hovered(name: string | null) {
    if (canvasCount === 1) appState.setHoveredVariable(name);
    else appState.setCanvas1HoveredVariable(name);
  }

  function togglePin() {
    sidebarPinned = !sidebarPinned;
    desktopPinnedPreference = sidebarPinned;
    if (!sidebarPinned) sidebarOpen = false;
  }

  onMount(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = (mobile: boolean) => {
      const changed = mobile !== isMobile;
      isMobile = mobile;
      if (!changed) return;
      if (mobile) {
        sidebarPinned = false;
        sidebarOpen = false;
      } else {
        sidebarPinned = desktopPinnedPreference;
        sidebarOpen = true;
      }
    };
    update(media.matches);
    const onChange = (event: MediaQueryListEvent) => update(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  });

  $effect(() => {
    // A transform belongs to one simulation and one uninterrupted X-axis mode.
    appState.plotGeneration;
    appState.isLogX;
    sharedXTransform = undefined;
    sharedCursorX = null;
  });

  $effect(() => {
    const count = appState.bracketOperationResults?.parameterValues?.length ?? 0;
    if (!count) emphasized = 0;
    else if (emphasized >= count) emphasized = count - 1;
  });
</script>

<section class="plot-workspace">
  {#if appState.isBracketOperationPlot && appState.bracketOperationResults?.parameterValues?.length}
    <div class="bracket-slider"><strong>Parameter:</strong><input type="range" min="0" max={appState.bracketOperationResults.parameterValues.length - 1} bind:value={emphasized} /><span>{formatEngineering(parseSpiceNumber(appState.bracketOperationResults.parameterValues[emphasized] ?? "0"))}</span></div>
  {/if}
  <div class="plot-toolbar">
    {#if !acMode && !noiseMode}<span>Mode:</span><button class:active={canvasCount === 1} onclick={() => appState.setNumCanvases(1)}>Single</button><button class:active={canvasCount === 2} onclick={() => appState.setNumCanvases(2)}>Dual</button>{/if}
    <span>Cursor:</span><button class:active={cursorEnabled} aria-label="Toggle cursor" aria-pressed={cursorEnabled} onclick={() => { cursorEnabled = !cursorEnabled; if (!cursorEnabled) sharedCursorX = null; }}>{cursorEnabled ? "Hide" : "Show"}</button>
    <span>Scale:</span><button class:active={appState.isLogX} aria-label="Log X" aria-pressed={appState.isLogX} onclick={appState.toggleLogX}>Log X</button>
    {#if canvasCount === 1}<button class:active={appState.isLogY} aria-label="Log Y" aria-pressed={appState.isLogY} onclick={appState.toggleLogY}>Log Y</button>{:else}<button class:active={appState.isLogY1} aria-label="Log Y1" aria-pressed={appState.isLogY1} onclick={appState.toggleLogY1}>Log Y1</button><button class:active={appState.isLogY2} aria-label="Log Y2" aria-pressed={appState.isLogY2} onclick={appState.toggleLogY2}>Log Y2</button>{/if}
  </div>

  <div class:with-sidebar={sidebarOpen && !isMobile && sidebarPinned} class="plot-body">
    <div class:dual={canvasCount === 2} class="plot-canvases">
      {#if result}
        <div class="plot-canvas-wrap">
          {#if canvasCount === 2}<h3>{acMode ? "Magnitude" : "Plot 1"}</h3>{/if}
          <WebglPlotCanvas
            {result}
            generation={appState.plotGeneration}
            canvasId={1}
            selectedVariables={selectedForCanvas1()}
            isDarkMode={appState.isDarkMode}
            isLogX={appState.isLogX}
            isLogY={canvasCount === 1 ? appState.isLogY : appState.isLogY1}
            inputProfile={appState.inputProfile}
            lineThickness={appState.lineThickness}
            emphasizedPlotIndex={emphasized}
            externalXTransform={sharedXTransform}
            onXTransform={(transform) => sharedXTransform = { ...transform, revision: (sharedXTransform?.revision ?? 0) + 1 }}
            {cursorEnabled}
            externalCursorX={sharedCursorX}
            onCursorX={(x) => sharedCursorX = x}
            snapToLines={snapCanvas1}
            onSnapToLinesChange={(value) => snapCanvas1 = value}
            hoveredVariable={canvasCount === 1 ? appState.hoveredVariable : appState.canvas1HoveredVariable}
          />
        </div>
        {#if canvasCount === 2}
          <div class="plot-canvas-wrap">
            <h3>{acMode ? "Phase" : "Plot 2"}</h3>
            <WebglPlotCanvas
              {result}
              generation={appState.plotGeneration}
              canvasId={2}
              selectedVariables={appState.canvas2SelectedVariables}
              isDarkMode={appState.isDarkMode}
              isLogX={appState.isLogX}
              isLogY={appState.isLogY2}
              inputProfile={appState.inputProfile}
              lineThickness={appState.lineThickness}
              emphasizedPlotIndex={emphasized}
              externalXTransform={sharedXTransform}
              onXTransform={(transform) => sharedXTransform = { ...transform, revision: (sharedXTransform?.revision ?? 0) + 1 }}
              {cursorEnabled}
              externalCursorX={sharedCursorX}
              onCursorX={(x) => sharedCursorX = x}
              snapToLines={snapCanvas2}
              onSnapToLinesChange={(value) => snapCanvas2 = value}
              hoveredVariable={appState.canvas2HoveredVariable}
            />
          </div>
        {/if}
      {/if}
    </div>

    <button
      class="plot-sidebar-toggle"
      class:shifted={sidebarOpen && !isMobile && sidebarPinned}
      aria-label={sidebarOpen ? "Close plot variables" : "Open plot variables"}
      aria-expanded={sidebarOpen}
      onclick={() => sidebarOpen = !sidebarOpen}
    >
      {#if sidebarOpen}<ChevronRight size={17} />{:else}<SlidersHorizontal size={17} />{/if}
    </button>

    {#if sidebarOpen && result}
      {#if isMobile}<button class="plot-sidebar-backdrop" aria-label="Dismiss plot variables" onclick={() => sidebarOpen = false}></button>{/if}
      <aside class:overlay={isMobile || !sidebarPinned} class="plot-sidebar">
        <header>
          <strong>Plot Variables</strong>
          <span class="plot-sidebar-header-actions">
            {#if !isMobile}<button aria-label={sidebarPinned ? "Unpin drawer" : "Pin drawer"} title={sidebarPinned ? "Unpin drawer" : "Pin drawer"} onclick={togglePin}>{#if sidebarPinned}<Pin size={15} />{:else}<PinOff size={15} />{/if}</button>{/if}
            {#if isMobile || !sidebarPinned}<button aria-label="Close sidebar" onclick={() => sidebarOpen = false}><ChevronRight size={16} /></button>{/if}
          </span>
        </header>
        <div class="plot-sidebar-scroll">
          <small>X-axis: {result.variableNames[0]}</small>
          <section><h4>{canvasCount === 2 ? (acMode ? "Magnitude" : "Plot 1") : "Signals"}</h4><div class="selection-actions"><button onclick={() => canvasCount === 1 ? appState.setSelectedVariables(canvas1Available) : appState.setCanvas1SelectedVariables(canvas1Available)}>All</button><button onclick={() => canvasCount === 1 ? appState.setSelectedVariables([]) : appState.setCanvas1SelectedVariables([])}>None</button></div>
            {#each canvas1Available as name (name)}<label onmouseenter={() => setCanvas1Hovered(name)} onmouseleave={() => setCanvas1Hovered(null)}><input type="checkbox" checked={selectedForCanvas1().includes(name)} onchange={() => toggle(selectedForCanvas1(), name, canvasCount === 1 ? appState.setSelectedVariables : appState.setCanvas1SelectedVariables)} /><span>{name}</span></label>{/each}
          </section>
          {#if canvasCount === 2}<section><h4>{acMode ? "Phase" : "Plot 2"}</h4><div class="selection-actions"><button onclick={() => appState.setCanvas2SelectedVariables(canvas2Available)}>All</button><button onclick={() => appState.setCanvas2SelectedVariables([])}>None</button></div>{#each canvas2Available as name (name)}<label onmouseenter={() => appState.setCanvas2HoveredVariable(name)} onmouseleave={() => appState.setCanvas2HoveredVariable(null)}><input type="checkbox" checked={appState.canvas2SelectedVariables.includes(name)} onchange={() => toggle(appState.canvas2SelectedVariables, name, appState.setCanvas2SelectedVariables)} /><span>{name}</span></label>{/each}</section>{/if}
        </div>
        <footer><button class="primary-button csv-download-button" onclick={() => exportResultsToCSV(filteredResults)}><Download size={15} />Download CSV</button></footer>
      </aside>
    {/if}
  </div>

  {#if appState.isParallelSimulationRunning}
    <aside class="plot-progress-overlay" aria-label="Parallel simulation progress">
      <header><strong>Parallel Simulation</strong><span>{appState.parallelSimulationProgress.completed}/{appState.parallelSimulationProgress.total}</span></header>
      {#if appState.bracketOperation}<small>[{appState.bracketOperation.start}:{appState.bracketOperation.step}:{appState.bracketOperation.stop}]{appState.bracketOperation.unit ?? ""}</small>{/if}
      <div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax={appState.parallelSimulationProgress.total} aria-valuenow={appState.parallelSimulationProgress.completed}><span style:width={`${progressPercent}%`}></span></div>
      {#if activeThreads.length}
        <section class="thread-progress-list"><small>Threads:</small>{#each activeThreads as thread (thread.threadId)}<div><span>#{thread.threadId + 1}</span><progress aria-label={`Thread ${thread.threadId + 1} progress`} max={Math.max(1, thread.totalAssignedSimulations)} value={thread.completedSimulations}></progress><span>{thread.completedSimulations}/{thread.totalAssignedSimulations}</span></div>{/each}</section>
      {/if}
      <footer><span>✓ {appState.parallelSimulationProgress.successful} successful</span><span>✗ {appState.parallelSimulationProgress.failed} failed</span></footer>
    </aside>
  {/if}
</section>

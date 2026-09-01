<script lang="ts">
  import { Download, SlidersHorizontal } from "@lucide/svelte";
  import { filterInternalSignals } from "../../components/ScientificPlot/utils/resultFiltering";
  import { exportResultsToCSV } from "../../utils/csvExport";
  import { formatEngineering, parseSpiceNumber } from "../../components/ScientificPlot/utils/formatUtils";
  import { appState } from "../state/appState.svelte";
  import WebglPlotCanvas from "./WebglPlotCanvas.svelte";

  let sidebarOpen = $state(true);
  let emphasized = $state(0);
  let sharedXTransform = $state<{ scaleX: number; offsetX: number; revision: number } | undefined>();
  let filteredResults = $derived(filterInternalSignals(appState.results, appState.showInternalSignals));
  let result = $derived(filteredResults[0]);
  let variables = $derived(result?.variableNames.slice(1) ?? []);
  let acMode = $derived(appState.selectedSimType === "AC" || /^\s*\.ac\s+/im.test(appState.netList));
  let noiseMode = $derived(appState.selectedSimType === "Noise" || /^\s*\.noise\s+/im.test(appState.netList));
  let canvasCount = $derived(acMode ? 2 : noiseMode ? 1 : appState.numCanvases);
  let canvas1Available = $derived(acMode ? variables.filter((name) => !name.toLowerCase().includes("[phase]")) : variables);
  let canvas2Available = $derived(acMode ? variables.filter((name) => name.toLowerCase().includes("[phase]")) : variables);

  function toggle(list: string[], name: string, setter: (values: string[]) => void) {
    setter(list.includes(name) ? list.filter((item) => item !== name) : [...list, name]);
  }

  function selectedForCanvas1() { return canvasCount === 1 ? appState.selectedVariables : appState.canvas1SelectedVariables; }
</script>

<section class="plot-workspace">
  {#if appState.isBracketOperationPlot && appState.bracketOperationResults?.parameterValues?.length}
    <div class="bracket-slider"><strong>Parameter:</strong><input type="range" min="0" max={appState.bracketOperationResults.parameterValues.length - 1} bind:value={emphasized} /><span>{formatEngineering(parseSpiceNumber(appState.bracketOperationResults.parameterValues[emphasized] ?? "0"))}</span></div>
  {/if}
  <div class="plot-toolbar">
    {#if !acMode && !noiseMode}<span>Mode:</span><button class:active={canvasCount === 1} onclick={() => appState.setNumCanvases(1)}>Single</button><button class:active={canvasCount === 2} onclick={() => appState.setNumCanvases(2)}>Dual</button>{/if}
    <span>Scale:</span><button class:active={appState.isLogX} aria-label="Log X" aria-pressed={appState.isLogX} onclick={appState.toggleLogX}>Log X</button>
    {#if canvasCount === 1}<button class:active={appState.isLogY} aria-label="Log Y" aria-pressed={appState.isLogY} onclick={appState.toggleLogY}>Log Y</button>{:else}<button class:active={appState.isLogY1} aria-label="Log Y1" aria-pressed={appState.isLogY1} onclick={appState.toggleLogY1}>Log Y1</button><button class:active={appState.isLogY2} aria-label="Log Y2" aria-pressed={appState.isLogY2} onclick={appState.toggleLogY2}>Log Y2</button>{/if}
    <button aria-label="Plot Variables" onclick={() => sidebarOpen = !sidebarOpen}><SlidersHorizontal size={16} />Variables</button>
  </div>
  <div class:with-sidebar={sidebarOpen} class="plot-body">
    <div class:dual={canvasCount === 2} class="plot-canvases">
      {#if result}
        <div class="plot-canvas-wrap">{#if canvasCount === 2}<h3>{acMode ? "Magnitude" : "Plot 1"}</h3>{/if}<WebglPlotCanvas {result} selectedVariables={selectedForCanvas1()} isDarkMode={appState.isDarkMode} isLogX={appState.isLogX} isLogY={canvasCount === 1 ? appState.isLogY : appState.isLogY1} inputProfile={appState.inputProfile} lineThickness={appState.lineThickness} emphasizedPlotIndex={emphasized} externalXTransform={sharedXTransform} onXTransform={(transform) => sharedXTransform = { ...transform, revision: (sharedXTransform?.revision ?? 0) + 1 }} /></div>
        {#if canvasCount === 2}<div class="plot-canvas-wrap"><h3>{acMode ? "Phase" : "Plot 2"}</h3><WebglPlotCanvas {result} selectedVariables={appState.canvas2SelectedVariables} isDarkMode={appState.isDarkMode} isLogX={appState.isLogX} isLogY={appState.isLogY2} inputProfile={appState.inputProfile} lineThickness={appState.lineThickness} emphasizedPlotIndex={emphasized} externalXTransform={sharedXTransform} onXTransform={(transform) => sharedXTransform = { ...transform, revision: (sharedXTransform?.revision ?? 0) + 1 }} /></div>{/if}
      {/if}
    </div>
    {#if sidebarOpen && result}
      <aside class="plot-sidebar">
        <header><strong>Plot Variables</strong><button aria-label="Export CSV" title="Export CSV" onclick={() => exportResultsToCSV(filteredResults)}><Download size={16} /></button></header>
        <small>X-axis: {result.variableNames[0]}</small>
        <section><h4>{canvasCount === 2 ? (acMode ? "Magnitude" : "Plot 1") : "Signals"}</h4><div class="selection-actions"><button onclick={() => canvasCount === 1 ? appState.setSelectedVariables(canvas1Available) : appState.setCanvas1SelectedVariables(canvas1Available)}>All</button><button onclick={() => canvasCount === 1 ? appState.setSelectedVariables([]) : appState.setCanvas1SelectedVariables([])}>None</button></div>
          {#each canvas1Available as name (name)}<label><input type="checkbox" checked={selectedForCanvas1().includes(name)} onchange={() => toggle(selectedForCanvas1(), name, canvasCount === 1 ? appState.setSelectedVariables : appState.setCanvas1SelectedVariables)} /><span>{name}</span></label>{/each}
        </section>
        {#if canvasCount === 2}<section><h4>{acMode ? "Phase" : "Plot 2"}</h4><div class="selection-actions"><button onclick={() => appState.setCanvas2SelectedVariables(canvas2Available)}>All</button><button onclick={() => appState.setCanvas2SelectedVariables([])}>None</button></div>{#each canvas2Available as name (name)}<label><input type="checkbox" checked={appState.canvas2SelectedVariables.includes(name)} onchange={() => toggle(appState.canvas2SelectedVariables, name, appState.setCanvas2SelectedVariables)} /><span>{name}</span></label>{/each}</section>{/if}
      </aside>
    {/if}
  </div>
</section>

<script lang="ts">
  import { Play, X } from "@lucide/svelte";
  import type { SimulationAC, SimulationDC, SimulationNoise, SimulationTransient, SimulationType } from "../../types/commonTypes";
  import { detectNetsFromNetlist } from "../../utils/netDetection";
  import { detectSourcesFromNetlist } from "../../utils/sourceDetection";
  import { correctNgspiceUnits } from "../../utils/unitCorrection";
  import { formatToBePlottedLabel } from "../../utils/toBePlotted";
  import { executeSimulation } from "../../controllers/simulationController";
  import { appState, getAppState } from "../state/appState.svelte";
  import MonacoEditor from "./MonacoEditor.svelte";

  const simulationTypes: SimulationType["type"][] = ["None", "DC", "AC", "Transient", "Noise"];
  let editorValue = $state(appState.netList);
  let lastGeneratedNetlist = $state(appState.netList);
  let running = $state(false);
  let plottedOpen = $state(false);

  let dc = $state<SimulationDC>({ type: "DC", name: "DC-1", source: "", start: "", stop: "", step: "" });
  let ac = $state<SimulationAC>({ type: "AC", name: "AC-1", source: "", frequencyStart: "", frequencyStop: "", stepNumber: "", sweepType: "dec" });
  let transient = $state<SimulationTransient>({ type: "Transient", name: "Transient-1", stopTime: "", timeStep: "", initialConditions: false });
  let noise = $state<SimulationNoise>({ type: "Noise", name: "Noise-1", netName: "", source: "", steps: "", startFreq: "", stopFreq: "", sweepType: "dec" });

  let sources = $derived(detectSourcesFromNetlist(appState.netList));
  let nets = $derived(detectNetsFromNetlist(appState.netList));
  let busy = $derived(running || appState.isParallelSimulationRunning);

  $effect(() => {
    if (appState.netList !== lastGeneratedNetlist || appState.netListNeedsRefresh) {
      lastGeneratedNetlist = appState.netList;
      editorValue = appState.netList;
      if (appState.netListNeedsRefresh) appState.acknowledgeNetListRefresh();
    }
  });

  $effect(() => {
    const config = appState.simulationConfig;
    if (config?.type === "DC") dc = { ...config };
    else if (config?.type === "AC") ac = { ...config };
    else if (config?.type === "Transient") transient = { ...config };
    else if (config?.type === "Noise") noise = { ...config };
  });

  function publish(config: SimulationType, command: string) {
    appState.setSimulationConfig(config);
    appState.setSimulationCommandString(correctNgspiceUnits(command));
    if (config.type === "None") return;
    const valid = Object.entries(config).every(([key, value]) => key === "name" || key === "initialConditions" || value !== "");
    if (!valid) return;
    const index = appState.allSimulationConfigs.findIndex((item) => {
      if (item.type !== config.type) return false;
      return item.name === config.name;
    });
    if (index >= 0) appState.updateSimulationConfig(index, config);
    else appState.addSimulationConfig(config);
  }

  function selectType(type: SimulationType["type"]) {
    appState.setSelectedSimType(type);
    if (type === "None") {
      appState.setSimulationConfig({ type: "None" });
      appState.setSimulationCommandString("");
    } else if (type === "DC") {
      const saved = appState.allSimulationConfigs.find((config): config is SimulationDC => config.type === "DC");
      if (saved) dc = { ...saved };
      publish(dc, `.dc ${dc.source} ${dc.start} ${dc.stop} ${dc.step}`);
    } else if (type === "AC") {
      const saved = appState.allSimulationConfigs.find((config): config is SimulationAC => config.type === "AC");
      if (saved) ac = { ...saved };
      publish(ac, `.ac ${ac.sweepType} ${ac.stepNumber} ${ac.frequencyStart} ${ac.frequencyStop}`);
    } else if (type === "Transient") {
      const saved = appState.allSimulationConfigs.find((config): config is SimulationTransient => config.type === "Transient");
      if (saved) transient = { ...saved };
      publish(transient, `.tran ${transient.timeStep} ${transient.stopTime}`);
    } else {
      const saved = appState.allSimulationConfigs.find((config): config is SimulationNoise => config.type === "Noise");
      if (saved) noise = { ...saved };
      publish(noise, `.noise v(${noise.netName}) ${noise.source} ${noise.sweepType} ${noise.steps} ${noise.startFreq} ${noise.stopFreq}`);
    }
  }

  function updateDc() { publish(dc, `.dc ${dc.source} ${dc.start} ${dc.stop} ${dc.step}`); }
  function updateAc() { publish(ac, `.ac ${ac.sweepType} ${ac.stepNumber} ${ac.frequencyStart} ${ac.frequencyStop}`); }
  function updateTransient() { publish(transient, `.tran ${transient.timeStep} ${transient.stopTime}`); }
  function updateNoise() { publish(noise, `.noise v(${noise.netName}) ${noise.source} ${noise.sweepType} ${noise.steps} ${noise.startFreq} ${noise.stopFreq}`); }

  async function run() {
    if (busy) return;
    running = true;
    try { await executeSimulation(getAppState, editorValue); }
    catch (error) {
      appState.addMessage({ text: error instanceof Error ? error.message : "Simulation failed.", type: "error", category: "Simulation", mLevel: "user" });
    } finally { running = false; }
  }
</script>

<section class="simulation-workspace">
  <div class="netlist-pane">
    <header class="netlist-header">
      <div class="plotted-menu-wrap">
        <button aria-expanded={plottedOpen} onclick={() => plottedOpen = !plottedOpen}>To Be Plotted{appState.toBePlotted.length ? ` (${appState.toBePlotted.length})` : ""}</button>
        {#if plottedOpen}
          <div class="plotted-menu" role="menu">
            {#each appState.toBePlotted as item, index (`${item.type}-${index}`)}
              {@const label = formatToBePlottedLabel(item)}
              <button role="menuitem" aria-label={`Remove ${label} from To Be Plotted`} onclick={() => appState.removeToBePlotted(item)}><span>{label}</span><X size={14} /></button>
            {/each}
            <button role="menuitem" onclick={() => { plottedOpen = false; appState.enterToBePlottedMode(); }}>Add More...</button>
          </div>
        {/if}
      </div>
    </header>
    {#key appState.mainTabValue}
      <MonacoEditor value={editorValue} theme={appState.isDarkMode ? "dark" : "light"} onChange={(value) => editorValue = value} />
    {/key}
  </div>

  <aside class="simulation-sidebar">
    <div class="simulation-config-scroll">
      <fieldset class="type-picker">
        <legend>Simulation Configuration</legend>
        <div>
          {#each simulationTypes as type (type)}
            <label class:active={appState.selectedSimType === type}><input type="radio" name="simulation-type" value={type} checked={appState.selectedSimType === type} onchange={() => selectType(type)} /><span>{type}</span></label>
          {/each}
        </div>
      </fieldset>

      {#if appState.selectedSimType === "None"}
        <p class="muted">No addition to the netlist. Manual editor changes are simulated as written.</p>
      {:else if appState.selectedSimType === "DC"}
        <fieldset class="config-form"><legend>DC Simulation</legend><code>.dc {dc.source} {dc.start} {dc.stop} {dc.step}</code>
          <label>Sweep Source{#if sources.length}<select bind:value={dc.source} onchange={updateDc}><option value="">Select a source...</option>{#each sources as source (source)}<option value={source}>{source}</option>{/each}</select>{:else}<input bind:value={dc.source} oninput={updateDc} />{/if}</label>
          <label>Start Value<input bind:value={dc.start} oninput={updateDc} /></label><label>Stop Value<input bind:value={dc.stop} oninput={updateDc} /></label><label>Step Size<input bind:value={dc.step} oninput={updateDc} /></label>
        </fieldset>
      {:else if appState.selectedSimType === "AC"}
        <fieldset class="config-form"><legend>AC Simulation</legend><code>.ac {ac.sweepType} {ac.stepNumber} {ac.frequencyStart} {ac.frequencyStop}</code>
          <label>Source{#if sources.length}<select bind:value={ac.source} onchange={updateAc}><option value="">Select a source...</option>{#each sources as source (source)}<option value={source}>{source}</option>{/each}</select>{:else}<input bind:value={ac.source} oninput={updateAc} />{/if}</label>
          <label>Sweep Type<select bind:value={ac.sweepType} onchange={updateAc}><option value="dec">Decade</option><option value="oct">Octave</option><option value="lin">Linear</option></select></label>
          <label>Start Frequency<input bind:value={ac.frequencyStart} oninput={updateAc} /></label><label>Stop Frequency<input bind:value={ac.frequencyStop} oninput={updateAc} /></label><label>Steps Number<input bind:value={ac.stepNumber} oninput={updateAc} /></label>
        </fieldset>
      {:else if appState.selectedSimType === "Transient"}
        <fieldset class="config-form"><legend>Transient Simulation</legend><code>.tran {transient.timeStep} {transient.stopTime}</code>
          <label>Stop Time<input bind:value={transient.stopTime} oninput={updateTransient} /></label><label>Time Step<input bind:value={transient.timeStep} oninput={updateTransient} /></label>
          <label class="check-row"><input type="checkbox" bind:checked={transient.initialConditions} onchange={updateTransient} />Use initial conditions</label>
        </fieldset>
      {:else}
        <fieldset class="config-form"><legend>Noise Simulation</legend><code>.noise v({noise.netName}) {noise.source} {noise.sweepType} {noise.steps} {noise.startFreq} {noise.stopFreq}</code>
          <label>Output Net Name{#if nets.length}<select bind:value={noise.netName} onchange={updateNoise}><option value="">Select a net...</option>{#each nets as net (net)}<option value={net}>{net}</option>{/each}</select>{:else}<input bind:value={noise.netName} oninput={updateNoise} />{/if}</label>
          <label>Input Source{#if sources.length}<select bind:value={noise.source} onchange={updateNoise}><option value="">Select a source...</option>{#each sources as source (source)}<option value={source}>{source}</option>{/each}</select>{:else}<input bind:value={noise.source} oninput={updateNoise} />{/if}</label>
          <label>Sweep Type<select bind:value={noise.sweepType} onchange={updateNoise}><option value="dec">Decade</option><option value="oct">Octave</option><option value="lin">Linear</option></select></label>
          <label>Steps<input bind:value={noise.steps} oninput={updateNoise} /></label><label>Start Frequency<input bind:value={noise.startFreq} oninput={updateNoise} /></label><label>Stop Frequency<input bind:value={noise.stopFreq} oninput={updateNoise} /></label>
        </fieldset>
      {/if}
    </div>
    <footer class="run-panel">
      {#if appState.bracketOperation && !appState.isParallelSimulationRunning}<p>Bracket sweep: [{appState.bracketOperation.start}:{appState.bracketOperation.step}:{appState.bracketOperation.stop}]{appState.bracketOperation.unit ?? ""}</p>{/if}
      {#if appState.isParallelSimulationRunning}<progress max={appState.parallelSimulationProgress.total} value={appState.parallelSimulationProgress.completed}></progress>{/if}
      <button class="primary-button run-button" aria-label="Run Simulation" aria-busy={busy} disabled={busy} onclick={run}><Play size={17} />{busy ? "Running simulation" : "Run Simulation"}</button>
    </footer>
  </aside>
</section>

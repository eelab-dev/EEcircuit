<script lang="ts">
  import { Pencil, Play, Plus, Trash2, X } from "@lucide/svelte";
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
  let selectedConfigIndex = $state(-1);
  let isAddingConfig = $state(false);
  let newConfigName = $state("");
  let editingConfigIndex = $state(-1);
  let editingConfigName = $state("");

  let dc = $state<SimulationDC>({ type: "DC", name: "DC-1", source: "", start: "", stop: "", step: "" });
  let ac = $state<SimulationAC>({ type: "AC", name: "AC-1", source: "", frequencyStart: "", frequencyStop: "", stepNumber: "", sweepType: "dec" });
  let transient = $state<SimulationTransient>({ type: "Transient", name: "Transient-1", stopTime: "", timeStep: "", initialConditions: false });
  let noise = $state<SimulationNoise>({ type: "Noise", name: "Noise-1", netName: "", source: "", steps: "", startFreq: "", stopFreq: "", sweepType: "dec" });

  let sources = $derived(detectSourcesFromNetlist(appState.netList));
  let nets = $derived(detectNetsFromNetlist(appState.netList));
  let busy = $derived(running || appState.isParallelSimulationRunning);

  function configName(config: SimulationType, index: number) {
    return config.type !== "None" && config.name?.trim() ? config.name : `Config ${index + 1}`;
  }

  function generateDefaultConfigName(type: Exclude<SimulationType["type"], "None">) {
    const names = new Set(appState.allSimulationConfigs
      .filter((config): config is Exclude<SimulationType, { type: "None" }> => config.type !== "None" && config.type === type)
      .map((config) => config.name?.trim())
      .filter((name): name is string => !!name));
    let counter = 1;
    while (names.has(`${type}-${counter}`)) counter += 1;
    return `${type}-${counter}`;
  }

  function createEmptyConfig(type: Exclude<SimulationType["type"], "None">, name = generateDefaultConfigName(type)): SimulationType {
    if (type === "DC") return { type, name, source: "", start: "", stop: "", step: "" };
    if (type === "AC") return { type, name, source: "", frequencyStart: "", frequencyStop: "", stepNumber: "", sweepType: "dec" };
    if (type === "Transient") return { type, name, stopTime: "", timeStep: "", initialConditions: false };
    return { type, name, netName: "", source: "", steps: "", startFreq: "", stopFreq: "", sweepType: "dec" };
  }

  function isConfigValid(config: SimulationType) {
    if (config.type === "None") return false;
    if (config.type === "DC") return !!(config.source.trim() && config.start.trim() && config.stop.trim() && config.step.trim());
    if (config.type === "AC") return !!(config.source.trim() && config.frequencyStart.trim() && config.frequencyStop.trim() && config.stepNumber.trim());
    if (config.type === "Transient") return !!(config.stopTime.trim() && config.timeStep.trim());
    return !!(config.netName.trim() && config.source.trim() && config.steps.trim() && config.startFreq.trim() && config.stopFreq.trim());
  }

  function commandFor(config: SimulationType) {
    if (config.type === "DC") return `.dc ${config.source} ${config.start} ${config.stop} ${config.step}`;
    if (config.type === "AC") return `.ac ${config.sweepType} ${config.stepNumber} ${config.frequencyStart} ${config.frequencyStop}`;
    if (config.type === "Transient") return `.tran ${config.timeStep} ${config.stopTime}`;
    if (config.type === "Noise") return `.noise v(${config.netName}) ${config.source} ${config.sweepType} ${config.steps} ${config.startFreq} ${config.stopFreq}`;
    return "";
  }

  function activateConfig(config: SimulationType, index: number) {
    selectedConfigIndex = index;
    appState.setSelectedSimType(config.type);
    appState.setSimulationConfig(config);
    appState.setSimulationCommandString(correctNgspiceUnits(commandFor(config)));
  }

  $effect(() => {
    if (appState.netList !== lastGeneratedNetlist || appState.netListNeedsRefresh) {
      lastGeneratedNetlist = appState.netList;
      // "None" is the manual-editor mode. A configuration update that was
      // queued just before switching to None must not overwrite those edits.
      if (appState.selectedSimType !== "None") editorValue = appState.netList;
      if (appState.netListNeedsRefresh) appState.acknowledgeNetListRefresh();
    }
  });

  $effect(() => {
    const config = appState.simulationConfig;
    if (config?.type === "DC") {
      dc = { ...config };
      appState.setSimulationCommandString(correctNgspiceUnits(`.dc ${config.source} ${config.start} ${config.stop} ${config.step}`));
    } else if (config?.type === "AC") {
      ac = { ...config };
      appState.setSimulationCommandString(correctNgspiceUnits(`.ac ${config.sweepType} ${config.stepNumber} ${config.frequencyStart} ${config.frequencyStop}`));
    } else if (config?.type === "Transient") {
      transient = { ...config };
      appState.setSimulationCommandString(correctNgspiceUnits(`.tran ${config.timeStep} ${config.stopTime}`));
    } else if (config?.type === "Noise") {
      noise = { ...config };
      appState.setSimulationCommandString(correctNgspiceUnits(`.noise v(${config.netName}) ${config.source} ${config.sweepType} ${config.steps} ${config.startFreq} ${config.stopFreq}`));
    }
  });

  $effect(() => {
    const configs = appState.allSimulationConfigs;
    const config = appState.simulationConfig;
    if (!config && appState.selectedSimType === "None" && configs.length) {
      activateConfig(configs[0]!, 0);
      return;
    }
    if (!config || config.type === "None") {
      if (!configs.length) selectedConfigIndex = -1;
      return;
    }
    const matchingIndex = configs.findIndex((item) => item.type !== "None" && item.type === config.type && item.name === config.name);
    if (matchingIndex >= 0 && matchingIndex !== selectedConfigIndex) selectedConfigIndex = matchingIndex;
  });

  function publish(config: SimulationType, command: string) {
    appState.setSimulationConfig(config);
    appState.setSimulationCommandString(correctNgspiceUnits(command));
    if (config.type === "None") return;
    if (!isConfigValid(config)) return;
    if (selectedConfigIndex >= 0 && selectedConfigIndex < appState.allSimulationConfigs.length) {
      appState.updateSimulationConfig(selectedConfigIndex, config);
    } else {
      appState.addSimulationConfig(config);
      selectedConfigIndex = appState.allSimulationConfigs.length - 1;
    }
  }

  function selectType(type: SimulationType["type"]) {
    if (type === "None") {
      selectedConfigIndex = -1;
      appState.setSelectedSimType(type);
      appState.setSimulationConfig({ type: "None" });
      appState.setSimulationCommandString("");
      return;
    }
    const savedIndex = appState.allSimulationConfigs.findIndex((config) => config.type === type && isConfigValid(config));
    if (savedIndex >= 0) activateConfig(appState.allSimulationConfigs[savedIndex]!, savedIndex);
    else activateConfig(createEmptyConfig(type), -1);
  }

  function selectConfig(value: string) {
    if (value === "add-new") { isAddingConfig = true; return; }
    if (!value) { selectType(appState.selectedSimType); return; }
    const index = Number.parseInt(value, 10);
    const config = appState.allSimulationConfigs[index];
    if (config) activateConfig(config, index);
  }

  function cancelAddingConfig() {
    isAddingConfig = false;
    newConfigName = "";
  }

  function addNewConfig() {
    if (appState.selectedSimType === "None") { cancelAddingConfig(); return; }
    const name = newConfigName.trim() || generateDefaultConfigName(appState.selectedSimType);
    const config = createEmptyConfig(appState.selectedSimType, name);
    appState.addSimulationConfig(config);
    activateConfig(config, appState.allSimulationConfigs.length - 1);
    cancelAddingConfig();
  }

  function startEditingConfigName() {
    const config = appState.allSimulationConfigs[selectedConfigIndex];
    if (!config || config.type === "None") return;
    editingConfigIndex = selectedConfigIndex;
    editingConfigName = config.name ?? "";
  }

  function cancelEditingConfigName() {
    editingConfigIndex = -1;
    editingConfigName = "";
  }

  function saveEditedConfigName() {
    const name = editingConfigName.trim();
    const config = appState.allSimulationConfigs[editingConfigIndex];
    if (!name || !config || config.type === "None") { cancelEditingConfigName(); return; }
    const renamed = { ...config, name } as SimulationType;
    appState.updateSimulationConfig(editingConfigIndex, renamed);
    if (editingConfigIndex === selectedConfigIndex) activateConfig(renamed, editingConfigIndex);
    cancelEditingConfigName();
  }

  function deleteSelectedConfig() {
    if (selectedConfigIndex < 0) return;
    const deletedIndex = selectedConfigIndex;
    const remaining = appState.allSimulationConfigs.filter((_, index) => index !== deletedIndex);
    appState.setAllSimulationConfigs(remaining);
    cancelEditingConfigName();
    if (!remaining.length) {
      selectedConfigIndex = -1;
      appState.setSelectedSimType("None");
      appState.setSimulationConfig({ type: "None" });
      appState.setSimulationCommandString("");
      return;
    }
    const nextIndex = Math.min(deletedIndex, remaining.length - 1);
    activateConfig(remaining[nextIndex]!, nextIndex);
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
        <button aria-expanded={appState.toBePlotted.length ? plottedOpen : undefined} onclick={() => { if (appState.toBePlotted.length) plottedOpen = !plottedOpen; else appState.enterToBePlottedMode(); }}>To Be Plotted{appState.toBePlotted.length ? ` (${appState.toBePlotted.length})` : ""}</button>
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
      {#if appState.selectedSimType !== "None"}
        <section class="config-manager" aria-label="Saved simulation configurations">
          <header class="config-manager-header">
            <strong>Saved Configurations</strong>
            <button class="compact-icon-button" aria-label="Add configuration" title="Add configuration" onclick={() => isAddingConfig = true}><Plus size={16} /></button>
          </header>

          {#if isAddingConfig}
            <div class="config-manager-row">
              <input
                aria-label="New configuration name"
                placeholder="Config name"
                bind:value={newConfigName}
                onkeydown={(event) => { if (event.key === "Enter") addNewConfig(); else if (event.key === "Escape") cancelAddingConfig(); }}
              />
              <button onclick={addNewConfig}>Add</button>
              <button onclick={cancelAddingConfig}>Cancel</button>
            </div>
          {:else}
            <div class="config-manager-row config-selection-row">
              <select aria-label="Saved simulation configuration" onchange={(event) => selectConfig(event.currentTarget.value)}>
                <option value="" selected={selectedConfigIndex < 0}>Select Configuration</option>
                {#each appState.allSimulationConfigs as config, index (`${index}-${config.type}-${config.type === "None" ? "" : config.name ?? ""}`)}
                  <option value={index} selected={selectedConfigIndex === index}>{configName(config, index)} ({config.type})</option>
                {/each}
                <option value="add-new">+ Add New</option>
              </select>
              {#if selectedConfigIndex >= 0}
                <button class="compact-icon-button" aria-label="Edit configuration name" title="Edit configuration name" onclick={startEditingConfigName}><Pencil size={15} /></button>
                <button class="compact-icon-button danger-icon-button" aria-label="Delete configuration" title="Delete configuration" onclick={deleteSelectedConfig}><Trash2 size={15} /></button>
              {/if}
            </div>
          {/if}

          {#if editingConfigIndex >= 0}
            <div class="config-manager-row">
              <input
                aria-label="Configuration name"
                placeholder="Configuration name"
                bind:value={editingConfigName}
                onkeydown={(event) => { if (event.key === "Enter") saveEditedConfigName(); else if (event.key === "Escape") cancelEditingConfigName(); }}
              />
              <button onclick={saveEditedConfigName}>Save</button>
              <button onclick={cancelEditingConfigName}>Cancel</button>
            </div>
          {/if}
        </section>
      {/if}

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

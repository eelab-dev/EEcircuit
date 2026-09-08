<script lang="ts">
  import { Menu } from "@ark-ui/svelte/menu";
  import { CopyPlus, Pencil, Play, Trash2, X } from "@lucide/svelte";
  import type { SimulationAC, SimulationDC, SimulationNoise, SimulationTransient, SimulationType } from "../../types/commonTypes";
  import { detectNetsFromNetlist } from "../../utils/netDetection";
  import { detectSourcesFromNetlist, getDefaultSource, validateSourceInNetlist } from "../../utils/sourceDetection";
  import { correctNgspiceUnits } from "../../utils/unitCorrection";
  import { formatToBePlottedLabel } from "../../utils/toBePlotted";
  import { executeSimulation } from "../../controllers/simulationController";
  import { circuitCompatibilityErrors } from "../../pdk/circuitCompatibility";
  import {
    areSimulationConfigsEqual,
    isSimulationConfigComplete,
    type SimulationConfig,
  } from "../../simulation/simulationProfiles";
  import { appState, getAppState } from "../state/appState.svelte";
  import MonacoEditor from "./MonacoEditor.svelte";

  const simulationTypes: SimulationType["type"][] = ["None", "DC", "AC", "Transient", "Noise"];
  let editorValue = $state(appState.netList);
  let lastGeneratedNetlist = $state(appState.netList);
  let running = $state(false);
  let editingConfigIndex = $state(-1);
  let editingConfigName = $state("");
  let configNameError = $state("");
  let selectedConfigValue = $derived(
    appState.selectedSimulationConfigIndex >= 0 ? String(appState.selectedSimulationConfigIndex) : "",
  );
  let monacoEditor = $state<{ getValue: () => string }>();

  let dc = $state<SimulationDC>({ type: "DC", name: "DC-1", source: "", start: "", stop: "", step: "" });
  let ac = $state<SimulationAC>({ type: "AC", name: "AC-1", source: "", frequencyStart: "", frequencyStop: "", stepNumber: "", sweepType: "dec" });
  let transient = $state<SimulationTransient>({ type: "Transient", name: "Transient-1", stopTime: "", timeStep: "", initialConditions: false });
  let noise = $state<SimulationNoise>({ type: "Noise", name: "Noise-1", netName: "", source: "", steps: "", startFreq: "", stopFreq: "", sweepType: "dec" });

  let sources = $derived(detectSourcesFromNetlist(appState.netList));
  let nets = $derived(detectNetsFromNetlist(appState.netList));
  let busy = $derived(running || appState.isParallelSimulationRunning);
  let activeConfigComplete = $derived(!!appState.simulationConfig && isSimulationConfigComplete(appState.simulationConfig));
  let activeConfigModified = $derived.by(() => {
    const active = appState.simulationConfig;
    const saved = appState.allSimulationConfigs[appState.selectedSimulationConfigIndex];
    return !!active && !!saved && !areSimulationConfigsEqual(active, saved);
  });
  let pdkErrors = $derived(circuitCompatibilityErrors(
    appState.currentSchematic,
    appState.processId,
    appState.selectedSimType === "None" ? editorValue : "",
  ));

  function configName(config: SimulationType, index: number) {
    return config.type !== "None" && config.name?.trim() ? config.name : `Config ${index + 1}`;
  }

  function resolveStaleSource(config: SimulationType, netlist: string): SimulationType {
    if (config.type === "None" || config.type === "Transient" || !config.source) return config;
    if (validateSourceInNetlist(netlist, config.source)) return config;
    return { ...config, source: getDefaultSource(netlist) } as SimulationType;
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
    const currentConfig = appState.simulationConfig;
    const config = currentConfig ? resolveStaleSource(currentConfig, appState.netList) : undefined;
    if (config && config !== currentConfig) {
      if (config.type !== "None") appState.updateActiveSimulationConfig(config);
    }
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

  function publish(config: SimulationType) {
    if (config.type !== "None") appState.updateActiveSimulationConfig(config);
  }

  function updateEditorValue(value: string) {
    editorValue = value;
    if (appState.selectedSimType === "None") appState.setNetList(value);
  }

  function selectType(type: SimulationType["type"]) {
    cancelEditingConfigName();
    if (type === "None") {
      // A generated-netlist prop update can still be queued while Monaco is
      // showing the user's manual text. Snapshot the live model so entering
      // manual mode cancels that stale update instead of overwriting the UI.
      editorValue = monacoEditor?.getValue() ?? editorValue;
      appState.selectSimulationType(type);
      return;
    }
    appState.selectSimulationType(type);
  }

  function selectConfig(value: string) {
    cancelEditingConfigName();
    if (!value) { selectType(appState.selectedSimType); return; }
    const index = Number.parseInt(value, 10);
    appState.selectSimulationConfig(index);
  }

  function startEditingConfigName() {
    const config = appState.allSimulationConfigs[appState.selectedSimulationConfigIndex];
    if (!config || config.type === "None") return;
    editingConfigIndex = appState.selectedSimulationConfigIndex;
    editingConfigName = config.name ?? "";
    configNameError = "";
  }

  function cancelEditingConfigName() {
    editingConfigIndex = -1;
    editingConfigName = "";
    configNameError = "";
  }

  function saveEditedConfigName() {
    const name = editingConfigName.trim();
    if (!name) {
      configNameError = "Enter a configuration name.";
      return;
    }
    if (!appState.renameSelectedSimulationConfig(name)) {
      configNameError = "Configuration names must be unique.";
      return;
    }
    cancelEditingConfigName();
  }

  function deleteSelectedConfig() {
    if (appState.selectedSimulationConfigIndex < 0) return;
    appState.deleteSelectedSimulationConfig();
    cancelEditingConfigName();
  }

  function updateDc() { publish(dc); }
  function updateAc() { publish(ac); }
  function updateTransient() { publish(transient); }
  function updateNoise() { publish(noise); }

  function activeFormConfig(): SimulationConfig | undefined {
    if (appState.selectedSimType === "DC") return dc;
    if (appState.selectedSimType === "AC") return ac;
    if (appState.selectedSimType === "Transient") return transient;
    if (appState.selectedSimType === "Noise") return noise;
    return undefined;
  }

  function saveAsNew() {
    const active = activeFormConfig();
    if (!active) return;
    appState.updateActiveSimulationConfig(active);
    appState.saveActiveSimulationConfigAsNew();
  }

  async function run() {
    if (busy) return;
    const active = activeFormConfig();
    if (active) {
      appState.updateActiveSimulationConfig(active as SimulationConfig);
      if (isSimulationConfigComplete(active)) appState.commitActiveSimulationConfig();
    }
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
        {#if appState.toBePlotted.length}
          <Menu.Root positioning={{ placement: "bottom-start" }}>
            <Menu.Trigger>To Be Plotted ({appState.toBePlotted.length})</Menu.Trigger>
            <Menu.Positioner>
              <Menu.Content class="plotted-menu">
            {#each appState.toBePlotted as item, index (`${item.type}-${index}`)}
              {@const label = formatToBePlottedLabel(item)}
                  <Menu.Item class="plotted-menu-item" value={`remove-${index}`} aria-label={`Remove ${label} from To Be Plotted`} onSelect={() => appState.removeToBePlotted(item)}><span>{label}</span><X size={14} /></Menu.Item>
            {/each}
                <Menu.Item class="plotted-menu-item" value="add-more" onSelect={appState.enterToBePlottedMode}>Add More...</Menu.Item>
              </Menu.Content>
            </Menu.Positioner>
          </Menu.Root>
        {:else}
          <button onclick={appState.enterToBePlottedMode}>To Be Plotted</button>
        {/if}
      </div>
    </header>
    <MonacoEditor bind:this={monacoEditor} value={editorValue} theme={appState.isDarkMode ? "dark" : "light"} onChange={updateEditorValue} />
  </div>

  <aside class="simulation-sidebar">
    <div class="simulation-config-scroll">
      {#if appState.selectedSimType !== "None"}
        <section class="config-manager" aria-label="Saved simulation configurations">
          <header class="config-manager-header">
            <strong>Saved Configurations</strong>
          </header>
          <div class="config-manager-row config-selection-row">
            <select
              aria-label="Saved simulation configuration"
              bind:value={selectedConfigValue}
              onchange={(event) => selectConfig(event.currentTarget.value)}
            >
              {#if appState.selectedSimulationConfigIndex < 0 && appState.simulationConfig && appState.simulationConfig.type !== "None"}
                <option value="">{appState.simulationConfig.name} ({appState.simulationConfig.type}, unsaved)</option>
              {:else}
                <option value="">Select Configuration</option>
              {/if}
              {#each appState.allSimulationConfigs as config, index (`${index}-${config.type}-${config.type === "None" ? "" : config.name ?? ""}`)}
                <option value={String(index)}>{configName(config, index)} ({config.type})</option>
              {/each}
            </select>
            {#if appState.selectedSimulationConfigIndex >= 0}
              <button class="compact-icon-button" aria-label="Edit configuration name" title="Edit configuration name" onclick={startEditingConfigName}><Pencil size={15} /></button>
              <button class="compact-icon-button danger-icon-button" aria-label="Delete configuration" title="Delete configuration" onclick={deleteSelectedConfig}><Trash2 size={15} /></button>
            {/if}
          </div>

          {#if activeConfigModified}
            <p class="config-modified-status" role="status">Modified. Run updates this profile; Save as new keeps the original.</p>
          {/if}
          <button
            class="save-as-new-button"
            aria-label={appState.selectedSimulationConfigIndex >= 0 ? "Save as new profile" : "Save profile"}
            title={activeConfigComplete ? undefined : "Complete all simulation fields before saving this profile"}
            disabled={!activeConfigComplete}
            onclick={saveAsNew}
          ><CopyPlus size={16} />{appState.selectedSimulationConfigIndex >= 0 ? "Save as new" : "Save profile"}</button>

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
          {#if configNameError}<p class="config-name-error" role="alert">{configNameError}</p>{/if}
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
          <label>Start Value<input placeholder="e.g., 0, 1m" bind:value={dc.start} oninput={updateDc} /></label><label>Stop Value<input placeholder="e.g., 10, 1.5k" bind:value={dc.stop} oninput={updateDc} /></label><label>Step Size<input placeholder="e.g., 0.1, 10m" bind:value={dc.step} oninput={updateDc} /></label>
        </fieldset>
      {:else if appState.selectedSimType === "AC"}
        <fieldset class="config-form"><legend>AC Simulation</legend><code>.ac {ac.sweepType} {ac.stepNumber} {ac.frequencyStart} {ac.frequencyStop}</code>
          <label>Source{#if sources.length}<select bind:value={ac.source} onchange={updateAc}><option value="">Select a source...</option>{#each sources as source (source)}<option value={source}>{source}</option>{/each}</select>{:else}<input bind:value={ac.source} oninput={updateAc} />{/if}</label>
          <label>Sweep Type<select bind:value={ac.sweepType} onchange={updateAc}><option value="dec">Decade</option><option value="oct">Octave</option><option value="lin">Linear</option></select></label>
          <label>Start Frequency<input placeholder="e.g., 1, 10k" bind:value={ac.frequencyStart} oninput={updateAc} /></label><label>Stop Frequency<input placeholder="e.g., 1M, 2G" bind:value={ac.frequencyStop} oninput={updateAc} /></label><label>Steps Number<input placeholder="e.g., 10, 100, 1k" bind:value={ac.stepNumber} oninput={updateAc} /></label>
        </fieldset>
      {:else if appState.selectedSimType === "Transient"}
        <fieldset class="config-form"><legend>Transient Simulation</legend><code>.tran {transient.timeStep} {transient.stopTime}</code>
          <label>Stop Time<input placeholder="e.g., 10n, 1m, 1" bind:value={transient.stopTime} oninput={updateTransient} /></label><label>Time Step<input placeholder="e.g., 1n, 10p, 1m" bind:value={transient.timeStep} oninput={updateTransient} /></label>
        </fieldset>
      {:else}
        <fieldset class="config-form"><legend>Noise Simulation</legend><code>.noise v({noise.netName}) {noise.source} {noise.sweepType} {noise.steps} {noise.startFreq} {noise.stopFreq}</code>
          <label>Output Net Name{#if nets.length}<select bind:value={noise.netName} onchange={updateNoise}><option value="">Select a net...</option>{#each nets as net (net)}<option value={net}>{net}</option>{/each}</select>{:else}<input placeholder="e.g., out" bind:value={noise.netName} oninput={updateNoise} />{/if}</label>
          <label>Input Source{#if sources.length}<select bind:value={noise.source} onchange={updateNoise}><option value="">Select a source...</option>{#each sources as source (source)}<option value={source}>{source}</option>{/each}</select>{:else}<input bind:value={noise.source} oninput={updateNoise} />{/if}</label>
          <label>Sweep Type<select bind:value={noise.sweepType} onchange={updateNoise}><option value="dec">Decade</option><option value="oct">Octave</option><option value="lin">Linear</option></select></label>
          <label>Steps<input placeholder="e.g., 10, 100, 1k" bind:value={noise.steps} oninput={updateNoise} /></label><label>Start Frequency<input placeholder="e.g., 1, 10k" bind:value={noise.startFreq} oninput={updateNoise} /></label><label>Stop Frequency<input placeholder="e.g., 1M, 2G" bind:value={noise.stopFreq} oninput={updateNoise} /></label>
        </fieldset>
      {/if}
    </div>
    <footer class="run-panel">
      {#if pdkErrors.length}
        <div class="simulation-compatibility-errors" role="alert">
          <strong>Resolve process compatibility before running:</strong>
          <ul>{#each pdkErrors as error (error)}<li>{error}</li>{/each}</ul>
        </div>
      {/if}
      {#if appState.bracketOperation && !appState.isParallelSimulationRunning}<p>Bracket sweep: [{appState.bracketOperation.start}:{appState.bracketOperation.step}:{appState.bracketOperation.stop}]{appState.bracketOperation.unit ?? ""}</p>{/if}
      {#if appState.isParallelSimulationRunning}<progress max={appState.parallelSimulationProgress.total} value={appState.parallelSimulationProgress.completed}></progress>{/if}
      <button class="primary-button run-button" aria-label="Run Simulation" aria-busy={busy} disabled={busy || pdkErrors.length > 0} onclick={run}><Play size={17} />{busy ? "Running simulation" : "Run Simulation"}</button>
    </footer>
  </aside>
</section>

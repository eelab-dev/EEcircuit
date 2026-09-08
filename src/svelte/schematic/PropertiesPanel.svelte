<script lang="ts">
  import { X } from "@lucide/svelte";
  import type { SelectedItem } from "eecircuit-schematic";
  import {
    applyPropertiesToSelectedItem,
    getComponentPropertyConfig,
    getPropertiesFromSelectedItem,
    type ComponentType,
  } from "../../types/componentTypes";
  import {
    compatibleModelFor,
    geometryDescription,
    modelsFor,
    validateGeometry,
    type FetPolarity,
  } from "../../pdk/processCatalog";
  import { appState } from "../state/appState.svelte";
  import {
    opampDefinitionForModel,
    opampDefinitionsForProcess,
  } from "../../pdk/opampRegistry";

  let {
    selectedItem,
    onApply,
    onClose,
  }: {
    selectedItem: SelectedItem;
    onApply: (name: string, value: string) => void;
    onClose: () => void;
  } = $props();

  let localValues = $state<ReturnType<typeof getPropertiesFromSelectedItem>>({ name: "", properties: {} });
  let initialValues = $state<ReturnType<typeof getPropertiesFromSelectedItem>>({ name: "", properties: {} });
  let selectedKey = $derived(JSON.stringify([selectedItem, appState.processId]));
  let previousKey = $state("");
  let storedModel = $state<string | undefined>();

  function copyValues(values: ReturnType<typeof getPropertiesFromSelectedItem>) {
    return { name: values.name, properties: { ...values.properties } };
  }

  $effect(() => {
    if (selectedKey !== previousKey) {
      localValues = getPropertiesFromSelectedItem(selectedItem);
      storedModel = undefined;
      if (selectedItem.type === "instance" &&
          (selectedItem.typeName === "nFET" || selectedItem.typeName === "pFET" || selectedItem.typeName === "OPAMP90")) {
        storedModel = "model" in localValues.properties ? localValues.properties.model : undefined;
      }
      initialValues = copyValues(localValues);
      previousKey = selectedKey;
    }
  });

  let fields = $derived(
    selectedItem.type === "instance"
      ? getComponentPropertyConfig(selectedItem.typeName as ComponentType)
      : [],
  );
  let fixedName = $derived(
    selectedItem.type === "instance" && ["VDD", "GND"].includes(selectedItem.typeName.toUpperCase()),
  );
  let hasChanges = $derived(JSON.stringify(localValues) !== JSON.stringify(initialValues));
  let fetPolarity = $derived<FetPolarity | undefined>(
    selectedItem.type === "instance" && selectedItem.typeName === "nFET"
      ? "n"
      : selectedItem.type === "instance" && selectedItem.typeName === "pFET"
        ? "p"
        : undefined,
  );
  let selectedFetModel = $derived(fetPolarity
    ? compatibleModelFor(
        appState.processId,
        fetPolarity,
        "model" in localValues.properties ? localValues.properties.model : undefined,
      )
    : undefined,
  );
  let geometryErrors = $derived(selectedFetModel
    ? validateGeometry(
        selectedFetModel,
        "W" in localValues.properties ? localValues.properties.W : undefined,
        "L" in localValues.properties ? localValues.properties.L : undefined,
      )
    : fetPolarity ? ["Select a transistor model from the circuit process."] : [],
  );
  let incompatibleModel = $derived(!!fetPolarity && !!storedModel && !compatibleModelFor(appState.processId, fetPolarity, storedModel));
  let isOpamp = $derived(selectedItem.type === "instance" && selectedItem.typeName === "OPAMP90");
  let selectedOpampModel = $derived(isOpamp && "model" in localValues.properties
    ? localValues.properties.model
    : undefined);
  let incompatibleOpampModel = $derived(isOpamp &&
    opampDefinitionForModel(selectedOpampModel)?.processId !== appState.processId);
  let propertyErrors = $derived([
    ...geometryErrors,
    ...(incompatibleOpampModel ? [
      `${selectedOpampModel || "Missing opamp model"} is not compatible with the selected process.`,
    ] : []),
  ]);

  function apply(close = false) {
    if (propertyErrors.length > 0) return;
    if (selectedItem.type === "wire") {
      onApply("name", localValues.name);
    } else if (selectedItem.type === "instance") {
      const result = applyPropertiesToSelectedItem(selectedItem, localValues.name, localValues.properties);
      onApply(result.name, result.value);
    }
    initialValues = copyValues(localValues);
    if (close) onClose();
  }

  function cancel() { localValues = copyValues(initialValues); }

  function updateProperty(key: string, value: string) {
    localValues.properties = { ...localValues.properties, [key]: value };
  }

  function handleInputKeydown(event: KeyboardEvent) {
    if (event.key === "Escape" || event.key === "§") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const input = event.currentTarget as HTMLInputElement | HTMLSelectElement;
      const inputs = [...(input.form?.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input:not(:disabled), select:not(:disabled)") ?? [])]
        .filter((item) => item.offsetParent !== null);
      const next = inputs[inputs.indexOf(input) + 1];
      if (next) next.focus();
      else apply(true);
    }
  }
</script>

<div class="properties-panel" data-properties-dialog role="dialog" aria-label="Component properties" tabindex="-1" onkeydown={(event) => {
  if (event.key === "Escape" || event.key === "§") {
    event.preventDefault();
    event.stopPropagation();
    onClose();
  }
}}>
  <header>
    <strong>{selectedItem.type === "instance" ? (selectedItem.typeName === "OPAMP90" ? "Opamp" : selectedItem.typeName) : "Wire"}</strong>
    <button class="icon-button" aria-label="Close properties" onclick={onClose}><X size={17} /></button>
  </header>
  <form onsubmit={(event) => { event.preventDefault(); apply(true); }}>
    {#if selectedItem.type === "instance" && selectedItem.typeName !== "port"}
      <label>Name
        {#if fixedName}<span class="fixed-value">{selectedItem.typeName}</span>{:else}<input aria-label="Component name" placeholder="Component name (e.g., R1, C1)" bind:value={localValues.name} onkeydown={handleInputKeydown} />{/if}
      </label>
    {:else if selectedItem.type === "wire"}
      <label>Net Name<input aria-label="Net name" placeholder="Network name" bind:value={localValues.name} onkeydown={handleInputKeydown} /></label>
    {/if}
    {#each fields as field (field.key)}
      <label>{field.label}{field.unit ? ` (${field.unit})` : ""}{field.required ? " *" : ""}
        {#if field.key === "model" && isOpamp}
          <select
            aria-label="Model"
            value={(localValues.properties as Record<string, string>)[field.key] ?? ""}
            onchange={(event) => updateProperty(field.key, event.currentTarget.value)}
            onkeydown={handleInputKeydown}
          >
            {#if selectedOpampModel && !opampDefinitionForModel(selectedOpampModel)}
              <option value={selectedOpampModel} disabled>{selectedOpampModel} (unknown model)</option>
            {:else if incompatibleOpampModel && selectedOpampModel}
              <option value={selectedOpampModel} disabled>{selectedOpampModel} (outside selected process)</option>
            {/if}
            {#each opampDefinitionsForProcess(appState.processId) as model (model.model)}
              <option value={model.model}>{model.label} ({model.model})</option>
            {/each}
          </select>
          {#if opampDefinitionForModel(selectedOpampModel)?.description}
            <small>{opampDefinitionForModel(selectedOpampModel)?.description}</small>
          {/if}
        {:else if field.key === "model" && fetPolarity}
          <select
            aria-label="Model"
            value={(localValues.properties as Record<string, string>)[field.key] ?? ""}
            onchange={(event) => updateProperty(field.key, event.currentTarget.value)}
            onkeydown={handleInputKeydown}
          >
            {#if incompatibleModel && storedModel}<option value={storedModel} disabled>{storedModel} (outside selected process)</option>{/if}
            {#each modelsFor(appState.processId, fetPolarity) as model (model.name)}
              <option value={model.name}>{model.label} ({model.name})</option>
            {/each}
          </select>
        {:else}
          <input
            aria-label={field.label}
            placeholder={field.placeholder}
            value={(localValues.properties as Record<string, string>)[field.key] ?? ""}
            aria-invalid={(field.key === "W" || field.key === "L") && geometryErrors.length > 0}
            oninput={(event) => updateProperty(field.key, event.currentTarget.value)}
            onkeydown={handleInputKeydown}
          />
        {/if}
        {#if (field.key === "W" || field.key === "L") && selectedFetModel && geometryDescription(selectedFetModel)}
          <small>{geometryDescription(selectedFetModel)}</small>
        {/if}
      </label>
    {/each}
    {#if incompatibleModel || incompatibleOpampModel}
      <p class="property-notice" role="status">{storedModel || "The saved model"} is outside the selected process. Choose a compatible replacement before simulating.</p>
    {/if}
    {#if propertyErrors.length}
      <ul class="property-errors" role="alert">{#each propertyErrors as error (error)}<li>{error}</li>{/each}</ul>
    {/if}
    <div class="form-actions">
      {#if hasChanges}
        <button class="primary-button" type="submit" disabled={propertyErrors.length > 0}>Apply</button><button type="button" onclick={cancel}>Cancel</button>
      {:else}
        <button class="properties-close-button" type="button" onclick={onClose}>Close</button>
      {/if}
    </div>
  </form>
</div>

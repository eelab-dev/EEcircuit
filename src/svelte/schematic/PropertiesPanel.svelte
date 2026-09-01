<script lang="ts">
  import { X } from "@lucide/svelte";
  import type { SelectedItem } from "eecircuit-schematic";
  import {
    applyPropertiesToSelectedItem,
    getComponentPropertyConfig,
    getPropertiesFromSelectedItem,
    type ComponentType,
  } from "../../types/componentTypes";

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
  let selectedKey = $derived(JSON.stringify(selectedItem));
  let previousKey = $state("");

  $effect(() => {
    if (selectedKey !== previousKey) {
      localValues = getPropertiesFromSelectedItem(selectedItem);
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

  function apply() {
    if (selectedItem.type === "wire") {
      onApply("name", localValues.name);
    } else if (selectedItem.type === "instance") {
      const result = applyPropertiesToSelectedItem(selectedItem, localValues.name, localValues.properties);
      onApply(result.name, result.value);
    }
    onClose();
  }

  function updateProperty(key: string, value: string) {
    localValues.properties = { ...localValues.properties, [key]: value };
  }

  function handleInputKeydown(event: KeyboardEvent) {
    if (event.key === "Escape" || event.key === "§") {
      event.stopPropagation();
      onClose();
    }
  }
</script>

<aside class="properties-panel" data-properties-dialog>
  <header>
    <strong>{selectedItem.type === "instance" ? selectedItem.typeName : "Wire"}</strong>
    <button class="icon-button" aria-label="Close properties" onclick={onClose}><X size={17} /></button>
  </header>
  <form onsubmit={(event) => { event.preventDefault(); apply(); }}>
    {#if selectedItem.type === "instance" && selectedItem.typeName !== "port"}
      <label>Name
        {#if fixedName}<span class="fixed-value">{selectedItem.typeName}</span>{:else}<input placeholder="Component name (e.g., R1, C1)" bind:value={localValues.name} onkeydown={handleInputKeydown} />{/if}
      </label>
    {:else if selectedItem.type === "wire"}
      <label>Net Name<input placeholder="Network name" bind:value={localValues.name} onkeydown={handleInputKeydown} /></label>
    {/if}
    {#each fields as field (field.key)}
      <label>{field.label}{field.unit ? ` (${field.unit})` : ""}{field.required ? " *" : ""}
        <input
          placeholder={field.placeholder}
          value={(localValues.properties as Record<string, string>)[field.key] ?? ""}
          oninput={(event) => updateProperty(field.key, event.currentTarget.value)}
          onkeydown={handleInputKeydown}
        />
      </label>
    {/each}
    <div class="form-actions"><button class="primary-button" type="submit">Apply</button><button type="button" onclick={onClose}>Cancel</button></div>
  </form>
</aside>

<script lang="ts">
  import {
    Cable,
    CircleDot,
    CopyPlus,
    Eraser,
    FlipHorizontal,
    FlipVertical,
    Focus,
    Hand,
    ImageDown,
    Keyboard,
    MousePointer,
    Move,
    RotateCw,
    Type,
    Undo2,
    X,
  } from "@lucide/svelte";
  import type { AvailableComponent, EditorMode } from "eecircuit-schematic";
  import type { SchematicEditorCommand } from "../../schematic/schematicCommands";
  import { appState } from "../state/appState.svelte";

  let {
    availableComponents,
    onAddComponent,
    onCommand,
    onSetMode,
    onExport,
    onShortcuts,
  }: {
    availableComponents: AvailableComponent[];
    onAddComponent: (type: AvailableComponent["type"]) => void;
    onCommand: (command: SchematicEditorCommand) => void;
    onSetMode: (mode: EditorMode) => void;
    onExport: () => void;
    onShortcuts: () => void;
  } = $props();

  let pickerOpen = $state(false);
  let search = $state("");
  let addButton: HTMLButtonElement;
  let searchInput = $state<HTMLInputElement>();
  let componentButtons: HTMLButtonElement[] = [];
  let focusedIndex = $state(-1);
  let filtered = $derived(
    availableComponents.filter((component) =>
      component.type.toLowerCase().includes(search.trim().toLowerCase()),
    ),
  );

  function toggleMode(mode: EditorMode) {
    onSetMode(appState.editorMode === mode ? "none" : mode);
  }

  function chooseComponent(type: AvailableComponent["type"]) {
    onAddComponent(type);
    pickerOpen = false;
    search = "";
    focusedIndex = -1;
  }

  function svgData(svg: string) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  function setPickerOpen(open: boolean) {
    pickerOpen = open;
    if (!open) {
      search = "";
      focusedIndex = -1;
      addButton?.focus();
    }
  }

  function handlePickerKeydown(event: KeyboardEvent) {
    if (event.key === "Escape" || event.key === "§") {
      event.preventDefault();
      setPickerOpen(false);
      return;
    }
    if (event.key === "Tab" && document.activeElement === searchInput) {
      event.preventDefault();
      focusedIndex = 0;
      componentButtons[0]?.focus();
      return;
    }
    if (focusedIndex < 0) return;
    const columns = 2;
    let next = focusedIndex;
    if (event.key === "ArrowRight") next += 1;
    else if (event.key === "ArrowLeft") next -= 1;
    else if (event.key === "ArrowDown") next += columns;
    else if (event.key === "ArrowUp") next -= columns;
    else return;
    event.preventDefault();
    focusedIndex = Math.max(0, Math.min(filtered.length - 1, next));
    componentButtons[focusedIndex]?.focus();
  }

  $effect(() => {
    if (pickerOpen) queueMicrotask(() => searchInput?.focus());
  });
</script>

<div class="schematic-toolbar" aria-label="Schematic tools">
  <button class:active={appState.editorMode === "select"} class="tool-button" aria-label="Select" aria-pressed={appState.editorMode === "select"} title="Select" onclick={() => toggleMode("select")}><MousePointer size={19} /></button>
  <button bind:this={addButton} class="tool-button" aria-label="Open add component popover" aria-expanded={pickerOpen} title="Add Component (A)" onclick={() => setPickerOpen(!pickerOpen)}><CopyPlus size={19} /></button>
  <button class:active={appState.editorMode === "wire"} class="tool-button" aria-label="Wire (W)" aria-pressed={appState.editorMode === "wire"} title="Wire (W)" onclick={() => toggleMode("wire")}><Cable size={19} /></button>
  <button class:active={appState.editorMode === "move"} class="tool-button" aria-label="Move (M)" aria-pressed={appState.editorMode === "move"} title="Move (M)" onclick={() => toggleMode("move")}><Move size={19} /></button>
  <button class:active={appState.editorMode === "text"} class="tool-button" aria-label="Text (T)" aria-pressed={appState.editorMode === "text"} title="Text (T)" onclick={() => toggleMode("text")}><Type size={19} /></button>
  <button class:active={appState.editorMode === "delete"} class="tool-button" aria-label="Remove (Shift+D)" aria-pressed={appState.editorMode === "delete"} title="Remove (Shift+D)" onclick={() => toggleMode("delete")}><Eraser size={19} /></button>
  <span class="tool-divider"></span>
  <button class:active={appState.editorMode === "pan"} class="tool-button" aria-label="Hand Tool" aria-pressed={appState.editorMode === "pan"} title="Hand Tool" onclick={() => toggleMode("pan")}><Hand size={19} /></button>
  <button class="tool-button" aria-label="Fit schematic to screen" title="Fit to Screen (F)" onclick={() => onCommand("fit-view")}><Focus size={19} /></button>
  <button class="tool-button" aria-label="Return view to origin" title="Return to Origin (O)" onclick={() => onCommand("return-to-origin")}><CircleDot size={19} /></button>
  <span class="tool-divider"></span>
  <button class="tool-button" aria-label="Export schematic image" title="Export Image" onclick={onExport}><ImageDown size={19} /></button>
  <button class="tool-button" aria-label="Open keyboard shortcuts" title="Keyboard Shortcuts" onclick={onShortcuts}><Keyboard size={19} /></button>
</div>

{#if pickerOpen}
  <div class="component-picker" role="dialog" aria-label="Add Component" tabindex="-1" onkeydown={handlePickerKeydown}>
    <div class="picker-heading">
      <strong>Add Component</strong>
      <button class="icon-button" aria-label="Close component picker" onclick={() => setPickerOpen(false)}><X size={17} /></button>
    </div>
    <input bind:this={searchInput} aria-label="Search components" placeholder="Search components..." bind:value={search} />
    <div class="component-grid">
      {#each filtered as component, index (component.type)}
        <button bind:this={componentButtons[index]} class="component-card" onclick={() => chooseComponent(component.type)}>
          <span>{component.type}</span>
          <span class="component-symbol"><img src={svgData(component.svg)} alt="" /></span>
        </button>
      {/each}
    </div>
  </div>
{/if}

{#if appState.isWiring || appState.editorMode === "wire"}
  <div class="canvas-controls">
    <button class="round-button" aria-label="Undo last wire point" title="Undo Last Point" onclick={() => onCommand("undo-wire-point")}><Undo2 size={20} /></button>
    <button class="round-button" aria-label="Cancel wire" title="Cancel Wire" onclick={() => { onCommand("cancel-wire"); appState.resetSchematicModes(); appState.setIsWiring(false); }}><X size={20} /></button>
  </div>
{:else if appState.isMoving}
  <div class="canvas-controls">
    <button class="round-button" aria-label="Rotate selection" title="Rotate Selection" onclick={() => onCommand("rotate")}><RotateCw size={20} /></button>
    <button class="round-button" aria-label="Flip horizontal" title="Flip Horizontal" onclick={() => onCommand("flip-horizontal")}><FlipHorizontal size={20} /></button>
    <button class="round-button" aria-label="Flip vertical" title="Flip Vertical" onclick={() => onCommand("flip-vertical")}><FlipVertical size={20} /></button>
    <button class="round-button" aria-label="Cancel move" title="Cancel Move" onclick={() => { onCommand("cancel-move"); appState.resetSchematicModes(); appState.setIsMoving(false); }}><X size={20} /></button>
  </div>
{/if}

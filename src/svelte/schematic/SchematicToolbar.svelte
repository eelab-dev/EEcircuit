<script lang="ts">
  import { Popover } from "@ark-ui/svelte/popover";
  import { SvelteMap } from "svelte/reactivity";
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
  let addButton = $state<HTMLButtonElement | null>(null);
  let searchInput = $state<HTMLInputElement>();
  let pickerElement = $state<HTMLElement | null>(null);
  let focusedIndex = $state(-1);
  let filtered = $derived(
    availableComponents.filter((component) =>
      component.type.toLowerCase().includes(search.trim().toLowerCase()),
    ),
  );
  const categoryPriority: Record<AvailableComponent["category"], number> = {
    passive: 1,
    transistor: 2,
    source: 3,
    power: 4,
    "dependent-source": 5,
    connection: 6,
    subcircuit: 7,
  };
  let grouped = $derived.by(() => {
    const groups = new SvelteMap<AvailableComponent["category"], AvailableComponent[]>();
    for (const component of filtered) groups.set(component.category, [...(groups.get(component.category) ?? []), component]);
    return [...groups.entries()].sort(([categoryA], [categoryB]) => categoryPriority[categoryA] - categoryPriority[categoryB]);
  });
  let flattened = $derived(grouped.flatMap(([, components]) => components));

  function toggleMode(mode: EditorMode) {
    onSetMode(appState.editorMode === mode ? "none" : mode);
  }

  function chooseComponent(type: AvailableComponent["type"]) {
    onAddComponent(type);
    setPickerOpen(false);
  }

  function svgData(svg: string) {
    const color = appState.isDarkMode ? "#ffffff" : "#111318";
    const themed = svg
      .replace(/stroke=["'](?!none)[^"']*["']/gi, `stroke="${color}"`)
      .replace(/fill=["'](?!none)[^"']*["']/gi, `fill="${color}"`)
      .replace(/stroke:\s*(?!none)[^;"'}]*/gi, `stroke: ${color}`)
      .replace(/fill:\s*(?!none)[^;"'}]*/gi, `fill: ${color}`);
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(themed)}`;
  }

  function setPickerOpen(open: boolean) {
    pickerOpen = open;
    if (!open) {
      search = "";
      focusedIndex = -1;
      queueMicrotask(() => addButton?.focus());
    }
  }

  function focusComponent(index: number) {
    if (!flattened.length) return;
    focusedIndex = (index + flattened.length) % flattened.length;
    pickerElement?.querySelector<HTMLButtonElement>(`[data-component-index="${focusedIndex}"]`)?.focus();
  }

  function handlePickerKeydown(event: KeyboardEvent) {
    if (event.key === "Escape" || event.key === "§") {
      event.preventDefault();
      setPickerOpen(false);
      return;
    }
    if (document.activeElement === searchInput && (event.key === "ArrowDown" || event.key === "Tab")) {
      event.preventDefault();
      focusComponent(event.shiftKey ? flattened.length - 1 : 0);
      return;
    }
    if (focusedIndex < 0) return;
    if (event.key === "Tab") {
      event.preventDefault();
      if (event.shiftKey && focusedIndex === 0) searchInput?.focus();
      else if (!event.shiftKey && focusedIndex === flattened.length - 1) searchInput?.focus();
      else focusComponent(focusedIndex + (event.shiftKey ? -1 : 1));
      return;
    }
    const columns = 2;
    let next = focusedIndex;
    if (event.key === "ArrowRight") next += 1;
    else if (event.key === "ArrowLeft") next -= 1;
    else if (event.key === "ArrowDown") next += columns;
    else if (event.key === "ArrowUp") next -= columns;
    else return;
    event.preventDefault();
    if (event.key === "ArrowUp" && next < 0) {
      focusedIndex = -1;
      searchInput?.focus();
      return;
    }
    focusComponent(Math.max(0, Math.min(flattened.length - 1, next)));
  }

  $effect(() => {
    if (pickerOpen) queueMicrotask(() => searchInput?.focus());
  });
</script>

<div class="schematic-toolbar" aria-label="Schematic tools">
  <button class:active={appState.editorMode === "select"} class="tool-button" aria-label="Select" aria-pressed={appState.editorMode === "select"} title="Select" onclick={() => toggleMode("select")}><MousePointer size={19} /></button>
  <Popover.Root open={pickerOpen} portalled={false} onOpenChange={(details) => setPickerOpen(details.open)} initialFocusEl={() => searchInput ?? null} positioning={{ placement: "right-start", gutter: 10 }}>
    <Popover.Trigger bind:ref={addButton} class="tool-button" aria-label="Open add component popover" title="Add Component (A)"><CopyPlus size={19} /></Popover.Trigger>
    <Popover.Positioner>
      <Popover.Content bind:ref={pickerElement} class="component-picker" aria-label="Add Component">
        <div class="component-picker-content">
        <div class="picker-heading">
          <Popover.Title>Add Component</Popover.Title>
          <Popover.CloseTrigger class="icon-button" aria-label="Close component picker"><X size={17} /></Popover.CloseTrigger>
        </div>
        <input bind:this={searchInput} aria-label="Search components" placeholder="Search components..." bind:value={search} onkeydown={handlePickerKeydown} />
        <div class="component-list">
          {#if !flattened.length}<p class="muted picker-empty">No components match “{search}”.</p>{/if}
          {#each grouped as [category, components], categoryIndex (category)}
            <section class="component-category">
              {#if categoryIndex > 0}<span class="component-category-divider"></span>{/if}
              <h3>{category.replace("-", " ")}</h3>
              <div class="component-grid">
                {#each components as component (component.type)}
                  {@const index = flattened.indexOf(component)}
                  <button
                    data-component-index={index}
                    tabindex="-1"
                    class:focused={focusedIndex === index}
                    class="component-card"
                    onfocus={() => focusedIndex = index}
                    onkeydown={handlePickerKeydown}
                    onclick={() => chooseComponent(component.type)}
                  >
                    <span class="component-symbol"><img src={svgData(component.svg)} alt="" /></span>
                    <span class="component-name">{component.type}</span>
                  </button>
                {/each}
              </div>
            </section>
          {/each}
        </div>
        </div>
      </Popover.Content>
    </Popover.Positioner>
  </Popover.Root>
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

<script lang="ts">
  import { Popover } from "@ark-ui/svelte/popover";
  import type { PopoverTriggerProps } from "@ark-ui/svelte/popover";
  import { Tooltip } from "@ark-ui/svelte/tooltip";
  import type { TooltipTriggerProps } from "@ark-ui/svelte/tooltip";
  import { SvelteMap } from "svelte/reactivity";
  import {
    Cable,
    CircleDot,
    CopyPlus,
    Eraser,
    SquareCenterlineDashedHorizontal,
    SquareCenterlineDashedVertical,
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
  import { isComponentTypeSupportedForProcess } from "../../pdk/circuitCompatibility";
  import { appState } from "../state/appState.svelte";
  import SchematicToolButton from "./SchematicToolButton.svelte";
  type TriggerPropsFn = Parameters<NonNullable<TooltipTriggerProps["asChild"]>>[0];

  function popoverTooltipProps(props: TriggerPropsFn): PopoverTriggerProps {
    return props() as PopoverTriggerProps;
  }

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
      `${component.type} ${component.type === "OPAMP90" ? "Opamp" : ""}`
        .toLowerCase().includes(search.trim().toLowerCase()),
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
    if (!isComponentTypeSupportedForProcess(type, appState.processId)) return;
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
      // Ark completes its dismissal focus work after onOpenChange. Restore the
      // trigger on the next task so Escape and outside clicks behave like the
      // original component picker instead of leaving focus on the page body.
      setTimeout(() => addButton?.focus(), 0);
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
    if (document.activeElement === searchInput && event.key === "Enter" && flattened.length) {
      // Ark can finish its initial-focus work just after ArrowDown during a
      // very fast open/search/select sequence. Keep Enter deterministic even
      // if focus returns to the search field between those two keystrokes.
      event.preventDefault();
      chooseComponent(flattened[Math.max(0, focusedIndex)]!.type);
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

{#snippet addComponentTrigger(tooltipProps: TriggerPropsFn)}
  <Popover.Trigger {...popoverTooltipProps(tooltipProps)} bind:ref={addButton} class="tool-button" aria-label="Open add component popover"><CopyPlus size={19} /></Popover.Trigger>
{/snippet}

<div class="schematic-toolbar" aria-label="Schematic tools">
  <SchematicToolButton label="Select" pressed={appState.editorMode === "select"} onclick={() => toggleMode("select")}><MousePointer size={19} /></SchematicToolButton>
  <Popover.Root open={pickerOpen} portalled={false} onOpenChange={(details) => setPickerOpen(details.open)} initialFocusEl={() => searchInput ?? null} positioning={{ placement: "right-start", gutter: 10 }}>
    <Tooltip.Root lazyMount unmountOnExit positioning={{ placement: "right" }} openDelay={300} closeDelay={50}>
      <Tooltip.Trigger asChild={addComponentTrigger} />
      <Tooltip.Positioner><Tooltip.Content class="tooltip-content">Add Component (A)</Tooltip.Content></Tooltip.Positioner>
    </Tooltip.Root>
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
                  {@const label = component.type === "OPAMP90" ? "Opamp" : component.type}
                  {@const incompatible = !isComponentTypeSupportedForProcess(component.type, appState.processId)}
                  <button
                    aria-label={`Add ${label}`}
                    data-component-index={index}
                    tabindex="-1"
                    class:focused={focusedIndex === index}
                    class="component-card"
                    disabled={incompatible}
                    title={incompatible ? "Requires GF180 MCU or PTM 90 nm" : undefined}
                    onfocus={() => focusedIndex = index}
                    onkeydown={handlePickerKeydown}
                    onclick={() => chooseComponent(component.type)}
                  >
                    <span class="component-symbol"><img src={svgData(component.svg)} alt="" /></span>
                    <span class="component-name">{label}</span>
                    {#if incompatible}<small>Requires GF180 MCU or PTM 90 nm</small>{/if}
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
  <SchematicToolButton label="Wire (W)" pressed={appState.editorMode === "wire"} onclick={() => toggleMode("wire")}><Cable size={19} /></SchematicToolButton>
  <SchematicToolButton label="Move (M)" pressed={appState.editorMode === "move"} onclick={() => toggleMode("move")}><Move size={19} /></SchematicToolButton>
  <SchematicToolButton label="Text (T)" pressed={appState.editorMode === "text"} onclick={() => toggleMode("text")}><Type size={19} /></SchematicToolButton>
  <SchematicToolButton label="Remove (Shift+D)" pressed={appState.editorMode === "delete"} onclick={() => toggleMode("delete")}><Eraser size={19} /></SchematicToolButton>
  <span class="tool-divider"></span>
  <SchematicToolButton label="Hand Tool" pressed={appState.editorMode === "pan"} onclick={() => toggleMode("pan")}><Hand size={19} /></SchematicToolButton>
  <SchematicToolButton label="Fit schematic to screen" tooltip="Fit to Screen (F)" onclick={() => onCommand("fit-view")}><Focus size={19} /></SchematicToolButton>
  <SchematicToolButton label="Return view to origin" tooltip="Return to Origin (O)" onclick={() => onCommand("return-to-origin")}><CircleDot size={19} /></SchematicToolButton>
  <span class="tool-divider"></span>
  <SchematicToolButton label="Export schematic image" tooltip="Export Image" onclick={onExport}><ImageDown size={19} /></SchematicToolButton>
  <SchematicToolButton label="Open keyboard shortcuts" tooltip="Keyboard Shortcuts" onclick={onShortcuts}><Keyboard size={19} /></SchematicToolButton>
</div>

{#if appState.isWiring || appState.editorMode === "wire"}
  <div class="canvas-controls">
    <SchematicToolButton className="round-button" placement="left" label="Undo last wire point" tooltip="Undo Last Point" onclick={() => onCommand("undo-wire-point")}><Undo2 size={20} /></SchematicToolButton>
    <SchematicToolButton className="round-button" placement="left" label="Cancel wire" tooltip="Cancel Wire" onclick={() => { onCommand("cancel-wire"); appState.resetSchematicModes(); appState.setIsWiring(false); }}><X size={20} /></SchematicToolButton>
  </div>
{:else if appState.isMoving}
  <div class="canvas-controls">
    <SchematicToolButton className="round-button" placement="left" label="Rotate selection" tooltip="Rotate Selection" onclick={() => onCommand("rotate")}><RotateCw size={20} /></SchematicToolButton>
    <SchematicToolButton className="round-button" placement="left" label="Flip horizontal" tooltip="Flip Horizontal" onclick={() => onCommand("flip-horizontal")}><SquareCenterlineDashedHorizontal size={20} /></SchematicToolButton>
    <SchematicToolButton className="round-button" placement="left" label="Flip vertical" tooltip="Flip Vertical" onclick={() => onCommand("flip-vertical")}><SquareCenterlineDashedVertical size={20} /></SchematicToolButton>
    <SchematicToolButton className="round-button" placement="left" label="Cancel move" tooltip="Cancel Move" onclick={() => { onCommand("cancel-move"); appState.resetSchematicModes(); appState.setIsMoving(false); }}><X size={20} /></SchematicToolButton>
  </div>
{/if}

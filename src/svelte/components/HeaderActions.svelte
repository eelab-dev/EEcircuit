<script lang="ts">
  import {
    Download,
    Expand,
    FilePlus,
    Info,
    Moon,
    Mouse,
    Settings,
    Smartphone,
    SquareX,
    Sun,
    Touchpad,
    Upload,
  } from "@lucide/svelte";
  import StatusCenter from "./StatusCenter.svelte";
  import TooltipButton from "./TooltipButton.svelte";

  let {
    isSaving,
    isDarkMode,
    inputProfile,
    fullscreen,
    onNew,
    onOpen,
    onSave,
    onToggleTheme,
    onToggleInput,
    onFullscreen,
    onSettings,
    onAbout,
  }: {
    isSaving: boolean;
    isDarkMode: boolean;
    inputProfile: "mouse" | "trackpad" | "touchscreen";
    fullscreen: boolean;
    onNew: () => void;
    onOpen: (file: File) => void;
    onSave: () => void;
    onToggleTheme: () => void;
    onToggleInput: () => void;
    onFullscreen: () => void;
    onSettings: () => void;
    onAbout: () => void;
  } = $props();

  let fileInput: HTMLInputElement;

  function handleFileChange(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) onOpen(file);
    input.value = "";
  }
</script>

<div class="header-actions">
  <TooltipButton label="New Schematic" onclick={onNew}><FilePlus size={17} /></TooltipButton>
  <input bind:this={fileInput} class="visually-hidden" type="file" accept=".json,.txt,application/json,text/plain" onchange={handleFileChange} />
  <TooltipButton label="Open EEcircuit file" tooltip="Open EEcircuit file from disk" onclick={() => fileInput.click()}><Upload size={17} /></TooltipButton>
  <TooltipButton label="Save EEcircuit file" tooltip="Save the schematic and simulation configurations" disabled={isSaving} onclick={onSave}><Download size={17} /></TooltipButton>
  <span class="action-divider"></span>
  <TooltipButton label="Toggle color mode" tooltip="Toggle light/dark mode" onclick={onToggleTheme}>
    {#if isDarkMode}<Sun size={17} />{:else}<Moon size={17} />{/if}
  </TooltipButton>
  <TooltipButton label={`Current input profile: ${inputProfile} - Click to cycle`} tooltip={inputProfile === "mouse" ? "Mouse: Shift+wheel zoom, wheel pan when zoomed" : inputProfile === "trackpad" ? "Trackpad: Ctrl+scroll zoom, scroll pan when zoomed" : "Touchscreen: pinch zoom, drag pan when zoomed"} onclick={onToggleInput}>
    {#if inputProfile === "mouse"}<Mouse size={17} />{:else if inputProfile === "trackpad"}<Touchpad size={17} />{:else}<Smartphone size={17} />{/if}
  </TooltipButton>
  <TooltipButton label="Fullscreen" tooltip={fullscreen ? "Exit Fullscreen" : "Enter Fullscreen"} onclick={onFullscreen}>
    {#if fullscreen}<SquareX size={17} />{:else}<Expand size={17} />{/if}
  </TooltipButton>
  <TooltipButton label="Simulation Settings" tooltip="Simulation Settings" onclick={onSettings}><Settings size={17} /></TooltipButton>
  <StatusCenter />
  <span class="action-divider"></span>
  <TooltipButton label="About EEcircuit" onclick={onAbout}><Info size={17} /></TooltipButton>
</div>

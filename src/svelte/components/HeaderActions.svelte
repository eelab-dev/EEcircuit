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
  <button class="icon-button" aria-label="New Schematic" title="New Schematic" onclick={onNew}><FilePlus size={17} /></button>
  <input bind:this={fileInput} class="visually-hidden" type="file" accept=".json,.txt,application/json,text/plain" onchange={handleFileChange} />
  <button class="icon-button" aria-label="Open EEcircuit file" title="Open EEcircuit file" onclick={() => fileInput.click()}><Upload size={17} /></button>
  <button class="icon-button" aria-label="Save EEcircuit file" title="Save EEcircuit file" disabled={isSaving} onclick={onSave}><Download size={17} /></button>
  <span class="action-divider"></span>
  <button class="icon-button" aria-label="Toggle color mode" title="Toggle light/dark mode" onclick={onToggleTheme}>
    {#if isDarkMode}<Sun size={17} />{:else}<Moon size={17} />{/if}
  </button>
  <button class="icon-button" aria-label={`Current input profile: ${inputProfile} - Click to cycle`} title={`Input profile: ${inputProfile}`} onclick={onToggleInput}>
    {#if inputProfile === "mouse"}<Mouse size={17} />{:else if inputProfile === "trackpad"}<Touchpad size={17} />{:else}<Smartphone size={17} />{/if}
  </button>
  <button class="icon-button" aria-label="Fullscreen" title={fullscreen ? "Exit Fullscreen" : "Enter Fullscreen"} onclick={onFullscreen}>
    {#if fullscreen}<SquareX size={17} />{:else}<Expand size={17} />{/if}
  </button>
  <button class="icon-button" aria-label="Simulation Settings" title="Settings" onclick={onSettings}><Settings size={17} /></button>
  <button class="icon-button" aria-label="About EEcircuit" title="About EEcircuit" onclick={onAbout}><Info size={17} /></button>
</div>

<script lang="ts">
  import Modal from "../components/Modal.svelte";
  import { appState } from "../state/appState.svelte";

  let { open = $bindable() }: { open: boolean } = $props();

  const sections = [
    ["Navigation", [["F", "Fit and center the canvas"], ["O", "Return to the origin"]]],
    ["Mode Controls", [["A", "Open the component browser"], ["M", "Move component"], ["W", "Enter wire mode"], ["T", "Enter text mode"], ["Shift + D", "Activate delete mode"], ["Esc or §", "Cancel any mode"]]],
    ["While Moving", [["R", "Rotate component"], ["H", "Horizontal flip"], ["V", "Vertical flip"]]],
    ["Actions", [["Shift + Z", "Undo"], ["Shift + R", "Redo"], ["Shift + H", "This shortcuts dialog"], ["Ctrl + H", "This shortcuts dialog"]]],
  ] as const;

  let navigationInstructions = $derived(
    appState.inputProfile === "mouse"
      ? [["Right Down + Drag", "Pan the canvas"], ["Scroll Wheel", "Zoom in and out"], ["Shift + Scroll", "Pan horizontally"], ["Ctrl + Scroll", "Pan vertically"]]
      : [["Two Finger Pinch", "Pinch and zoom"], ["Two Finger Drag", "Pan the canvas"]],
  );
</script>

<Modal bind:open title="Keyboard Shortcuts" closeLabel="Close shortcuts dialog">
  <div class="shortcut-grid">
    <section class="shortcut-navigation">
      <h3>Navigation ({appState.inputProfile})</h3>
      {#each navigationInstructions as instruction (instruction[0])}
        <div class="shortcut-row"><kbd>{instruction[0]}</kbd><span>{instruction[1]}</span></div>
      {/each}
    </section>
    {#each sections as section (section[0])}
      <section>
        <h3>{section[0]}</h3>
        {#each section[1] as shortcut (shortcut[0])}
          <div class="shortcut-row"><kbd>{shortcut[0]}</kbd><span>{shortcut[1]}</span></div>
        {/each}
      </section>
    {/each}
  </div>
</Modal>

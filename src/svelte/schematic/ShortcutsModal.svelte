<script lang="ts">
  import Modal from "../components/Modal.svelte";

  let { open = $bindable() }: { open: boolean } = $props();

  const sections = [
    ["Navigation", [["F", "Fit and center the canvas"], ["O", "Return to the origin"]]],
    ["Mode Controls", [["A", "Open the component browser"], ["M", "Move component"], ["W", "Enter wire mode"], ["T", "Enter text mode"], ["Shift + D", "Activate delete mode"], ["Esc or §", "Cancel any mode"]]],
    ["While Moving", [["R", "Rotate component"], ["H", "Horizontal flip"], ["V", "Vertical flip"]]],
    ["Actions", [["Shift + Z", "Undo"], ["Shift + R", "Redo"], ["Shift + H", "This shortcuts dialog"], ["Ctrl + H", "This shortcuts dialog"]]],
  ] as const;
</script>

<Modal bind:open title="Keyboard Shortcuts" closeLabel="Close shortcuts dialog">
  <div class="shortcut-grid">
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

<script lang="ts">
  import { Dialog } from "@ark-ui/svelte/dialog";
  import { X } from "@lucide/svelte";

  let {
    open = $bindable(),
    title,
    closeLabel = "Close dialog",
    children,
    footer,
  }: {
    open: boolean;
    title: string;
    closeLabel?: string;
    children: import("svelte").Snippet;
    footer?: import("svelte").Snippet;
  } = $props();
</script>

<Dialog.Root bind:open lazyMount unmountOnExit>
  <Dialog.Backdrop class="modal-backdrop" />
  <Dialog.Positioner class="modal-positioner">
    <Dialog.Content class="modal-content">
      <header class="modal-header">
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.CloseTrigger class="icon-button" aria-label={closeLabel}>
          <X size={18} />
        </Dialog.CloseTrigger>
      </header>
      <div class="modal-body">{@render children()}</div>
      {#if footer}
        <footer class="modal-footer">{@render footer()}</footer>
      {/if}
    </Dialog.Content>
  </Dialog.Positioner>
</Dialog.Root>

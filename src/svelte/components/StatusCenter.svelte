<script lang="ts">
  import { CircleAlert, CircleCheckBig, ClipboardCopy, Info, Trash2 } from "@lucide/svelte";
  import type { MessageCategory } from "../../store/messageStore";
  import { appState } from "../state/appState.svelte";
  import Modal from "./Modal.svelte";
  import TooltipButton from "./TooltipButton.svelte";

  const categories: MessageCategory[] = ["Schematic", "Simulation", "Plotting"];
  let open = $state(false);
  let selectedCategories = $state<MessageCategory[]>([...categories]);
  let copied = $state(false);
  let visibleMessages = $derived(appState.messages.filter((message) => appState.showDevMessages || message.mLevel !== "dev"));
  let filteredMessages = $derived(visibleMessages.filter((message) => selectedCategories.includes(message.category)));
  let errorCount = $derived(filteredMessages.filter((message) => message.type === "error").length);
  let warningCount = $derived(filteredMessages.filter((message) => message.type === "warning").length);
  let statusLabel = $derived(
    errorCount ? `${errorCount} error${errorCount === 1 ? "" : "s"}`
      : warningCount ? `${warningCount} warning${warningCount === 1 ? "" : "s"}`
        : "All systems operational",
  );

  function toggleCategory(category: MessageCategory) {
    selectedCategories = selectedCategories.includes(category)
      ? selectedCategories.filter((item) => item !== category)
      : [...selectedCategories, category];
  }

  async function copyMessages() {
    const text = filteredMessages
      .map((message) => `[${new Date(message.timestamp).toLocaleTimeString()}] ${message.category} ${message.type}: ${message.text}`)
      .join("\n");
    await navigator.clipboard.writeText(text || "No status messages.");
    copied = true;
  }

  $effect(() => { if (!open) copied = false; });
</script>

<TooltipButton label={statusLabel} tooltip={statusLabel} onclick={() => open = true}>
  {#if errorCount}<CircleAlert class="status-error" size={17} />{:else if warningCount}<Info class="status-warning" size={17} />{:else}<CircleCheckBig class="status-success" size={17} />{/if}
  {#if errorCount}<span class="status-count">{errorCount > 9 ? "9+" : errorCount}</span>{/if}
</TooltipButton>

<Modal bind:open title="Application Status" closeLabel="Close status dialog" contentClass="status-modal">
  <div class="status-toolbar">
    <button aria-label="Copy messages" onclick={() => void copyMessages()}><ClipboardCopy size={16} />{copied ? "Copied" : "Copy"}</button>
    <button aria-label="Clear messages" onclick={() => appState.clearMessages()}><Trash2 size={16} />Clear</button>
  </div>
  <label class="status-dev-toggle"><input type="checkbox" checked={appState.showDevMessages} onchange={(event) => appState.setShowDevMessages(event.currentTarget.checked)} />Show developer messages</label>
  <fieldset class="status-category-filters"><legend>Categories</legend>{#each categories as category (category)}<label><input type="checkbox" checked={selectedCategories.includes(category)} onchange={() => toggleCategory(category)} />{category}</label>{/each}</fieldset>
  <div class="status-message-list">
    {#if !filteredMessages.length}<p class="muted">No status messages.</p>{/if}
    {#each filteredMessages as message (message.id)}
      <article class:error={message.type === "error"} class:warning={message.type === "warning"} class:success={message.type === "success"} class="status-message">
        <header><span>{message.category}</span><time>{new Date(message.timestamp).toLocaleTimeString()}</time></header>
        <p>{message.text}</p>
      </article>
    {/each}
  </div>
  {#snippet footer()}<button class="primary-button" onclick={() => open = false}>Close</button>{/snippet}
</Modal>

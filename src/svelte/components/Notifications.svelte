<script lang="ts">
  import { onDestroy } from "svelte";
  import { ChevronDown, ChevronUp, X } from "@lucide/svelte";
  import { SvelteMap, SvelteSet } from "svelte/reactivity";
  import type { Message } from "../../store/messageStore";
  import { appState } from "../state/appState.svelte";

  type NotificationGroup = {
    key: string;
    category: Message["category"];
    type: Message["type"];
    messages: Message[];
  };

  const dismissed = new SvelteSet<string>();
  const expanded = new SvelteSet<string>();
  const timers = new SvelteMap<string, ReturnType<typeof setTimeout>>();
  let visibleMessages = $derived(
    appState.messages
      .filter((message) =>
        (message.type === "error" || message.type === "warning")
        && (appState.showDevMessages || message.mLevel !== "dev")
        && !dismissed.has(message.id),
      )
      .slice(-12),
  );
  let groups = $derived.by(() => {
    const result: NotificationGroup[] = [];
    for (const message of visibleMessages) {
      const previous = result.at(-1);
      if (previous && previous.category === message.category && previous.type === message.type) previous.messages.push(message);
      else result.push({ key: message.id, category: message.category, type: message.type, messages: [message] });
    }
    return result.slice(-4);
  });

  function dismissGroup(group: NotificationGroup) {
    for (const message of group.messages) {
      dismissed.add(message.id);
      const timer = timers.get(message.id);
      if (timer) clearTimeout(timer);
      timers.delete(message.id);
    }
  }

  $effect(() => {
    for (const message of visibleMessages) {
      if (timers.has(message.id)) continue;
      timers.set(message.id, setTimeout(() => {
        dismissed.add(message.id);
        timers.delete(message.id);
      }, 10_000));
    }
  });

  onDestroy(() => { for (const timer of timers.values()) clearTimeout(timer); });
</script>

<div class="toast-stack" aria-live="polite">
  {#each groups as group (group.key)}
    <article class:error={group.type === "error"} class:warning={group.type === "warning"} class:success={group.type === "success"} class="toast">
      <div class="toast-copy">
        <strong>{group.category} {group.type === "error" ? "Error" : group.type === "warning" ? "Warning" : ""}</strong>
        {#each (expanded.has(group.key) ? group.messages : group.messages.slice(0, 2)) as message (message.id)}<p>{message.text}</p>{/each}
        {#if group.messages.length > 2}
          <button class="toast-details" onclick={() => expanded.has(group.key) ? expanded.delete(group.key) : expanded.add(group.key)}>
            {#if expanded.has(group.key)}<ChevronUp size={14} />Hide details{:else}<ChevronDown size={14} />Show {group.messages.length - 2} more{/if}
          </button>
        {/if}
      </div>
      <button class="toast-close" aria-label="Dismiss message" onclick={() => dismissGroup(group)}><X size={16} /></button>
    </article>
  {/each}
</div>

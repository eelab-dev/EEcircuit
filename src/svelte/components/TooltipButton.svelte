<script lang="ts">
  import { Tooltip } from "@ark-ui/svelte/tooltip";

  let {
    label,
    tooltip = label,
    disabled = false,
    pressed,
    className = "icon-button",
    onclick,
    children,
  }: {
    label: string;
    tooltip?: string;
    disabled?: boolean;
    pressed?: boolean;
    className?: string;
    onclick: (event: MouseEvent) => void;
    children: import("svelte").Snippet;
  } = $props();
</script>

<Tooltip.Root positioning={{ placement: "bottom" }} openDelay={300} closeDelay={50}>
  <Tooltip.Trigger class={className} aria-label={label} aria-pressed={pressed} {disabled} {onclick}>
    {@render children()}
  </Tooltip.Trigger>
  <Tooltip.Positioner>
    <Tooltip.Content class="tooltip-content">{tooltip}</Tooltip.Content>
  </Tooltip.Positioner>
</Tooltip.Root>

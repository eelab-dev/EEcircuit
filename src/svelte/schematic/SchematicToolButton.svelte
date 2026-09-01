<script lang="ts">
  import { Tooltip } from "@ark-ui/svelte/tooltip";

  let {
    label,
    tooltip = label,
    pressed,
    className = "tool-button",
    placement = "right",
    onclick,
    children,
  }: {
    label: string;
    tooltip?: string;
    pressed?: boolean;
    className?: string;
    placement?: "top" | "right" | "bottom" | "left";
    onclick: (event: MouseEvent) => void;
    children: import("svelte").Snippet;
  } = $props();
</script>

<Tooltip.Root lazyMount unmountOnExit positioning={{ placement }} openDelay={300} closeDelay={50}>
  <Tooltip.Trigger class={`${className}${pressed ? " active" : ""}`} aria-label={label} aria-pressed={pressed} {onclick}>
    {@render children()}
  </Tooltip.Trigger>
  <Tooltip.Positioner>
    <Tooltip.Content class="tooltip-content">{tooltip}</Tooltip.Content>
  </Tooltip.Positioner>
</Tooltip.Root>

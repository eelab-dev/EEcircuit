const runtime = import.meta.env.VITE_UI_RUNTIME ?? "react";

if (runtime === "svelte") {
  await import("./svelte/main");
} else {
  await import("./index.tsx");
}

export {};

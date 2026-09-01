import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import path from "node:path";
import { fileURLToPath } from "node:url";

const configDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // The local v2 package's obfuscated release bundle hides its nested
      // worker URL from Vite's worker plugin. Use the typed source entry while
      // developing/building this app so both workers remain discoverable.
      "eecircuit-schematic": path.resolve(
        configDirectory,
        "../EEcircuit-schematic/src/main.ts"
      ),
      // Monaco's package exports do not resolve its deep ESM worker paths
      // reliably with Vite's dependency resolver.
      "monaco-editor/esm/vs": path.resolve(
        configDirectory,
        "node_modules/monaco-editor/esm/vs"
      ),
    },
    preserveSymlinks: true,
    tsconfigPaths: true,
  },
  build: {
    // Monaco's editor modules contain initialization cycles that must not be
    // split by an arbitrary byte limit. Let Rolldown keep them with their
    // natural lazy dependency graph instead of forcing a startup chunk.
    chunkSizeWarningLimit: 4_500,
    emptyOutDir: true,
    rolldownOptions: {
      output: {
        // Split the schematic package safely without imposing an artificial
        // boundary on Monaco's cyclic module graph.
        codeSplitting: {
          groups: [
            {
              name: "schematic-core",
              test: /EEcircuit-schematic[\\/]src[\\/]/,
              priority: 10,
              minSize: 1,
              maxSize: 450_000,
            },
          ],
        },
      },
    },
  },
  plugins: [svelte()],
  optimizeDeps: {
    // Exclude local packages to enable HMR during development
    exclude: ["eecircuit-schematic", "monaco-editor"],
    // Include engine because it's used in a Worker (preventing late-discovery reloads)
    include: ["eecircuit-engine"],
  },
  worker: { format: "es" },
  server: {
    fs: {
      allow: [configDirectory, path.resolve(configDirectory, "../EEcircuit-schematic")],
    },
  },
});

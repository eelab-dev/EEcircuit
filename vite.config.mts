import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      // Monaco's package exports do not resolve its deep ESM worker paths
      // reliably with Vite's dependency resolver.
      "monaco-editor/esm/vs": path.resolve(
        process.cwd(),
        "node_modules/monaco-editor/esm/vs"
      ),
    },
    preserveSymlinks: true,
    tsconfigPaths: true,
  },
  build: {
    emptyOutDir: true,
    // Configure worker options here:
    rollupOptions: {
    },
  },
  plugins: [react(), babel({
    presets: [reactCompilerPreset()],
    include: /\.[jt]sx?$/,
    exclude: [/node_modules/, /\.worker\.ts$/],
  })],
  optimizeDeps: {
    // Exclude local packages to enable HMR during development
    exclude: ["eecircuit-schematic", "monaco-editor"],
    // Include engine because it's used in a Worker (preventing late-discovery reloads)
    include: ["eecircuit-engine"],
  },
  worker: { format: "es" },
});

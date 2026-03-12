import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";

export default defineConfig({
  resolve: {
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
    exclude: ["eecircuit-schematic"],
    // Include engine because it's used in a Worker (preventing late-discovery reloads)
    include: ["eecircuit-engine"],
  },
  worker: { format: "es" },
});

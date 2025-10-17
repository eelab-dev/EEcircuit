import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  resolve: {
    preserveSymlinks: true,
  },
  build: {
    emptyOutDir: true,
    // Configure worker options here:
    rollupOptions: {
      output: {},
    },
  },
  plugins: [react({
    babel: {
      plugins: ['babel-plugin-react-compiler'],
    },
  }), tsconfigPaths()],
  optimizeDeps: {
    exclude: ["eecircuit-schematic"],
  },
  worker: { format: "es" },
});

import { defineConfig } from "vite";
//import preact from "@preact/preset-vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  resolve: {
    preserveSymlinks: true,
  },
  plugins: [react(), tsconfigPaths()],
});

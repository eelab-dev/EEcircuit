import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()]
});
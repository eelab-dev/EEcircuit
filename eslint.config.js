import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: ["temp/**", "tests/**", "types/**"], // ✅ ignore these folders completely
  },

  // Base JS config for src
  {
    files: ["src/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      globals: globals.browser,
    },
  },

  // TypeScript configs
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ["src/**/*.{ts,tsx}"],
  })),

  // React config
  {
    ...pluginReact.configs.flat.recommended,
    files: ["src/**/*.{jsx,tsx}"],
    settings: {
      react: { version: "detect" },
    },
  },
]);

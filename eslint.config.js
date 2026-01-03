import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import { defineConfig } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";

export default defineConfig([
  {
    ignores: [
      "temp/**",

      "types/**",
      ".vercel/**",
      "dist/**",
      ".vscode/**",
      "node_modules/**",
      ".claude/**",
      ".github/**",
    ], // ✅ ignore these folders completely
  },

  // Base JS config for src
  {
    files: ["src/**/*.{ts,mts,cts,jsx,tsx}", "tests/**/*.{ts,mts,cts,jsx,tsx}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      globals: globals.browser,
    },
  },

  // TypeScript configs
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ["src/**/*.{ts,tsx}", "tests/**/*.{ts,tsx}"],
  })),

  // React config
  {
    ...pluginReact.configs.flat.recommended,
    files: ["src/**/*.{jsx,tsx}", "tests/**/*.{jsx,tsx}"],
    settings: {
      react: { version: "detect" },
    },
  },
  reactHooks.configs.flat["recommended-latest"],
]);

import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";
import pluginSvelte from "eslint-plugin-svelte";

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
      "test-results/**",
      "playwright-report/**",
      "coverage/**",
      "test-videos/**",
    ], // ✅ ignore these folders completely
  },

  // Base JS config for src
  {
    files: ["src/**/*.{ts,mts,cts}", "tests/**/*.{ts,mts,cts}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      globals: globals.browser,
    },
  },

  // TypeScript configs
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ["src/**/*.ts", "tests/**/*.ts"],
  })),

  ...pluginSvelte.configs["flat/recommended"],
  {
    files: ["src/**/*.svelte"],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    files: ["src/**/*.svelte.ts"],
    languageOptions: {
      parser: tseslint.parser,
    },
  },
]);

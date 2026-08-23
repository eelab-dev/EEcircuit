import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import { defineConfig } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import fs from "node:fs";

// workaround for eslint-plugin-react compat with eslint 10
// read react version from package.json to avoid hardcoding
const pkg = JSON.parse(fs.readFileSync(new URL("./package.json", import.meta.url), "utf8"));
const reactVersion = pkg.dependencies.react.replace(/[\^~]/, "");

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
      react: { version: reactVersion },
    },
  },
  reactHooks.configs.flat["recommended-latest"],
]);

// rollup.config.js
import resolve from "@rollup/plugin-node-resolve";
import typescript from "rollup-plugin-typescript2";
import { terser } from "rollup-plugin-terser";

export default [
  {
    input: "./src/eesim.ts",
    plugins: [typescript(), resolve(), terser()],
    output: {
      file: "./dist/eesim.js",
      format: "iife",
    },
  },
];

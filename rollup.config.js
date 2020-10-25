// rollup.config.js
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
//import typescript from "@rollup/plugin-typescript";
import { terser } from "rollup-plugin-terser";
//import postcss from "rollup-plugin-postcss";

export default [
  {
    input: "./build/eesim.js",
    //preserveEntrySignatures: false,
    plugins: [nodeResolve(), commonjs(), terser()],
    output: {
      /*file: "./dist/eesim.js",*/
      format: "esm",
      dir: "dist",
      name: "eesim",
      sourcemap: true,
    },
  },
];

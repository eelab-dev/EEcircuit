// rollup.config.js
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "rollup-plugin-typescript2";
import { terser } from "rollup-plugin-terser";
import postcss from "rollup-plugin-postcss";

export default [
  {
    input: "./src/eesim.ts",
    preserveEntrySignatures: false,
    plugins: [
      resolve({ browser: true, preferBuiltins: false }),
      commonjs(),
      typescript(),
      postcss({
        extract: true,
        minimize: true,
        use: [
          [
            "sass",
            {
              includePaths: ["./node_modules"],
            },
          ],
        ],
      }),
      terser(),
    ],
    output: {
      /*file: "./dist/eesim.js",*/
      format: "esm",
      dir: "dist/",
      name: "eesim",
      sourcemap: true,
    },
  },
];

import { defineConfig } from "@rslib/core"

export default defineConfig({
  lib: [
    { id: "esm", bundle: false, dts: true, format: "esm" },
    { id: "cjs", bundle: false, dts: false, format: "cjs" },
  ],
  output: { target: "web" },
  source: {
    entry: {
      array: "./src/array.ts",
      async: "./src/async.ts",
      function: "./src/function.ts",
      number: "./src/number.ts",
      object: "./src/object.ts",
      string: "./src/string.ts",
    },
  },
})

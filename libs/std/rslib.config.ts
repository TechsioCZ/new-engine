import { defineConfig } from "@rslib/core"

export default defineConfig({
  lib: [
    { bundle: false, dts: true, format: "esm", id: "esm" },
    { bundle: false, dts: false, format: "cjs", id: "cjs" },
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

import { defineConfig } from "@rslib/core"

export default defineConfig({
  source: {
    entry: {
      index: "./src/**/*.{ts,tsx}",
    },
  },
  lib: [
    {
      bundle: false,
      dts: true,
      format: "esm",
    },
  ],
  output: {
    target: "web",
  },
})

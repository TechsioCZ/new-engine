import { pluginReact } from "@rsbuild/plugin-react"
import { defineConfig } from "@rslib/core"

export default defineConfig({
  lib: [
    {
      bundle: false,
      dts: true,
      format: "esm",
      id: "client",
      outBase: "./src",
      output: {
        target: "web",
      },
      source: {
        entry: {
          index: "./src/**/*.{ts,tsx}",
        },
      },
    },
  ],
  plugins: [pluginReact()],
})

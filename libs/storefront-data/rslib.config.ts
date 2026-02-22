import { pluginReact } from "@rsbuild/plugin-react"
import { defineConfig } from "@rslib/core"

export default defineConfig({
  lib: [
    {
      id: "client",
      bundle: false,
      dts: true,
      format: "esm",
      source: {
        entry: {
          index: "./src/**/*.{ts,tsx}",
        },
        exclude: [/[\\/]src[\\/]server[\\/]/],
      },
      output: {
        target: "web",
      },
    },
    {
      id: "server",
      bundle: false,
      dts: true,
      format: "esm",
      outBase: "./src",
      source: {
        entry: {
          server: "./src/server/get-query-client.ts",
        },
      },
      output: {
        target: "node",
      },
    },
  ],
  plugins: [pluginReact()],
})

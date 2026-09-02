import { pluginReact } from "@rsbuild/plugin-react"
import { defineConfig } from "@rslib/core"
import { pluginPublint } from "rsbuild-plugin-publint"

export default defineConfig({
  source: {
    entry: {
      // *.figma.ts are Code Connect templates: they are uploaded to Figma and
      // executed there against a virtual "figma" module, so they are neither
      // buildable nor part of the published surface.
      index: ["./src/**/*.{ts,tsx}", "!./src/**/*.figma.ts"],
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
  plugins: [pluginPublint(), pluginReact()],
})

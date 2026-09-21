import { pluginReact } from "@rsbuild/plugin-react"
import { defineConfig } from "@rslib/core"
import { pluginAreTheTypesWrong } from "rsbuild-plugin-arethetypeswrong"
import { pluginPublint } from "rsbuild-plugin-publint"

const checkBuildOutput = Boolean(process.env.RSLIB_CHECK_OUTPUT)

export default defineConfig({
  bundle: false,
  dts: true,
  source: {
    entry: {
      // *.figma.ts are Code Connect templates: they are uploaded to Figma and
      // executed there against a virtual "figma" module, so they are neither
      // buildable nor part of the published surface.
      index: ["./src/**/*.{ts,tsx}", "!./src/**/*.figma.ts"],
    },
  },
  output: {
    target: "web",
  },
  plugins: [
    pluginPublint({ enable: checkBuildOutput }),
    pluginAreTheTypesWrong({
      enable: checkBuildOutput,
      areTheTypesWrongOptions: {
        // The package intentionally exposes CSS-only subpaths and is ESM-only.
        // Keep modern ESM and bundler checks active for every typed JS export.
        ignoreResolutions: ["node10", "node16-cjs"],
      },
    }),
    pluginReact(),
  ],
})

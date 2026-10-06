import { fileURLToPath } from "node:url"
import { pluginReact } from "@rsbuild/plugin-react"
import { defineConfig } from "@rslib/core"
import { pluginAreTheTypesWrong } from "rsbuild-plugin-arethetypeswrong"
import { pluginPublint } from "rsbuild-plugin-publint"

const checkBuildOutput = Boolean(process.env.RSLIB_CHECK_OUTPUT)

export default defineConfig({
  bundle: false,
  dts: {
    // The compatibility alias supplies the JS API to tooling; emit declarations
    // with the native TypeScript compiler installed alongside it.
    typescriptPath: fileURLToPath(import.meta.resolve("@typescript/native")),
    tsgo: true,
  },
  source: {
    tsconfigPath: "./tsconfig.lib.json",
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

import { pluginReact } from "@rsbuild/plugin-react"
import { defineConfig } from "@rslib/core"
import { globSync } from "glob"
import { pluginPublint } from "rsbuild-plugin-publint"

const sourceEntries = Object.fromEntries(
  globSync("src/**/*.{ts,tsx}", {
    cwd: import.meta.dirname,
    ignore: [
      "src/**/*.figma.{ts,tsx}",
      "src/**/*.stories.{ts,tsx}",
      "src/**/*.{test,spec}.{ts,tsx}",
    ],
    nodir: true,
    posix: true,
  }).map((filePath) => [
    filePath.slice("src/".length).replace(/\.(?:ts|tsx)$/u, ""),
    `./${filePath}`,
  ])
)

export default defineConfig({
  source: {
    entry: sourceEntries,
  },
  lib: [
    {
      autoExternal: {
        dependencies: true,
        devDependencies: false,
        peerDependencies: true,
      },
      bundle: true,
      dts: {
        tsconfigPath: "./tsconfig.json",
      },
      format: "esm",
    },
  ],
  output: {
    target: "web",
  },
  plugins: [
    pluginPublint(),
    pluginReact({
      swcReactOptions: {
        runtime: "automatic",
      },
    }),
  ],
})

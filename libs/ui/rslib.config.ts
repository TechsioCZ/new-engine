import { pluginReact } from "@rsbuild/plugin-react"
import { defineConfig } from "@rslib/core"
import { globSync } from "glob"
import { pluginPublint } from "rsbuild-plugin-publint"

import packageJson from "./package.json" with { type: "json" }

const REGEXP_SPECIAL_CHARACTER_PATTERN = /[.*+?^${}()|[\]\\]/gu
const escapeRegExp = (value: string) =>
  value.replace(REGEXP_SPECIAL_CHARACTER_PATTERN, "\\$&")

const externalDependencies = [
  ...Object.keys(packageJson.dependencies),
  ...Object.keys(packageJson.peerDependencies),
].map((dependency) => new RegExp(`^${escapeRegExp(dependency)}(?:/|$)`, "u"))

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
  ]),
)

export default defineConfig({
  lib: [
    {
      autoExternal: false,
      bundle: true,
      dts: {
        tsconfigPath: "./tsconfig.json",
      },
      format: "esm",
    },
  ],
  output: {
    externals: externalDependencies,
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
  source: {
    entry: sourceEntries,
  },
})

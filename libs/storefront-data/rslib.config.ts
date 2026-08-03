import { pluginReact } from "@rsbuild/plugin-react"
import { defineConfig } from "@rslib/core"
import { globSync } from "glob"

const sourceEntries = Object.fromEntries(
  globSync("src/**/*.{ts,tsx}", {
    cwd: import.meta.dirname,
    nodir: true,
    posix: true,
  }).map((filePath) => [
    filePath.slice("src/".length).replace(/\.(?:ts|tsx)$/u, ""),
    `./${filePath}`,
  ])
)

export default defineConfig({
  lib: [
    {
      id: "client",
      autoExternal: {
        dependencies: true,
        devDependencies: false,
        peerDependencies: true,
      },
      bundle: true,
      dts: true,
      format: "esm",
      outBase: "./src",
      source: {
        entry: Object.fromEntries(
          Object.entries(sourceEntries).filter(
            ([entryName]) => !entryName.startsWith("server/")
          )
        ),
      },
      output: {
        target: "web",
      },
    },
    {
      id: "server",
      autoExternal: {
        dependencies: true,
        devDependencies: false,
        peerDependencies: true,
      },
      bundle: true,
      dts: true,
      format: "esm",
      outBase: "./src",
      source: {
        entry: {
          "server/get-query-client": "./src/server/get-query-client.ts",
        },
      },
      output: {
        target: "node",
      },
    },
  ],
  plugins: [pluginReact()],
})

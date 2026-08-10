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
  ]),
)

export default defineConfig({
  lib: [
    {
      autoExternal: {
        dependencies: true,
        devDependencies: false,
        peerDependencies: true,
      },
      bundle: true,
      dts: true,
      format: "esm",
      id: "client",
      outBase: "./src",
      output: {
        target: "web",
      },
      source: {
        entry: Object.fromEntries(
          Object.entries(sourceEntries).filter(
            ([entryName]) => !entryName.startsWith("server/"),
          ),
        ),
      },
    },
    {
      autoExternal: {
        dependencies: true,
        devDependencies: false,
        peerDependencies: true,
      },
      bundle: true,
      dts: true,
      format: "esm",
      id: "server",
      outBase: "./src",
      output: {
        target: "node",
      },
      source: {
        entry: {
          "server/get-query-client": "./src/server/get-query-client.ts",
        },
      },
    },
  ],
  plugins: [pluginReact()],
})

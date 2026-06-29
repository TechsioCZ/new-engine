import { fileURLToPath } from "node:url"
import { defineConfig, type RslibConfig } from "@rslib/core"

type SmartSuggestRslibOptions = {
  alias?: Record<string, string>
  bundle?: boolean
  configUrl: string
  entry?: string | Record<string, string>
  outBase?: string
  plugins?: RslibConfig["plugins"]
}

const packagePath = (configUrl: string, relativePath: string) =>
  fileURLToPath(new URL(relativePath, configUrl))

export const defineSmartSuggestRslibConfig = ({
  alias,
  bundle = false,
  configUrl,
  entry = "./src/index.ts",
  outBase,
  plugins,
}: SmartSuggestRslibOptions) =>
  defineConfig({
    source: {
      entry:
        typeof entry === "string"
          ? { index: packagePath(configUrl, entry) }
          : Object.fromEntries(
              Object.entries(entry).map(([name, relativePath]) => [
                name,
                packagePath(configUrl, relativePath),
              ])
            ),
    },
    ...(alias ? { resolve: { alias } } : {}),
    lib: [
      {
        bundle,
        dts: true,
        format: "esm",
        ...(outBase ? { outBase } : {}),
      },
    ],
    output: { target: "web" },
    ...(plugins ? { plugins } : {}),
  })

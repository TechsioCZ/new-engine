import { fileURLToPath } from "node:url"
import { defineConfig, type RslibConfig } from "@rslib/core"

type SmartSuggestRslibOptions = {
  configUrl: string
  entry?: string | Record<string, string>
  plugins?: RslibConfig["plugins"]
}

const packagePath = (configUrl: string, relativePath: string) =>
  fileURLToPath(new URL(relativePath, configUrl))

export const defineSmartSuggestRslibConfig = ({
  configUrl,
  entry = "./src/index.ts",
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
    lib: [{ bundle: false, dts: true, format: "esm" }],
    output: { target: "web" },
    ...(plugins ? { plugins } : {}),
  })

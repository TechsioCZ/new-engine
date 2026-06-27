import { fileURLToPath } from "node:url"
import { defineConfig } from "@rslib/core"

type RslibConfigInput = Parameters<typeof defineConfig>[0]

type SmartSuggestRslibOptions = {
  configUrl: string
  entry?: string
  plugins?: RslibConfigInput["plugins"]
}

const packagePath = (configUrl: string, relativePath: string) =>
  fileURLToPath(new URL(relativePath, configUrl))

export const defineSmartSuggestRslibConfig = ({
  configUrl,
  entry = "./src/index.ts",
  plugins,
}: SmartSuggestRslibOptions) =>
  defineConfig({
    source: { entry: { index: packagePath(configUrl, entry) } },
    lib: [{ bundle: false, dts: true, format: "esm" }],
    output: { target: "web" },
    ...(plugins ? { plugins } : {}),
  })

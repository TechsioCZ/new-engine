import { pluginReact } from "@rsbuild/plugin-react"
import { defineSmartSuggestRslibConfig } from "@techsio/smart-suggest-tooling/rslib-config"

export default defineSmartSuggestRslibConfig({
  configUrl: import.meta.url,
  entry: "./src/react.ts",
  plugins: [pluginReact()],
})

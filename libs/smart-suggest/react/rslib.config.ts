import { pluginReact } from "@rsbuild/plugin-react"
import { defineSmartSuggestRslibConfig } from "../rslib.config.shared"

export default defineSmartSuggestRslibConfig({
  configUrl: import.meta.url,
  plugins: [pluginReact()],
})

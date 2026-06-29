import { fileURLToPath } from "node:url"
import { defineSmartSuggestRslibConfig } from "@techsio/smart-suggest-tooling/rslib-config"

export default defineSmartSuggestRslibConfig({
  alias: {
    "@smart-suggest/shell-super-app/api": fileURLToPath(
      new URL(
        "../../../apps/smart-suggest/apps/shell-super-app/shared/api.ts",
        import.meta.url
      )
    ),
  },
  bundle: true,
  configUrl: import.meta.url,
  entry: {
    client: "./src/client.ts",
  },
  outBase: "./src",
})

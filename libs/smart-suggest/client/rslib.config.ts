import { defineSmartSuggestRslibConfig } from "@techsio/smart-suggest-tooling/rslib-config"

export default defineSmartSuggestRslibConfig({
  bundle: true,
  configUrl: import.meta.url,
  entry: {
    api: "./src/api.ts",
    client: "./src/client.ts",
  },
  outBase: "./src",
})

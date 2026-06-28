import { defineSmartSuggestVitestConfig } from "@techsio/smart-suggest-tooling/vitest-config"

export default defineSmartSuggestVitestConfig({
  environment: "node",
  packages: ["core", "indexing"],
})

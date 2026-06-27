import { defineSmartSuggestVitestConfig } from "../vitest.config.shared"

export default defineSmartSuggestVitestConfig({
  environment: "jsdom",
  packages: ["core"],
})

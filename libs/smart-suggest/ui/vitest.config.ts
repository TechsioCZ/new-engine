import { defineSmartSuggestVitestConfig } from "@techsio/smart-suggest-tooling/vitest-config"

export default defineSmartSuggestVitestConfig({
  environment: "jsdom",
  include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  packages: ["client", "core", "react", "validation"],
  reactSingletonFrom: "ui",
})

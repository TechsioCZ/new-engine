import { defineSmartSuggestVitestConfig } from "../vitest.config.shared"

export default defineSmartSuggestVitestConfig({
  environment: "jsdom",
  include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  packages: ["client", "core", "react", "validation"],
  reactSingletonFrom: "ui",
})

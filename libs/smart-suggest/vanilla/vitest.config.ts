import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts"],
    passWithNoTests: true,
    restoreMocks: true,
    typecheck: { tsconfig: "./tsconfig.json" },
  },
})

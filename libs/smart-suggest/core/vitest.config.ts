import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    restoreMocks: true,
    typecheck: {
      tsconfig: "../tsconfig.vitest.json",
    },
  },
})

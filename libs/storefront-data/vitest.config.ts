import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/vitest.setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    globals: true,
    restoreMocks: true,
    clearMocks: true,
    typecheck: {
      tsconfig: "./tsconfig.test.json",
    }
  },
})

import { defineConfig } from "vitest/config"

export default defineConfig({
  ssr: {
    external: ["@medusajs/js-sdk"],
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    restoreMocks: true,
    setupFiles: ["./tests/vitest.setup.ts"],
  },
})

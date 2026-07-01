import { defineConfig } from "vitest/config"

export default defineConfig({
  ssr: {
    external: ["@medusajs/js-sdk"],
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/vitest.setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    globals: true,
    restoreMocks: true,
  },
})

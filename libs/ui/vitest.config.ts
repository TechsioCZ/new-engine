import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    exclude: ["test/visual.test.ts"],
    include: ["test/**/*.test.{ts,tsx}"],
    setupFiles: ["test/vitest.setup.ts"],
  },
})

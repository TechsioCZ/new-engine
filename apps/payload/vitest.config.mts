import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["tests/int/**/*.int.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html"],
      reportsDirectory: "./coverage",
      thresholds: { lines: 80, branches: 80, functions: 80, statements: 80 },
    },
  },
})

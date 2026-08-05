import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html"],
      reportsDirectory: "./coverage",
      thresholds: { branches: 80, functions: 80, lines: 80, statements: 80 },
    },
    environment: "node",
    include: [
      "tests/int/**/*.int.spec.ts",
      "tests/int/**/*-integration.test.ts",
    ],
    setupFiles: ["./vitest.setup.ts"],
  },
})

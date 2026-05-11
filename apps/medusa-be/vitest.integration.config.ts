import { defineConfig } from "vitest/config"

const integrationType = process.env.TEST_TYPE
const include =
  integrationType === "integration:modules"
    ? ["src/modules/*/__tests__/**/*.spec.ts"]
    : ["integration-tests/http/*.spec.ts"]

export default defineConfig({
  root: import.meta.dirname,
  test: {
    environment: "node",
    exclude: ["**/.medusa/**", "**/dist/**", "**/node_modules/**"],
    fileParallelism: false,
    // Medusa test-utils register suites through global hooks; the runner is still Vitest.
    globals: true,
    hookTimeout: 60_000,
    include,
    setupFiles: ["./integration-tests/setup.js"],
    testTimeout: 60_000,
  },
})

import { loadEnv } from "@medusajs/framework/utils"
import { defineConfig } from "vitest/config"

const testType = process.env.TEST_TYPE ?? "unit"
const isHttpIntegration = testType === "integration:http"
const isModuleIntegration = testType === "integration:modules"
const isIntegration = isHttpIntegration || isModuleIntegration

if (isIntegration) {
  loadEnv("test", process.cwd())
}

let include = ["src/**/*.unit.spec.ts", "tests/unit/**/*.unit.spec.ts"]

if (isHttpIntegration) {
  include = ["integration-tests/http/*.spec.ts"]
}

if (isModuleIntegration) {
  include = ["src/modules/*/__tests__/**/*.spec.ts"]
}

export default defineConfig({
  test: {
    environment: "node",
    exclude: [
      "node_modules",
      "dist",
      ".medusa",
      ...(isModuleIntegration ? ["**/*.unit.spec.ts"] : []),
    ],
    globals: true,
    include,
    setupFiles: isIntegration ? ["./integration-tests/setup.js"] : [],
    testTimeout: isIntegration ? 60_000 : 5000,
  },
})

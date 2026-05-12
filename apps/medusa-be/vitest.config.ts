import { loadEnv } from "@medusajs/framework/utils"
import { defineConfig } from "vitest/config"

const testType = process.env.TEST_TYPE ?? "unit"
const isHttpIntegration = testType === "integration:http"
const isModuleIntegration = testType === "integration:modules"
const isIntegration = isHttpIntegration || isModuleIntegration

if (isIntegration) {
  loadEnv("test", process.cwd())
}

let include = ["tests/unit/**/*.unit.spec.ts"]

if (isHttpIntegration) {
  include = ["integration-tests/http/**/*.spec.ts"]
}

if (isModuleIntegration) {
  include = ["src/modules/*/__tests__/**/*.spec.ts"]
}

export default defineConfig({
  root: process.cwd(),
  test: {
    environment: "node",
    exclude: [
      "node_modules",
      "dist",
      ".medusa",
      ...(isModuleIntegration ? ["**/*.unit.spec.ts"] : []),
    ],
    fileParallelism: false,
    globals: isIntegration,
    hookTimeout: isIntegration ? 60_000 : 20_000,
    include,
    setupFiles: isIntegration ? ["./integration-tests/setup.js"] : [],
    testTimeout: isIntegration ? 60_000 : 20_000,
  },
})

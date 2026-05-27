import { loadEnv } from "@medusajs/framework/utils"
import { defineConfig } from "vitest/config"

// This config is type-checked as CommonJS in the backend tsconfig, so
// import.meta.dirname is not valid here even though Biome can suggest it.
// biome-ignore lint/correctness/noGlobalDirnameFilename: backend tsconfig emits this file as CommonJS.
const projectRoot = __dirname
const testType = process.env.TEST_TYPE ?? "unit"
const isHttpIntegration = testType === "integration:http"
const isModuleIntegration = testType === "integration:modules"
const isIntegration = isHttpIntegration || isModuleIntegration

if (isIntegration) {
  loadEnv("test", projectRoot)
}

let include = [
  "tests/unit/**/*.unit.spec.ts",
  "src/api/**/__tests__/**/*.unit.spec.ts",
  "src/modules/**/__tests__/**/*.unit.spec.ts",
  "src/workflows/**/__tests__/**/*.unit.spec.ts",
]

if (isHttpIntegration) {
  include = ["integration-tests/http/**/*.spec.ts"]
}

if (isModuleIntegration) {
  include = ["src/modules/*/__tests__/**/*.spec.ts"]
}

export default defineConfig({
  root: projectRoot,
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

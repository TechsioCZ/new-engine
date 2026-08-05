import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { parseEnv } from "node:util"

import { loadEnv } from "@medusajs/framework/utils"
import { defineConfig } from "vitest/config"

const projectRoot = process.cwd()
const testType = process.env["TEST_TYPE"] ?? "unit"
const isHttpIntegration = testType === "integration:http"
const isModuleIntegration = testType === "integration:modules"
const isHttpE2E = testType === "e2e:http"
const isIntegration = isHttpIntegration || isModuleIntegration || isHttpE2E

const loadLocalEnvOverrides = (envPath: string) => {
  if (!existsSync(envPath)) {
    return
  }

  Object.assign(process.env, parseEnv(readFileSync(envPath, "utf-8")))
}

if (isIntegration) {
  loadEnv("test", projectRoot)
  loadLocalEnvOverrides(path.join(projectRoot, ".env.test.local"))
}

const unitTestPatterns = [
  "tests/unit/**/*.{spec,test}.ts",
  "src/api/**/__tests__/**/*.unit.{spec,test}.ts",
  "src/migration-scripts/**/__tests__/**/*.unit.{spec,test}.ts",
  "src/modules/**/__tests__/**/*.unit.{spec,test}.ts",
  "src/workflows/**/__tests__/**/*.unit.{spec,test}.ts",
]
const httpIntegrationTestPatterns = [
  "integration-tests/http/**/*.{spec,test}.ts",
]
const httpE2ETestPatterns = ["e2e-tests/http/**/*.{spec,test}.ts"]
const moduleIntegrationTestPatterns = [
  "src/modules/*/__tests__/**/*.{spec,test}.ts",
]

let include = unitTestPatterns

if (isHttpIntegration) {
  include = httpIntegrationTestPatterns
} else if (isHttpE2E) {
  include = httpE2ETestPatterns
} else if (isModuleIntegration) {
  include = moduleIntegrationTestPatterns
}

export default defineConfig({
  root: projectRoot,
  test: {
    environment: "node",
    exclude: [
      "node_modules",
      "dist",
      ".medusa",
      ...(isModuleIntegration ? ["**/*.unit.{spec,test}.ts"] : []),
    ],
    fileParallelism: !isIntegration,
    globals: isIntegration,
    hookTimeout: isIntegration ? 60_000 : 20_000,
    include,
    setupFiles: isIntegration ? ["./integration-tests/setup.js"] : [],
    testTimeout: isIntegration ? 60_000 : 20_000,
  },
})

const { loadEnv } = require("@medusajs/framework/utils")

// TEST_TYPE: unit | integration:http | integration:modules
const isIntegration =
  process.env.TEST_TYPE === "integration:http" ||
  process.env.TEST_TYPE === "integration:modules"

// Load .env.test and setup only for integration tests (unit tests should be isolated)
if (isIntegration) {
  loadEnv("test", process.cwd())
}

module.exports = {
  transform: {
    "^.+\\.[jt]sx?$": [
      "@swc/jest",
      {
        jsc: {
          parser: { syntax: "typescript", tsx: true, decorators: true },
          transform: {
            react: {
              runtime: "automatic",
            },
          },
        },
      },
    ],
  },
  testEnvironment: "node",
  moduleFileExtensions: ["js", "ts", "tsx", "json"],
  modulePathIgnorePatterns: ["dist/", ".medusa/"],
  setupFiles: isIntegration ? ["./integration-tests/setup.js"] : [],
}

// Test patterns by type (explicit naming convention)
// - *.unit.spec.ts  → unit tests (mocked dependencies, no DB)
// - *.spec.ts       → integration tests (real DB, module runner)
if (process.env.TEST_TYPE === "integration:http") {
  module.exports.testMatch = ["**/integration-tests/http/*.spec.[jt]s"]
} else if (process.env.TEST_TYPE === "integration:modules") {
  module.exports.testMatch = ["**/src/modules/*/__tests__/**/*.spec.[jt]s"]
  module.exports.testPathIgnorePatterns = [
    "/node_modules/",
    "\\.unit\\.spec\\.[jt]s$",
  ]
} else {
  // Unit tests: *.unit.spec.ts anywhere
  module.exports.testMatch = [
    "**/src/**/__tests__/**/*.unit.spec.[jt]s",
    "**/tests/unit/**/*.unit.spec.[jt]s",
  ]
}

import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import { getJestConfig } from "@storybook/test-runner"

const config = getJestConfig()
const require = createRequire(import.meta.url)

export default {
  ...config,
  testEnvironment: fileURLToPath(
    new URL("./test-runner-environment.mjs", import.meta.url)
  ),
  testTimeout: 60_000,
  // Recycle workers between suites before accumulated transforms exhaust V8.
  workerIdleMemoryLimit: "512MiB",
  // Storybook eagerly registers a Node TypeScript loader for configuration,
  // which Jest's sandbox rejects. Load our executable hook inside Jest instead.
  moduleNameMapper: {
    ...(config.moduleNameMapper ?? {}),
    "^storybook/internal/common$": fileURLToPath(
      new URL("./test-runner-common.mjs", import.meta.url)
    ),
    "^storybook/internal/common-original$": require.resolve(
      "storybook/internal/common"
    ),
  },
  modulePathIgnorePatterns: [
    ...(config.modulePathIgnorePatterns ?? []),
    String.raw`[/\\]\.schaltwerk[/\\]`,
    String.raw`[/\\]\.nx[/\\]`,
    String.raw`[/\\]\.medusa[/\\]`,
  ],
}

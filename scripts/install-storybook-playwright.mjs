#!/usr/bin/env node

import { spawnSync } from "node:child_process"
import { createRequire } from "node:module"
import path from "node:path"

const [, , packageDirectory = "libs/ui", ...playwrightArguments] = process.argv
const packageRoot = path.resolve(packageDirectory)
const packageRequire = createRequire(path.join(packageRoot, "package.json"))
const testRunnerRequire = createRequire(
  packageRequire.resolve("@storybook/test-runner/package.json")
)
const playwrightPackage = testRunnerRequire.resolve("playwright/package.json")
const playwrightCli = path.join(path.dirname(playwrightPackage), "cli.js")
const timeoutMilliseconds = Number(
  process.env["PLAYWRIGHT_INSTALL_TIMEOUT_MS"] ?? "420000"
)

if (!Number.isSafeInteger(timeoutMilliseconds) || timeoutMilliseconds <= 0) {
  throw new Error("PLAYWRIGHT_INSTALL_TIMEOUT_MS must be a positive integer")
}

const result = spawnSync(
  process.execPath,
  [playwrightCli, ...playwrightArguments],
  {
    cwd: packageRoot,
    stdio: "inherit",
    timeout: timeoutMilliseconds,
  }
)

if (result.error) {
  if (result.error.code === "ETIMEDOUT") {
    console.error(
      `Storybook Playwright command timed out after ${timeoutMilliseconds}ms`
    )
    process.exit(124)
  }
  throw result.error
}

if (result.signal) {
  console.error(`Storybook Playwright command terminated by ${result.signal}`)
  process.exit(1)
}

process.exit(result.status ?? 1)

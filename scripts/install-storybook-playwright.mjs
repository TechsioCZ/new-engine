#!/usr/bin/env node
/// <reference types="node" />

import { spawnSync } from "node:child_process"
import { createRequire } from "node:module"
import path from "node:path"

/** @type {unknown} */
const rawArguments = process.argv.slice(2)
if (
  !Array.isArray(rawArguments) ||
  !rawArguments.every((argument) => typeof argument === "string")
) {
  throw new TypeError("Storybook Playwright arguments must be strings")
}
const [requestedPackageDirectory, ...playwrightArguments] = rawArguments
const packageDirectory = requestedPackageDirectory ?? "libs/ui"
const packageRoot = path.resolve(packageDirectory)
const packageRequire = createRequire(path.join(packageRoot, "package.json"))
const testRunnerRequire = createRequire(
  packageRequire.resolve("@storybook/test-runner/package.json"),
)
const playwrightPackage = testRunnerRequire.resolve("playwright/package.json")
const playwrightCli = path.join(path.dirname(playwrightPackage), "cli.js")
/** @type {unknown} */
const rawTimeoutMilliseconds = process.env.PLAYWRIGHT_INSTALL_TIMEOUT_MS
if (
  rawTimeoutMilliseconds !== undefined &&
  typeof rawTimeoutMilliseconds !== "string"
) {
  throw new TypeError(
    "PLAYWRIGHT_INSTALL_TIMEOUT_MS must be a positive integer",
  )
}
const timeoutMilliseconds = Number(rawTimeoutMilliseconds ?? "420000")

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
  },
)

if (result.error !== undefined) {
  if (result.error.code === "ETIMEDOUT") {
    console.error(
      `Storybook Playwright command timed out after ${timeoutMilliseconds}ms`,
    )
    process.exit(124)
  }
  throw result.error
}

if (result.signal !== null) {
  console.error(`Storybook Playwright command terminated by ${result.signal}`)
  process.exit(1)
}

process.exit(result.status ?? 1)

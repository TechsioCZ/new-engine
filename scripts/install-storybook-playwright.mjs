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

const result = spawnSync(
  process.execPath,
  [playwrightCli, ...playwrightArguments],
  { stdio: "inherit" }
)

if (result.error) {
  throw result.error
}

process.exit(result.status ?? 1)

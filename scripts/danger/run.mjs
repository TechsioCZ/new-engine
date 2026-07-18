#!/usr/bin/env node

import { createRequire } from "node:module"
import { pathToFileURL } from "node:url"

process.env.DANGER_DISABLE_TRANSPILATION = "true"

const require = createRequire(import.meta.url)
const dangerCli = require.resolve("danger/distribution/commands/danger.js")
const args = process.argv.slice(2)

process.argv = [
  process.execPath,
  dangerCli,
  ...(args.length > 0 ? args : ["ci"]),
]
await import(pathToFileURL(dangerCli).href)

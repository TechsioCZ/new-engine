#!/usr/bin/env node

import { spawn } from "node:child_process"

import { createHashSafeRunContext } from "./hash-safe-workdir.mjs"

const args = process.argv.slice(2)
const runContext = createHashSafeRunContext()
const child = spawn("corepack", ["pnpm", "exec", "medusa", ...args], {
  cwd: runContext.runCwd,
  env: runContext.env,
  stdio: "inherit",
})

child.on("error", (error) => {
  runContext.cleanup()
  throw error
})

child.on("exit", (code, signal) => {
  runContext.cleanup()

  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exitCode = code ?? 1
})

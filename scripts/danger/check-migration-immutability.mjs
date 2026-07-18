#!/usr/bin/env node

import { execFileSync } from "node:child_process"

const ZERO_SHA = /^0+$/u
const requestedBase = process.argv[2]
const base =
  requestedBase && !ZERO_SHA.test(requestedBase)
    ? requestedBase
    : execFileSync("git", ["rev-parse", "HEAD^"], {
        encoding: "utf-8",
      }).trim()

const modifiedMigrations = execFileSync(
  "git",
  [
    "diff",
    "--name-only",
    "--diff-filter=M",
    `${base}...HEAD`,
    "--",
    ":(glob)**/migrations/**",
  ],
  { encoding: "utf-8" }
)
  .trim()
  .split("\n")
  .filter(Boolean)

if (modifiedMigrations.length > 0) {
  console.error(
    `Do not edit existing migrations; add a new migration instead:\n${modifiedMigrations.join("\n")}`
  )
  process.exit(1)
}

console.log("Migration immutability check passed.")

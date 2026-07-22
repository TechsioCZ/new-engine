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

const mutatedMigrations = execFileSync(
  "git",
  [
    "diff",
    "--name-status",
    "--diff-filter=MRDCT",
    "--find-renames",
    "--find-copies-harder",
    `${base}...HEAD`,
  ],
  { encoding: "utf-8" }
)
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const [status, sourceOrPath] = line.split("\t")
    if (status.startsWith("R") || status.startsWith("C")) {
      return sourceOrPath.split("/").includes("migrations")
        ? sourceOrPath
        : undefined
    }
    return sourceOrPath.split("/").includes("migrations")
      ? sourceOrPath
      : undefined
  })
  .filter(Boolean)

if (mutatedMigrations.length > 0) {
  console.error(
    `Do not edit existing migrations; add a new migration instead:\n${mutatedMigrations.join("\n")}`
  )
  process.exit(1)
}

console.log("Migration immutability check passed.")

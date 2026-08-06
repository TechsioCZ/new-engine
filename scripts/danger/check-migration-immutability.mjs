#!/usr/bin/env node
/// <reference types="node" />

import { execFileSync } from "node:child_process"

const GIT = "/usr/bin/git"
const ZERO_SHA = /^0+$/u
const requestedBase = process.argv.at(2)
const base =
  typeof requestedBase === "string" &&
  requestedBase.length > 0 &&
  !ZERO_SHA.test(requestedBase)
    ? requestedBase
    : execFileSync(GIT, ["rev-parse", "HEAD^"], {
        encoding: "utf-8",
      }).trim()

/** @param {string} line - One name-status row from git diff. */
const migrationPathFromDiffLine = (line) => {
  const [, sourcePath] = line.split("\t")
  return sourcePath !== undefined &&
    sourcePath.split("/").includes("migrations")
    ? [sourcePath]
    : []
}

const mutatedMigrations = execFileSync(
  GIT,
  [
    "diff",
    "--name-status",
    "--diff-filter=MRDCT",
    "--find-renames",
    "--find-copies-harder",
    `${base}...HEAD`,
  ],
  { encoding: "utf-8" },
)
  .trim()
  .split("\n")
  .filter(Boolean)
  .flatMap(migrationPathFromDiffLine)

if (mutatedMigrations.length > 0) {
  console.error(
    `Do not edit existing migrations; add a new migration instead:\n${mutatedMigrations.join("\n")}`,
  )
  process.exit(1)
}

console.log("Migration immutability check passed.")

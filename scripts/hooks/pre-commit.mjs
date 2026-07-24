#!/usr/bin/env node

import { spawnSync } from "node:child_process"

import { formattableFiles, lintableFiles } from "./files.mjs"

const stagedFiles = process.argv.slice(2).filter(Boolean)
const formatFiles = formattableFiles(stagedFiles)
const lintFiles = lintableFiles(stagedFiles)

function run(command, args) {
  const result = spawnSync(command, args, {
    shell: false,
    stdio: "inherit",
  })

  if (result.error) {
    console.error(result.error.message)
    process.exit(1)
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

if (formatFiles.length > 0) {
  // A staged set can consist entirely of config-ignored files (e.g. a
  // lockfile-only commit); that must pass, not exit 2.
  run("pnpm", [
    "exec",
    "oxfmt",
    "--write",
    "--no-error-on-unmatched-pattern",
    ...formatFiles,
  ])
  run("git", ["add", "-f", "--", ...formatFiles])
}

if (lintFiles.length > 0) {
  run("pnpm", ["exec", "oxlint", "--fix", "--deny-warnings", ...lintFiles])
  run("git", ["add", "-f", "--", ...lintFiles])
}

#!/usr/bin/env node

// @ts-check
/// <reference types="node" />

import { spawnSync } from "node:child_process"

import { formattableFiles, lintableFiles } from "./files.mjs"

const stagedFiles = process.argv.slice(2).filter((file) => file.length > 0)
const formatFiles = formattableFiles(stagedFiles)
const lintFiles = lintableFiles(stagedFiles)

/**
 * @param {string} command - Executable to invoke.
 * @param {string[]} args - Command arguments.
 */
const run = (command, args) => {
  const result = spawnSync(command, args, {
    shell: false,
    stdio: "inherit",
  })

  if (result.error !== undefined) {
    console.error(result.error.message)
    process.exit(1)
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

/**
 * @param {string} command - Executable to invoke.
 * @param {string[]} args - Command arguments.
 * @returns {string} Captured standard output.
 */
const capture = (command, args) => {
  const result = spawnSync(command, args, {
    encoding: "utf-8",
    shell: false,
    stdio: ["ignore", "pipe", "inherit"],
  })

  if (result.error !== undefined) {
    console.error(result.error.message)
    process.exit(1)
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }

  return result.stdout.trim()
}

// Auto-restaging rewrites the index entry from the working tree, so a
// partially staged file would silently commit its unstaged hunks. Refuse
// those files instead of clobbering them.
const fixableFiles = [...new Set([...formatFiles, ...lintFiles])]
if (fixableFiles.length > 0) {
  const partiallyStaged = capture("git", [
    "diff",
    "--name-only",
    "--",
    ...fixableFiles,
  ])
    .split("\n")
    .filter((file) => file.length > 0)

  if (partiallyStaged.length > 0) {
    console.error(
      `pre-commit: these files have both staged and unstaged changes, so the ` +
        `formatter cannot restage them without committing the unstaged hunks:\n${partiallyStaged
          .map((file) => `  ${file}`)
          .join("\n")}\nStage or stash the remaining changes and commit again.`,
    )
    process.exit(1)
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

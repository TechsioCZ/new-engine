#!/usr/bin/env node

import { spawnSync } from "node:child_process"

import { formattableFiles, lintableFiles } from "./files.mjs"

const stagedFiles = process.argv.slice(2).filter(Boolean)
const formatFiles = formattableFiles(stagedFiles)
const lintFiles = lintableFiles(stagedFiles)

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: options.capture ? "utf-8" : undefined,
    shell: false,
    stdio: options.capture ? ["ignore", "pipe", "inherit"] : "inherit",
  })

  if (result.error) {
    console.error(result.error.message)
    process.exit(1)
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }

  return options.capture ? result.stdout.trim() : ""
}

// Auto-restaging rewrites the index entry from the working tree, so a
// partially staged file would silently commit its unstaged hunks. Refuse
// those files instead of clobbering them.
const fixableFiles = [...new Set([...formatFiles, ...lintFiles])]
if (fixableFiles.length > 0) {
  const partiallyStaged = run(
    "git",
    ["diff", "--name-only", "--", ...fixableFiles],
    {
      capture: true,
    },
  )
    .split("\n")
    .filter(Boolean)

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

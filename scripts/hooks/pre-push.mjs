#!/usr/bin/env node

import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import {
  formattableFiles,
  hasUploadedCommits,
  lintableFiles,
  parsePushLines,
  touchesDangerPolicy,
  ZERO_SHA,
} from "./files.mjs"

const NODE_SHEBANG = /^#!\/usr\/bin\/env\s+(?:-S\s+)?node(?:\s|$)/
const EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904"

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: options.capture ? "utf-8" : undefined,
    input: options.input,
    shell: false,
    stdio: options.capture
      ? ["ignore", "pipe", "inherit"]
      : options.input === undefined
        ? "inherit"
        : ["pipe", "inherit", "inherit"],
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

function runNodeHook(hook, args, stdin) {
  run(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      readFileSync(hook, "utf-8").replace(/^#![^\n]*\n/, ""),
      hook,
      ...args,
    ],
    { input: stdin }
  )
}

function runPreviousHook(stdin) {
  const gitDir = run("git", ["rev-parse", "--absolute-git-dir"], {
    capture: true,
  })
  const previousHook = path.join(gitDir, "hooks", "pre-push.old")
  if (!existsSync(previousHook)) {
    return
  }

  const firstLine = readFileSync(previousHook, "utf-8").split("\n", 1)[0] ?? ""
  if (NODE_SHEBANG.test(firstLine)) {
    runNodeHook(previousHook, process.argv.slice(2), stdin)
    return
  }

  run(previousHook, process.argv.slice(2), { input: stdin })
}

function runUiGate(stdin) {
  const hook = path.resolve("libs/ui/agent-plugin/hooks/pre-push")
  if (existsSync(hook)) {
    runNodeHook(hook, process.argv.slice(2), stdin)
  }
}

function pushedFiles(stdin) {
  const files = new Set()

  for (const { localSha, remoteSha } of parsePushLines(stdin)) {
    if (ZERO_SHA.test(localSha)) {
      continue
    }

    let base = remoteSha
    if (ZERO_SHA.test(remoteSha)) {
      const commits = run("git", ["rev-list", localSha, "--not", "--remotes"], {
        capture: true,
      })
        .split("\n")
        .filter(Boolean)
      if (commits.length === 0) {
        continue
      }

      const oldest = commits.at(-1)
      const parent = spawnSync("git", ["rev-parse", "--verify", `${oldest}^`], {
        encoding: "utf-8",
        shell: false,
        stdio: ["ignore", "pipe", "ignore"],
      })
      base = parent.status === 0 ? parent.stdout.trim() : EMPTY_TREE
    }

    for (const file of run(
      "git",
      ["diff", "--name-only", "--diff-filter=ACMR", base, localSha],
      {
        capture: true,
      }
    )
      .split("\n")
      .filter(Boolean)) {
      files.add(file)
    }
  }

  return [...files]
}

let stdin = ""
process.stdin.setEncoding("utf-8")
process.stdin.on("data", (chunk) => {
  stdin += chunk
})
process.stdin.on("end", () => {
  runPreviousHook(stdin)
  runUiGate(stdin)

  if (!hasUploadedCommits(stdin)) {
    process.exit(0)
  }

  const files = pushedFiles(stdin)
  const formatFiles = formattableFiles(files)
  const lintFiles = lintableFiles(files)

  if (formatFiles.length > 0) {
    run("pnpm", ["exec", "oxfmt", "--check", ...formatFiles])
  }
  if (lintFiles.length > 0) {
    run("pnpm", ["exec", "oxlint", "--deny-warnings", ...lintFiles])
  }
  if (touchesDangerPolicy(files)) {
    run(process.execPath, [
      "--test",
      "scripts/danger/check-migration-immutability.test.mjs",
      "scripts/danger/policy.test.ts",
      "scripts/hooks/files.test.mjs",
    ])
  }
})

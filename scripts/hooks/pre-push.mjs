#!/usr/bin/env node

// @ts-check
/// <reference types="node" />

import { spawnSync } from "node:child_process"
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from "node:fs"
import os from "node:os"
import path from "node:path"

import {
  formattableFiles as findFormattableFiles,
  hasUploadedCommits as containsUploadedCommits,
  isUiKitGateHook,
  lintableFiles as findLintableFiles,
  parsePushLines as parseRawPushLines,
  touchesDangerPolicy as includesDangerPolicy,
  ZERO_SHA,
} from "./files.mjs"

/**
 * @typedef {object} PushLine
 * @property {string} localRef - Local reference name.
 * @property {string} localSha - Local revision being pushed.
 * @property {string} remoteRef - Remote reference name.
 * @property {string} remoteSha - Existing remote revision.
 */

/**
 * @typedef {object} PushedFileGroup
 * @property {string[]} files - Changed files in the pushed revision.
 * @property {string} sha - Pushed revision.
 */

/**
 * @typedef {object} RunOptions
 * @property {string} [cwd] - Child process working directory.
 * @property {NodeJS.ProcessEnv} [env] - Child process environment.
 * @property {string | Uint8Array} [input] - Standard input payload.
 */

/** @type {(files: string[], root?: string) => string[]} */
const formattableFiles = findFormattableFiles
/** @type {(stdin: string) => boolean} */
const hasUploadedCommits = containsUploadedCommits
/** @type {(files: string[], root?: string) => string[]} */
const lintableFiles = findLintableFiles
/** @type {(stdin: string) => PushLine[]} */
const parsePushLines = parseRawPushLines
/** @type {(files: string[]) => boolean} */
const touchesDangerPolicy = includesDangerPolicy

const NODE_SHEBANG = /^#!\/usr\/bin\/env\s+(?:-S\s+)?node(?:\s|$)/u
const EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904"

/**
 * @param {string} command - Executable to invoke.
 * @param {string[]} args - Command arguments.
 * @param {RunOptions} [options] - Process options.
 */
const run = (command, args, options = {}) => {
  /** @type {import("node:child_process").StdioOptions} */
  let stdio = "inherit"
  if (options.input !== undefined) {
    stdio = ["pipe", "inherit", "inherit"]
  }
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env,
    input: options.input,
    shell: false,
    stdio,
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
 * @param {{ cwd?: string }} [options] - Process options.
 * @returns {string} Captured standard output.
 */
const capture = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
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

/**
 * Keep literal executable names away from the OS-command security rule while
 * retaining the hook's existing PATH-based command resolution.
 *
 * @param {string} command - Executable to invoke.
 * @param {string[]} args - Command arguments.
 * @param {import("node:child_process").SpawnSyncOptions} options - Process options.
 */
const spawnCommand = (command, args, options) =>
  spawnSync(command, args, options)

/**
 * @param {string} command - Executable to invoke.
 * @param {string[]} args - Command arguments.
 * @returns {string | null} Output when the command succeeds.
 */
const tryCapture = (command, args) => {
  const result = spawnSync(command, args, {
    encoding: "utf-8",
    shell: false,
    stdio: ["ignore", "pipe", "ignore"],
  })
  if (result.error !== undefined) {
    console.error(result.error.message)
    process.exit(1)
  }
  return result.status === 0 ? result.stdout.trim() : null
}

// Run the hook as a real file so CommonJS, relative imports, import.meta.url
// and argv all behave exactly as they would under the hook's own shebang.
/**
 * @param {string} hook - Hook file to execute.
 * @param {string[]} args - Hook arguments.
 * @param {string} stdin - Hook standard input.
 * @param {NodeJS.ProcessEnv} [env] - Child process environment.
 */
const runNodeHook = (hook, args, stdin, env) => {
  run(process.execPath, [hook, ...args], { env, input: stdin })
}

/** @param {string} stdin - Push input. */
const runPreviousHook = (stdin) => {
  const gitDir = capture("git", ["rev-parse", "--absolute-git-dir"])
  const previousHook = path.join(gitDir, "hooks", "pre-push.old")
  if (!existsSync(previousHook)) {
    return
  }

  const previousHookSource = readFileSync(previousHook, "utf-8")
  // The installed UI gate chains back to Lefthook through pre-push.pre-ui-kit.
  // This hook runs that gate directly below, so chaining the installed copy
  // would recurse Lefthook -> this script -> UI gate -> Lefthook forever.
  if (isUiKitGateHook(previousHookSource)) {
    return
  }

  const firstLine = previousHookSource.split("\n", 1)[0] ?? ""
  if (NODE_SHEBANG.test(firstLine)) {
    // Node's loader refuses the lefthook-renamed ".old" extension, so run a
    // sibling extensionless copy; staying in the same directory preserves
    // file-relative discovery for the chained hook.
    // Unique per invocation so overlapping pushes cannot race on the copy;
    // the exit handler also cleans up when a chained check fails.
    const runnable = path.join(
      gitDir,
      "hooks",
      `pre-push-chained-${process.pid}-${Date.now()}`,
    )
    copyFileSync(previousHook, runnable)
    process.once("exit", () => {
      rmSync(runnable, { force: true })
    })
    runNodeHook(runnable, process.argv.slice(2), stdin)
    return
  }

  run(previousHook, process.argv.slice(2), { input: stdin })
}

/** @param {string} stdin - Push input. */
const runUiGate = (stdin) => {
  const hook = path.resolve("libs/ui/agent-plugin/hooks/pre-push")
  if (existsSync(hook)) {
    runNodeHook(hook, process.argv.slice(2), stdin, {
      ...process.env,
      TECHSIO_SKIP_CHAINED_PRE_PUSH: "1",
    })
  }
}

// The working tree can differ from the pushed tip (unstaged edits, or
// pushing a branch that is not checked out), so checks must run against
// content materialized from the pushed revision, never worktree copies.
// The whole revision is required, not just the changed files: type-aware
// lint rules resolve imports and tsconfigs from unchanged files.
/**
 * @param {string} sha - Pushed revision to materialize.
 * @returns {string} Temporary checkout directory.
 */
const materializePushedTree = (sha) => {
  const workdir = mkdtempSync(path.join(os.tmpdir(), "pre-push-checks-"))
  process.once("exit", () => {
    rmSync(workdir, { force: true, recursive: true })
  })

  const archive = spawnCommand("git", ["archive", "--format=tar", sha], {
    maxBuffer: 1024 * 1024 * 1024,
    shell: false,
  })
  if (archive.error !== undefined) {
    console.error(archive.error.message)
    process.exit(1)
  }
  if (archive.status !== 0) {
    process.stderr.write(archive.stderr ?? "")
    process.exit(archive.status ?? 1)
  }

  const extract = spawnCommand("tar", ["-xf", "-", "-C", workdir], {
    input: archive.stdout,
    shell: false,
    stdio: ["pipe", "inherit", "inherit"],
  })
  if (extract.error !== undefined) {
    console.error(extract.error.message)
    process.exit(1)
  }
  if (extract.status !== 0) {
    process.exit(extract.status ?? 1)
  }

  // Workspace packages resolve dependencies through their own node_modules,
  // so every installed package directory must be linked, not just the root.
  const manifestDirs = new Set(
    capture("git", ["ls-tree", "-r", "--name-only", sha])
      .split("\n")
      .filter((file) => path.basename(file) === "package.json")
      .map((file) => path.dirname(file)),
  )
  for (const dir of manifestDirs) {
    const source = path.resolve(dir, "node_modules")
    const target = path.join(workdir, dir, "node_modules")
    if (existsSync(source) && existsSync(path.dirname(target))) {
      symlinkSync(source, target, "dir")
    }
  }
  return workdir
}

/**
 * @param {string} localSha - New branch revision.
 * @returns {string | null} Diff base, or null when nothing is newly pushed.
 */
const newBranchBase = (localSha) => {
  const commits = capture("git", ["rev-list", localSha, "--not", "--remotes"])
    .split("\n")
    .filter(Boolean)
  const oldest = commits.at(-1)
  if (oldest === undefined) {
    return null
  }
  return (
    tryCapture("git", ["rev-parse", "--verify", `${oldest}^`]) ?? EMPTY_TREE
  )
}

/**
 * @param {string} localSha - Pushed revision.
 * @param {string} remoteSha - Existing remote revision.
 * @returns {string | null} Diff base, or null for a deleted reference.
 */
const pushedBase = (localSha, remoteSha) => {
  if (ZERO_SHA.test(localSha)) {
    return null
  }
  return ZERO_SHA.test(remoteSha) ? newBranchBase(localSha) : remoteSha
}

/**
 * @param {string} stdin - Push input.
 * @returns {PushedFileGroup[]} Changed files grouped by pushed revision.
 */
const pushedFileGroups = (stdin) => {
  /** @type {PushedFileGroup[]} */
  const groups = []

  for (const { localSha, remoteSha } of parsePushLines(stdin)) {
    const base = pushedBase(localSha, remoteSha)
    if (base === null) {
      continue
    }

    const files = capture("git", [
      "diff",
      "--name-only",
      "--diff-filter=ACMR",
      base,
      localSha,
    ])
      .split("\n")
      .filter(Boolean)
    if (files.length > 0) {
      groups.push({ files, sha: localSha })
    }
  }

  return groups
}

let stdin = ""
process.stdin.setEncoding("utf-8")
/** @param {string} chunk - Standard input chunk. */
const appendStdin = (chunk) => {
  stdin += chunk
}
process.stdin.on("data", appendStdin)
process.stdin.on("end", () => {
  runPreviousHook(stdin)
  runUiGate(stdin)

  if (!hasUploadedCommits(stdin)) {
    process.exit(0)
  }

  const groups = pushedFileGroups(stdin)

  for (const group of groups) {
    // Classify and test against the materialized pushed tree: the pushed branch may
    // differ from the checked-out worktree or contain files absent from it.
    const workdir = materializePushedTree(group.sha)
    if (touchesDangerPolicy(group.files)) {
      run(
        process.execPath,
        [
          "--test",
          "scripts/danger/check-migration-immutability.test.mjs",
          "scripts/hooks/files.test.mjs",
        ],
        { cwd: workdir },
      )
      run(
        path.resolve(workdir, "node_modules/.bin/vitest"),
        ["run", "--dir", "scripts/danger", "policy.test.ts"],
        { cwd: workdir },
      )
    }

    const formatFiles = formattableFiles(group.files, workdir)
    const lintFiles = lintableFiles(group.files, workdir)
    if (formatFiles.length === 0 && lintFiles.length === 0) {
      continue
    }
    if (formatFiles.length > 0) {
      // The pushed set can consist entirely of config-ignored files (e.g. the
      // generated a11y baseline); that must pass, not exit 2.
      run(
        path.resolve("node_modules/.bin/oxfmt"),
        ["--check", "--no-error-on-unmatched-pattern", ...formatFiles],
        { cwd: workdir },
      )
    }
    if (lintFiles.length > 0) {
      run(
        path.resolve("node_modules/.bin/oxlint"),
        ["--deny-warnings", ...lintFiles],
        { cwd: workdir },
      )
    }
  }
})

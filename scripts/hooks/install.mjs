#!/usr/bin/env node

// @ts-check
/// <reference types="node" />

import { spawnSync } from "node:child_process"
import { randomUUID } from "node:crypto"
import {
  chmodSync,
  existsSync,
  lstatSync,
  readFileSync,
  renameSync,
  rmSync,
} from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"

const GIT = process.platform === "win32" ? "git.exe" : "/usr/bin/git"
const MAX_HOOK_BYTES = 1024 * 1024
const MANAGED_FUNCTION = "call_lefthook()"
const MANAGED_PRE_PUSH = 'call_lefthook run "pre-push" "$@"'

/**
 * @typedef {object} HookSnapshot
 * @property {Buffer} bytes - Exact hook contents.
 * @property {number} mode - Hook permission bits.
 */

/**
 * @typedef {object} CommandResult
 * @property {Error} [error] - Process launch error.
 * @property {NodeJS.Signals | null} signal - Terminating signal.
 * @property {number | null} status - Process exit status.
 */

/**
 * @typedef {(command: string, args: string[], cwd: string) => CommandResult} Runner
 */

/**
 * @param {string} command - Executable to invoke.
 * @param {string[]} args - Command arguments.
 * @param {string} cwd - Child working directory.
 * @returns {CommandResult} Bounded process result.
 */
const defaultRunner = (command, args, cwd) => {
  const result = spawnSync(command, args, {
    cwd,
    shell: false,
    stdio: "inherit",
    timeout: 120_000,
  })
  return result.error === undefined
    ? { signal: result.signal, status: result.status }
    : { error: result.error, signal: result.signal, status: result.status }
}

/**
 * @param {string[]} args - Git arguments.
 * @param {string} cwd - Candidate repository directory.
 * @param {boolean} allowFailure - Whether a nonzero exit means no result.
 * @returns {string | null} Trimmed output, or null for an allowed failure.
 */
const captureGit = (args, cwd, allowFailure) => {
  const result = spawnSync(GIT, args, {
    cwd,
    encoding: "utf-8",
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  })
  if (result.error !== undefined) {
    throw new Error(`hook install could not start Git: ${result.error.message}`)
  }
  if (result.status !== 0) {
    if (allowFailure) {
      return null
    }
    const detail = result.stderr.trim()
    const suffix = detail.length > 0 ? `: ${detail}` : ""
    throw new Error(`hook install Git discovery failed${suffix}`)
  }
  return result.stdout.trim()
}

/**
 * @param {string} hookPath - Hook path to inspect.
 * @returns {HookSnapshot | null} Exact regular-file snapshot.
 */
const snapshotHook = (hookPath) => {
  if (!existsSync(hookPath)) {
    return null
  }
  const metadata = lstatSync(hookPath)
  if (!metadata.isFile()) {
    throw new Error(`hook install refuses non-regular path: ${hookPath}`)
  }
  if (metadata.size > MAX_HOOK_BYTES) {
    throw new Error(
      `hook install refuses hook larger than ${MAX_HOOK_BYTES} bytes: ${hookPath}`,
    )
  }
  return { bytes: readFileSync(hookPath), mode: metadata.mode % 0o1000 }
}

/**
 * @param {HookSnapshot} left - First snapshot.
 * @param {HookSnapshot} right - Second snapshot.
 * @returns {boolean} Whether the contents match exactly.
 */
const sameBytes = (left, right) => left.bytes.equals(right.bytes)

/**
 * @param {HookSnapshot} left - First snapshot.
 * @param {HookSnapshot} right - Second snapshot.
 * @returns {boolean} Whether contents and permissions match exactly.
 */
const sameSnapshot = (left, right) =>
  left.mode === right.mode && sameBytes(left, right)

/**
 * @param {HookSnapshot} snapshot - Hook contents to classify.
 * @returns {boolean} Whether this is positively recognized as Lefthook-owned.
 */
const isManagedPrePush = (snapshot) => {
  const text = snapshot.bytes.toString("utf-8")
  return (
    text.startsWith("#!/bin/sh\n") &&
    text.includes(MANAGED_FUNCTION) &&
    text.trimEnd().endsWith(MANAGED_PRE_PUSH)
  )
}

/**
 * Restore a quarantined backup without replacing an unrecognized file.
 *
 * @param {string} oldHook - Original backup path.
 * @param {string} quarantine - Temporary preservation path.
 * @param {HookSnapshot} original - Original backup snapshot.
 */
const restoreBackup = (oldHook, quarantine, original) => {
  const current = snapshotHook(oldHook)
  if (current === null) {
    renameSync(quarantine, oldHook)
    return
  }
  if (sameBytes(current, original)) {
    chmodSync(oldHook, original.mode)
    rmSync(quarantine)
    return
  }
  if (isManagedPrePush(current)) {
    rmSync(oldHook)
    renameSync(quarantine, oldHook)
    return
  }
  throw new Error(
    `hook install preserved the original backup at ${quarantine}; ` +
      `refusing to replace unexpected ${oldHook}`,
  )
}

/**
 * Move a proven-safe backup aside while Lefthook synchronizes its hook.
 *
 * @param {string} currentPath - Active pre-push hook.
 * @param {string} oldPath - Preserved user hook.
 * @param {HookSnapshot | null} current - Active hook snapshot.
 * @param {HookSnapshot | null} old - Backup hook snapshot.
 * @returns {string | null} Quarantine path when a collision existed.
 */
const quarantineBackup = (currentPath, oldPath, current, old) => {
  if (current === null || old === null) {
    return null
  }
  if (!(sameBytes(current, old) || isManagedPrePush(current))) {
    throw new Error(
      `hook install found distinct user hooks at ${currentPath} and ${oldPath}; ` +
        "move or reconcile one explicitly before retrying",
    )
  }

  const quarantine = `${oldPath}.lefthook-preserved-${process.pid}-${randomUUID()}`
  renameSync(oldPath, quarantine)
  const preserved = snapshotHook(quarantine)
  const currentAfterMove = snapshotHook(currentPath)
  if (
    preserved !== null &&
    currentAfterMove !== null &&
    sameSnapshot(preserved, old) &&
    sameSnapshot(currentAfterMove, current)
  ) {
    return quarantine
  }
  if (preserved !== null) {
    restoreBackup(oldPath, quarantine, preserved)
  }
  throw new Error(
    "hook install detected a concurrent hook change and refused to continue",
  )
}

/**
 * @param {CommandResult} result - Failed process result.
 * @returns {string} Human-readable termination outcome.
 */
const failureOutcome = (result) => {
  if (result.signal !== null) {
    return `signal ${result.signal}`
  }
  return `exit status ${result.status ?? "unknown"}`
}

/**
 * Install Lefthook without sacrificing an existing pre-push backup.
 *
 * @param {{ cwd?: string, runner?: Runner }} [options] - Testable process options.
 * @returns {boolean} Whether installation ran inside a Git worktree.
 */
export const installHooks = (options = {}) => {
  const cwd = options.cwd ?? process.cwd()
  const runner = options.runner ?? defaultRunner
  const inside = captureGit(["rev-parse", "--is-inside-work-tree"], cwd, true)
  if (inside !== "true") {
    return false
  }

  const root = captureGit(
    ["rev-parse", "--path-format=absolute", "--show-toplevel"],
    cwd,
    false,
  )
  const hooksDir = captureGit(
    ["rev-parse", "--path-format=absolute", "--git-path", "hooks"],
    cwd,
    false,
  )
  if (root === null || hooksDir === null) {
    throw new Error("hook install could not resolve repository paths")
  }

  const currentPath = path.join(hooksDir, "pre-push")
  const oldPath = path.join(hooksDir, "pre-push.old")
  const current = snapshotHook(currentPath)
  const old = snapshotHook(oldPath)
  let quarantine = quarantineBackup(currentPath, oldPath, current, old)

  try {
    const binary = path.join(
      root,
      "node_modules",
      ".bin",
      process.platform === "win32" ? "lefthook.cmd" : "lefthook",
    )
    const result = runner(binary, ["install"], root)
    if (result.error !== undefined) {
      throw new Error(
        `hook install could not start Lefthook: ${result.error.message}`,
      )
    }
    if (result.status !== 0) {
      throw new Error(
        `Lefthook installation failed with ${failureOutcome(result)}`,
      )
    }
    const installed = snapshotHook(currentPath)
    if (installed === null || !isManagedPrePush(installed)) {
      throw new Error(
        `Lefthook reported success without installing ${currentPath}`,
      )
    }

    if (quarantine !== null && old !== null) {
      restoreBackup(oldPath, quarantine, old)
      quarantine = null
    }
    return true
  } catch (error) {
    if (quarantine !== null && old !== null) {
      restoreBackup(oldPath, quarantine, old)
      quarantine = null
    }
    throw error
  }
}

const [, entrypoint] = process.argv
if (
  entrypoint !== undefined &&
  import.meta.url === pathToFileURL(entrypoint).href
) {
  try {
    installHooks()
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown failure"
    console.error(`prepare: ${detail}`)
    process.exitCode = 1
  }
}

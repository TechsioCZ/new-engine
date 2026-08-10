#!/usr/bin/env node
import { execFileSync } from "node:child_process"
/**
 * SessionStart hook: install the plugin's `pre-push` git hook into the repo.
 *
 * The git hook is the real gate — git hands it the exact refs and SHAs being pushed, so unlike
 * an agent-side command-string parser it cannot be fooled by aliases, refspec forms, or config.
 *
 * ONLY in the ui-kit source repo. The plugin is installed globally, so sessions start in
 * arbitrary consumer repos; the gate only guards paths under `libs/ui/` (excluding the plugin
 * itself), so a repo without those sources gets nothing installed — and anything a previous
 * version of this installer left there is removed, restoring what it had moved aside.
 *
 * Collisions with existing hooks are RESOLVED, never won by force:
 *
 * - An untracked foreign `pre-push` (hand-written, `.git/hooks`) is moved aside to a
 *   `pre-push.pre-ui-kit[.N]` slot; the gate runs every moved-aside hook first, oldest first,
 *   and honours their exit codes.
 * - A hook TRACKED in the repo (a committed `.husky/pre-push`, lefthook output, a default
 *   hooks dir some other tool committed) is never renamed or overwritten — that would dirty
 *   the worktree. Instead `core.hooksPath` (repo-local config, untracked) is pointed at a
 *   shim directory inside `.git/` that forwards EVERY hook type to the original hooks dir
 *   and only adds the gate to `pre-push`, after the original hook has run and passed.
 */
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import path from "node:path"

import {
  GIT_EXECUTABLE,
  isUiKitSourceRepo,
  readBoundedTextFile,
} from "./lib/is-ui-kit-source-repo.mjs"

const GIT_CONFIG_COMMAND = "config"
if (GIT_EXECUTABLE === undefined) {
  process.exit(0)
}
const IGNORED_STDIO = "ignore"
const HOOKS_PATH_CONFIG = "core.hooksPath"
const MARKER = "git pre-push hook — the REAL ui-kit quality gate"
const MAX_BACKUP_SLOTS = 1000
const MAX_COMMAND_OUTPUT_BYTES = 1024 * 1024
const MAX_HOOK_BYTES = 1024 * 1024
const source = path.join(path.dirname(import.meta.dirname), "hooks", "pre-push")

/** @param {...string} args - Git command arguments. */
const git = (...args) =>
  execFileSync(GIT_EXECUTABLE, args, {
    encoding: "utf-8",
    maxBuffer: MAX_COMMAND_OUTPUT_BYTES,
    stdio: [IGNORED_STDIO, "pipe", IGNORED_STDIO],
  }).trim()

/** @param {string} message - User-facing installer note. */
const note = (message) => process.stderr.write(`ui-kit: ${message}\n`)

/** @param {unknown} error - Caught failure. */
const getErrorMessage = (error) =>
  error instanceof Error ? error.message : String(error)

/** @param {string} file - Hook file to read or inspect. */
const readTextFile = (file) => readBoundedTextFile(file, MAX_HOOK_BYTES)

let gitDir
let topLevel
try {
  gitDir = git("rev-parse", "--absolute-git-dir")
  topLevel = git("rev-parse", "--show-toplevel")
} catch {
  // Not a git repo (or bare), so there is nothing to install.
  process.exit(0)
}

const shimDir = path.join(gitDir, "ui-kit-hooks")

// Respect a configured hooksPath (husky, lefthook, …) so we install where git actually looks.
// Git resolves a relative core.hooksPath against the worktree root, not our cwd — do the same.
let configuredHooksPath = ""
try {
  configuredHooksPath = git(GIT_CONFIG_COMMAND, "--get", HOOKS_PATH_CONFIG)
} catch {
  // unset → default
}

let hooksDir = path.join(gitDir, "hooks")
if (configuredHooksPath !== "") {
  hooksDir = path.isAbsolute(configuredHooksPath)
    ? configuredHooksPath
    : path.join(topLevel, configuredHooksPath)
}

const target = path.join(hooksDir, "pre-push")
const chainedBase = `${target}.pre-ui-kit`

/**
 * A hook tracked in the repo (a committed .husky/pre-push, lefthook output, …) belongs to the
 * repo's own tooling. Renaming it would dirty the worktree and hand the agent our copy to
 * commit by accident. `.git/hooks` is outside the worktree, so plain hooks are never tracked.
 */
/** @param {string} file - Hook file to read or inspect. */
const isTrackedInRepo = (file) => {
  // `git ls-files` matches pathspecs against the index; give it a worktree-relative path. An
  // absolute path is not portably accepted across git versions, so a committed hook could be
  // misread as untracked and then renamed — dirtying a tracked hooks dir instead of shimming it.
  // (A path outside the worktree resolves to `../…`, which ls-files rejects → correctly untracked.)
  const rel = path.relative(topLevel, file)
  try {
    execFileSync(
      GIT_EXECUTABLE,
      ["-C", topLevel, "ls-files", "--error-unmatch", "--", rel],
      {
        stdio: [IGNORED_STDIO, IGNORED_STDIO, IGNORED_STDIO],
      },
    )
    return true
  } catch {
    return false
  }
}

/** Hooks moved aside by this installer over time, oldest first, plus the next free slot. */
const backupSlots = () => {
  const existing = []
  if (existsSync(chainedBase)) {
    existing.push(chainedBase)
  }
  let n = 1
  for (; n <= MAX_BACKUP_SLOTS && existsSync(`${chainedBase}.${n}`); n += 1) {
    existing.push(`${chainedBase}.${n}`)
  }
  if (n > MAX_BACKUP_SLOTS) {
    throw new Error(
      `Refusing to inspect more than ${MAX_BACKUP_SLOTS} backups.`,
    )
  }
  return {
    existing,
    next: existing.length ? `${chainedBase}.${n}` : chainedBase,
  }
}

/** Every hook name current git dispatches, so the shim forwards all of them. */
const GIT_HOOK_NAMES = [
  "applypatch-msg",
  "pre-applypatch",
  "post-applypatch",
  "pre-commit",
  "pre-merge-commit",
  "prepare-commit-msg",
  "commit-msg",
  "post-commit",
  "pre-rebase",
  "post-checkout",
  "post-merge",
  "pre-push",
  "pre-receive",
  "update",
  "proc-receive",
  "post-receive",
  "post-update",
  "reference-transaction",
  "push-to-checkout",
  "pre-auto-gc",
  "post-rewrite",
  "sendemail-validate",
  "fsmonitor-watchman",
  "p4-changelist",
  "p4-prepare-changelist",
  "p4-post-changelist",
  "p4-pre-submit",
  "post-index-change",
]

const FORWARDER = `#!/bin/sh
# ui-kit hooks shim — forwards to the same-named hook in the repo's original hooks directory.
dir=$(dirname "$0")
orig=$(cat "$dir/original-hooks-path" 2>/dev/null) || exit 0
case "$orig" in
  "") exit 0 ;;
  /*) ;;
  *) orig="$(git rev-parse --show-toplevel)/$orig" ;;
esac
hook="$orig/$(basename "$0")"
[ -x "$hook" ] && exec "$hook" "$@"
exit 0
`

/**
 * Resolve a collision with a TRACKED hooks dir without touching any tracked file: point
 * core.hooksPath (repo-local config — never part of the worktree) at a shim inside .git/ that
 * forwards every hook type to the original dir. The gate's pre-push reads
 * `original-hooks-path` and runs the original pre-push first, honouring its exit code.
 */
const installRedirect = () => {
  try {
    mkdirSync(shimDir, { recursive: true })
    writeFileSync(
      path.join(shimDir, "original-hooks-path"),
      `${configuredHooksPath}\n`,
    )
    for (const name of GIT_HOOK_NAMES) {
      if (name === "pre-push") {
        continue
      }
      const file = path.join(shimDir, name)
      writeFileSync(file, FORWARDER)
      chmodSync(file, 0o755)
    }
    copyFileSync(source, path.join(shimDir, "pre-push"))
    chmodSync(path.join(shimDir, "pre-push"), 0o755)
    git(GIT_CONFIG_COMMAND, HOOKS_PATH_CONFIG, shimDir)
    note(
      `"${target}" is tracked in the repo — left untouched. core.hooksPath now points at ` +
        `"${shimDir}", which forwards every hook to "${configuredHooksPath}" (originals run ` +
        "first) and adds the pre-push gate.",
    )
  } catch (error) {
    note(
      `could not set up the hooks shim (${getErrorMessage(error)}) — gate NOT installed.`,
    )
  }
  process.exit(0)
}

/** Undo installRedirect: restore the original core.hooksPath and drop the shim. */
const removeRedirect = () => {
  let original = ""
  try {
    original = readTextFile(path.join(shimDir, "original-hooks-path")).trim()
  } catch {
    // shim without the marker file — just unset
  }
  try {
    if (original === "") {
      execFileSync(
        GIT_EXECUTABLE,
        [GIT_CONFIG_COMMAND, "--unset", HOOKS_PATH_CONFIG],
        {
          stdio: "ignore",
        },
      )
    } else {
      git(GIT_CONFIG_COMMAND, HOOKS_PATH_CONFIG, original)
    }
  } catch (error) {
    // If the restore fails we must NOT delete the shim: core.hooksPath may still point at it, and
    // removing it would silently stop EVERY hook type (including the repo's own tracked hooks the
    // shim forwards to) from firing — the exact outcome the shim exists to prevent. Leave it all in
    // place; the next session start retries.
    note(
      `could not restore core.hooksPath (${getErrorMessage(error)}) — leaving the shim in place.`,
    )
    return
  }
  try {
    rmSync(shimDir, { force: true, recursive: true })
  } catch {
    // best effort — core.hooksPath is already restored, so a leftover shim dir is harmless
  }
  note(
    `removed the ui-kit hooks shim from this non-ui-kit repo; core.hooksPath restored to ` +
      `"${original === "" ? "(unset)" : original}".`,
  )
}

if (isUiKitSourceRepo(topLevel)) {
  if (existsSync(target)) {
    const current = readTextFile(target)

    if (current.includes(MARKER)) {
      // Ours already — refresh it if the plugin shipped a newer version.
      if (current === readTextFile(source)) {
        process.exit(0)
      }
    } else if (isTrackedInRepo(target)) {
      // installRedirect exits after completing or reporting the redirect attempt.
      installRedirect()
    } else {
      // An untracked foreign hook (hand-written, husky's untracked output, …). Do NOT skip
      // installation — that would leave the gate unenforced in exactly the repos that already
      // care about hooks. Move it to the next free backup slot; the gate runs every moved-aside
      // hook first, oldest first, and honours their exit codes.
      const { next } = backupSlots()
      try {
        renameSync(target, next)
        chmodSync(next, 0o755)
        note(
          `existing pre-push hook preserved as "${next}" and chained — it runs first.`,
        )
      } catch (error) {
        note(
          `could not preserve the existing pre-push hook (${getErrorMessage(error)}) — leaving it ` +
            "untouched, gate NOT installed.",
        )
        // Never destroy a hook that could not be backed up.
        process.exit(0)
      }
    }
  }

  try {
    mkdirSync(hooksDir, { recursive: true })
    copyFileSync(source, target)
    chmodSync(target, 0o755)
  } catch (error) {
    note(`could not install pre-push hook: ${getErrorMessage(error)}`)
  }
} else {
  // Consumer repo — the gate has nothing to guard here. Also undo what an earlier version of
  // this installer may have done: remove our hook/shim and put any moved-aside original back.
  if (existsSync(shimDir) && path.resolve(hooksDir) === path.resolve(shimDir)) {
    removeRedirect()
    process.exit(0)
  }
  if (existsSync(target) && readTextFile(target).includes(MARKER)) {
    const { existing } = backupSlots()
    try {
      if (existing.length) {
        const newest = existing.at(-1)
        if (newest === undefined) {
          throw new Error("A pre-push backup was expected but not found.")
        }
        renameSync(newest, target)
        note(
          `removed the ui-kit pre-push hook from this non-ui-kit repo and restored "${newest}".`,
        )
      } else {
        rmSync(target)
        note("removed the ui-kit pre-push hook from this non-ui-kit repo.")
      }
    } catch (error) {
      note(`could not remove stale pre-push hook: ${getErrorMessage(error)}`)
    }
  }
}

process.exit(0)

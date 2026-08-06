/**
 * Identify THE ui-kit source repository — the only place the push gate may activate.
 *
 * The marker is specific and tracked: `libs/ui` must be the `@techsio/ui-kit` package. An earlier
 * check keyed off "`libs/ui` contains anything besides `agent-plugin`", which a consumer repo that
 * happens to have its own unrelated `libs/ui/` package would satisfy too — reinstalling the hook
 * and blocking `git push --no-verify` there, the exact interference this scoping exists to prevent.
 * A package name is unique to this repo and lives in a committed file, so a consumer that merely
 * vendors the plugin bundle never matches.
 *
 * Shared by both the SessionStart installer and the PreToolUse guard so the two can never disagree
 * on scope. Accepts any path inside the repo (worktree root or cwd) and resolves the worktree root
 * itself, so callers pass whatever they already hold.
 */
import { execFileSync } from "node:child_process"
import { closeSync, existsSync, openSync, readSync } from "node:fs"
import path from "node:path"

const GIT_EXECUTABLE_CANDIDATES =
  process.platform === "win32"
    ? [
        "C:\\Program Files\\Git\\cmd\\git.exe",
        "C:\\Program Files (x86)\\Git\\cmd\\git.exe",
      ]
    : [
        "/usr/bin/git",
        "/usr/local/bin/git",
        "/opt/homebrew/bin/git",
        "/nix/var/nix/profiles/default/bin/git",
      ]

export const GIT_EXECUTABLE = GIT_EXECUTABLE_CANDIDATES.find(existsSync)
const MAX_COMMAND_OUTPUT_BYTES = 1024 * 1024
const MAX_PACKAGE_JSON_BYTES = 1024 * 1024
const UI_KIT_PACKAGE = "@techsio/ui-kit"

/**
 * @param {unknown} file - Candidate file path.
 * @param {unknown} maxBytes - Maximum accepted UTF-8 bytes.
 * @returns {string} Bounded file contents.
 */
export const readBoundedTextFile = (file, maxBytes) => {
  const invalidFile =
    typeof file !== "string" || file === "" || file.includes("\0")
  const invalidLimitType =
    typeof maxBytes !== "number" || !Number.isSafeInteger(maxBytes)
  const invalidLimitRange =
    typeof maxBytes === "number" &&
    (maxBytes < 1 || maxBytes > 100 * 1024 * 1024)
  if (invalidFile || invalidLimitType || invalidLimitRange) {
    throw new TypeError("A valid path and bounded byte limit are required.")
  }

  const descriptor = openSync(file, "r")
  try {
    const buffer = Buffer.alloc(maxBytes + 1)
    let bytesRead = 0
    while (bytesRead < buffer.length) {
      const chunkSize = readSync(
        descriptor,
        buffer,
        bytesRead,
        buffer.length - bytesRead,
        bytesRead,
      )
      if (chunkSize === 0) {
        break
      }
      bytesRead += chunkSize
    }
    if (bytesRead > maxBytes) {
      throw new Error(`Refusing to read oversized file: ${file}`)
    }
    return buffer.subarray(0, bytesRead).toString("utf-8")
  } finally {
    closeSync(descriptor)
  }
}

/**
 * @param {unknown} value - Candidate JSON value.
 * @returns {value is Record<string, unknown>} Whether the value is a record.
 */
const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/**
 * @param {unknown} value - Parsed package metadata.
 * @returns {boolean} Whether metadata belongs to the UI kit.
 */
const hasUiKitPackageName = (value) =>
  isRecord(value) && value.name === UI_KIT_PACKAGE

/** @param {unknown} cwd - Candidate path inside a worktree. */
export const isUiKitSourceRepo = (cwd) => {
  if (
    GIT_EXECUTABLE === undefined ||
    typeof cwd !== "string" ||
    cwd === "" ||
    cwd.includes("\0")
  ) {
    return false
  }

  let topLevel
  try {
    topLevel = execFileSync(GIT_EXECUTABLE, ["rev-parse", "--show-toplevel"], {
      cwd,
      encoding: "utf-8",
      maxBuffer: MAX_COMMAND_OUTPUT_BYTES,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
  } catch {
    // Not a git worktree (or bare), so there is nothing to guard.
    return false
  }
  if (topLevel === "" || topLevel.includes("\0")) {
    return false
  }

  try {
    const packagePath = path.join(topLevel, "libs", "ui", "package.json")
    return hasUiKitPackageName(
      JSON.parse(readBoundedTextFile(packagePath, MAX_PACKAGE_JSON_BYTES)),
    )
  } catch {
    // No readable, valid libs/ui/package.json means this is not the source repo.
    return false
  }
}

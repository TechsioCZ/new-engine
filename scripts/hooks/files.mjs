import fileSystemModule from "node:fs"
import pathModule from "node:path"

/** @typedef {{existsSync: (filePath: string) => boolean, statSync: (filePath: string) => unknown}} FileSystem */
/** @typedef {{join: (...paths: string[]) => string}} PathTools */

/**
 * @param {unknown} value - Imported module to validate.
 * @returns {value is FileSystem} Whether the required filesystem API is present.
 */
const isFileSystem = (value) => {
  if (typeof value !== "object" || value === null) {
    return false
  }
  if (!("existsSync" in value) || typeof value.existsSync !== "function") {
    return false
  }
  return "statSync" in value && typeof value.statSync === "function"
}

/**
 * @param {unknown} value - Imported module to validate.
 * @returns {value is PathTools} Whether path joining is available.
 */
const isPathTools = (value) =>
  typeof value === "object" &&
  value !== null &&
  "join" in value &&
  typeof value.join === "function"

/**
 * @param {unknown} value - Filesystem metadata to validate.
 * @returns {value is {isFile: () => boolean}} Whether file detection is available.
 */
const hasIsFile = (value) =>
  typeof value === "object" &&
  value !== null &&
  "isFile" in value &&
  typeof value.isFile === "function"

/** @type {unknown} */
const importedFileSystem = fileSystemModule
/** @type {unknown} */
const importedPathTools = pathModule
const fileSystem = isFileSystem(importedFileSystem) ? importedFileSystem : null
const pathTools = isPathTools(importedPathTools) ? importedPathTools : null

const ZERO_SHA = /^0+$/u
const FORMATTABLE_FILE = /\.(?:[cm]?[jt]sx?|jsonc?|css|scss|mdx?|ya?ml)$/iu
const LINTABLE_FILE = /\.[cm]?[jt]sx?$/iu

/**
 * @typedef {object} PushLine
 * @property {string} localRef - Local reference name.
 * @property {string} localSha - Local object identifier.
 * @property {string} remoteRef - Remote reference name.
 * @property {string} remoteSha - Remote object identifier.
 */

/**
 * @param {string} stdin - Lines supplied by Git's pre-push hook.
 * @returns {PushLine[]} Complete push records.
 */
export const parsePushLines = (stdin) =>
  stdin
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const [localRef = "", localSha = "", remoteRef = "", remoteSha = ""] =
        line.split(/\s+/u)
      const fields = [localRef, localSha, remoteRef, remoteSha]

      if (fields.some((field) => field === "")) {
        return []
      }

      return [{ localRef, localSha, remoteRef, remoteSha }]
    })

/**
 * @param {string} stdin - Lines supplied by Git's pre-push hook.
 * @returns {boolean} Whether at least one update uploads commits.
 */
export const hasUploadedCommits = (stdin) =>
  parsePushLines(stdin).some(({ localSha }) => !ZERO_SHA.test(localSha))

/**
 * @param {readonly string[]} files - Paths relative to the root directory.
 * @param {string} [root] - Directory containing the paths.
 * @returns {string[]} Unique paths that resolve to regular files.
 */
const existingFiles = (files, root = ".") =>
  [...new Set(files)].filter((file) => {
    try {
      if (fileSystem === null || pathTools === null) {
        return false
      }

      const resolved = pathTools.join(root, file)
      if (!fileSystem.existsSync(resolved)) {
        return false
      }

      const stats = fileSystem.statSync(resolved)
      return hasIsFile(stats) && stats.isFile()
    } catch {
      return false
    }
  })

/**
 * @param {readonly string[]} files - Candidate repository paths.
 * @param {string} [root] - Directory containing the paths.
 * @returns {string[]} Existing files supported by the formatter.
 */
export const formattableFiles = (files, root) =>
  existingFiles(files, root).filter((file) => FORMATTABLE_FILE.test(file))

/**
 * @param {readonly string[]} files - Candidate repository paths.
 * @param {string} [root] - Directory containing the paths.
 * @returns {string[]} Existing JavaScript and TypeScript files.
 */
export const lintableFiles = (files, root) =>
  existingFiles(files, root).filter((file) => LINTABLE_FILE.test(file))

/**
 * @param {readonly string[]} files - Changed repository paths.
 * @returns {boolean} Whether the changes affect hook or Danger policy.
 */
export const touchesDangerPolicy = (files) =>
  files.some(
    (file) =>
      file === "dangerfile.ts" ||
      file === "lefthook.yml" ||
      file.startsWith("scripts/danger/") ||
      file.startsWith("scripts/hooks/"),
  )

export { ZERO_SHA }

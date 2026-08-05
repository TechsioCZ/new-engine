import { existsSync, statSync } from "node:fs"
import path from "node:path"

const ZERO_SHA = /^0+$/
const FORMATTABLE_FILE = /\.(?:[cm]?[jt]sx?|jsonc?|css|scss|mdx?|ya?ml)$/i
const LINTABLE_FILE = /\.[cm]?[jt]sx?$/i

export function parsePushLines(stdin) {
  return stdin
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const [localRef, localSha, remoteRef, remoteSha] = line.split(/\s+/)
      return localRef && localSha && remoteRef && remoteSha
        ? [{ localRef, localSha, remoteRef, remoteSha }]
        : []
    })
}

export function hasUploadedCommits(stdin) {
  return parsePushLines(stdin).some(({ localSha }) => !ZERO_SHA.test(localSha))
}

function existingFiles(files, root = ".") {
  return [...new Set(files)].filter((file) => {
    try {
      const resolved = path.join(root, file)
      return existsSync(resolved) && statSync(resolved).isFile()
    } catch {
      return false
    }
  })
}

export function formattableFiles(files, root) {
  return existingFiles(files, root).filter((file) =>
    FORMATTABLE_FILE.test(file),
  )
}

export function lintableFiles(files, root) {
  return existingFiles(files, root).filter((file) => LINTABLE_FILE.test(file))
}

export function touchesDangerPolicy(files) {
  return files.some(
    (file) =>
      file === "dangerfile.ts" ||
      file === "lefthook.yml" ||
      file.startsWith("scripts/danger/") ||
      file.startsWith("scripts/hooks/"),
  )
}

export { ZERO_SHA }

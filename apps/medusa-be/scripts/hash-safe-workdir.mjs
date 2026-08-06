import { spawn, spawnSync } from "node:child_process"
import crypto from "node:crypto"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

const scriptDir = import.meta.dirname

export const medusaBeDir = path.resolve(scriptDir, "..")
export const repoRoot = path.resolve(medusaBeDir, "../..")

/**
 * @param {string} command - Executable path.
 * @param {readonly string[]} args - Command arguments.
 */
const commandSucceeds = (command, args) =>
  spawnSync(command, args, { stdio: "ignore" }).status === 0

/** @param {string} aliasRoot - Alias directory to remove. */
const removeAliasRoot = (aliasRoot) => {
  try {
    fs.rmSync(aliasRoot, { force: true, recursive: true })
  } catch {
    // Best-effort cleanup only. A failed rm should not mask the original error.
  }
}

/**
 * @returns {{ ownsMount: boolean, runRepoRoot: string }} Alias ownership and path.
 */
const ensureHashSafeRepoAlias = () => {
  if (!repoRoot.includes("#")) {
    return { ownsMount: false, runRepoRoot: repoRoot }
  }

  if (process.platform !== "linux") {
    throw new Error(
      "Hash-safe Medusa runner requires Linux with CAP_SYS_ADMIN/root privileges when repo paths contain '#'. It relies on mount --bind and umount -l.",
    )
  }

  const digest = crypto
    .createHash("sha1")
    .update(repoRoot)
    .digest("hex")
    .slice(0, 10)
  const aliasRoot = path.join(
    os.tmpdir(),
    `new-engine-hash-safe-${digest}-${process.pid}`,
  )

  try {
    const stat = fs.lstatSync(aliasRoot)
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      fs.rmSync(aliasRoot, { force: true, recursive: true })
    } else if (commandSucceeds("/usr/bin/mountpoint", ["-q", aliasRoot])) {
      return { ownsMount: false, runRepoRoot: aliasRoot }
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      try {
        fs.rmSync(aliasRoot, { force: true, recursive: true })
      } catch (cleanupError) {
        throw new Error(`Unable to remove stale hash-safe path ${aliasRoot}`, {
          cause: cleanupError,
        })
      }
    }
  }

  fs.mkdirSync(aliasRoot, { recursive: true })

  // Linux-only: requires CAP_SYS_ADMIN/root privileges for mount --bind.
  const mountResult = spawnSync(
    "/usr/bin/mount",
    ["--bind", repoRoot, aliasRoot],
    {
      stdio: "inherit",
    },
  )

  if (mountResult.status !== 0) {
    removeAliasRoot(aliasRoot)
    throw new Error(
      `Unable to bind mount hash-safe path ${aliasRoot} for ${repoRoot}`,
    )
  }

  return { ownsMount: true, runRepoRoot: aliasRoot }
}

/** @param {string} runCwd - Command working directory. */
const createHashSafeEnv = (runCwd) =>
  Object.fromEntries(
    Object.entries({
      ...process.env,
      INIT_CWD: runCwd,
      PWD: runCwd,
    }).filter(([key, value]) => {
      if (!key.startsWith("npm_") || typeof value !== "string") {
        return true
      }
      return !value.includes("#")
    }),
  )

const MAX_PATH_ENTRIES = 128

const writablePermissionDigits = new Set(["2", "3", "6", "7"])

/** @param {number} mode - File-system permission mode. */
const hasUnsafeWritePermissions = (mode) => {
  const modeText = mode.toString(8)
  return (
    writablePermissionDigits.has(modeText.at(-2) ?? "") ||
    writablePermissionDigits.has(modeText.at(-1) ?? "")
  )
}

/**
 * @param {string} candidate - Candidate executable path.
 * @param {number | undefined} currentUserId - Current process user id.
 * @returns {string | null} Trusted resolved executable path.
 */
const resolveTrustedPnpmCandidate = (candidate, currentUserId) => {
  const resolvedCandidate = fs.realpathSync(candidate)
  const candidateStat = fs.statSync(resolvedCandidate)
  const directoryStat = fs.statSync(path.dirname(resolvedCandidate))
  const ownedByTrustedUser =
    currentUserId === undefined ||
    candidateStat.uid === 0 ||
    candidateStat.uid === currentUserId
  const directoryOwnedByTrustedUser =
    currentUserId === undefined ||
    directoryStat.uid === 0 ||
    directoryStat.uid === currentUserId

  if (
    !candidateStat.isFile() ||
    hasUnsafeWritePermissions(candidateStat.mode) ||
    hasUnsafeWritePermissions(directoryStat.mode)
  ) {
    return null
  }
  if (!ownedByTrustedUser || !directoryOwnedByTrustedUser) {
    return null
  }

  fs.accessSync(resolvedCandidate, fs.constants.X_OK)
  return resolvedCandidate
}

const resolvePnpmFromPath = () => {
  const pathValue = process.env.PATH ?? ""
  const currentUserId = process.getuid?.()
  const pathEntries = pathValue.split(path.delimiter).slice(0, MAX_PATH_ENTRIES)

  for (const pathEntry of pathEntries) {
    if (pathEntry === "") {
      continue
    }

    try {
      const resolvedCandidate = resolveTrustedPnpmCandidate(
        path.resolve(pathEntry, "pnpm"),
        currentUserId,
      )
      if (resolvedCandidate !== null) {
        return resolvedCandidate
      }
    } catch {
      // Try the next bounded PATH entry.
    }
  }

  throw new Error("Unable to resolve a trusted pnpm executable from PATH")
}

const getPnpmSpawnCommand = () => {
  const npmExecPath = process.env.npm_execpath

  if (typeof npmExecPath === "string" && npmExecPath.includes("pnpm")) {
    return {
      argsPrefix: [npmExecPath],
      command: process.execPath,
    }
  }

  return {
    argsPrefix: [],
    command: resolvePnpmFromPath(),
  }
}

export const createHashSafeRunContext = () => {
  const { ownsMount, runRepoRoot } = ensureHashSafeRepoAlias()
  const runCwd = path.join(runRepoRoot, path.relative(repoRoot, medusaBeDir))

  return {
    cleanup() {
      if (ownsMount) {
        spawnSync("/usr/bin/umount", ["-l", runRepoRoot], { stdio: "ignore" })
        try {
          fs.rmdirSync(runRepoRoot)
        } catch {
          // Best-effort cleanup only. A failed rmdir should not mask test/build results.
        }
      }
    },
    env: createHashSafeEnv(runCwd),
    runCwd,
    runRepoRoot,
  }
}

/**
 * @param {string} bin - Package binary name.
 * @param {readonly string[]} args - Command arguments.
 */
export const runUnderHashSafeContext = (bin, args) => {
  const runContext = createHashSafeRunContext()
  const pnpm = getPnpmSpawnCommand()
  let didCleanup = false

  const cleanupOnce = () => {
    if (!didCleanup) {
      didCleanup = true
      runContext.cleanup()
    }
  }

  const child = spawn(
    pnpm.command,
    [...pnpm.argsPrefix, "exec", bin, ...args],
    {
      cwd: runContext.runCwd,
      env: runContext.env,
      stdio: "inherit",
    },
  )

  child.on("error", (error) => {
    cleanupOnce()
    console.error(error)
    process.exitCode = 1
  })

  child.on("exit", (code, signal) => {
    cleanupOnce()

    if (signal) {
      process.kill(process.pid, signal)
      return
    }

    process.exitCode = code ?? 1
  })
}

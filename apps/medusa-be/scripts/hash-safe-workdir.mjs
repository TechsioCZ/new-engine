import { spawn, spawnSync } from "node:child_process"
import crypto from "node:crypto"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const scriptDir = path.dirname(fileURLToPath(import.meta.url))

export const medusaBeDir = path.resolve(scriptDir, "..")
export const repoRoot = path.resolve(medusaBeDir, "../..")

function commandSucceeds(command, args) {
  return spawnSync(command, args, { stdio: "ignore" }).status === 0
}

function removeAliasRoot(aliasRoot) {
  try {
    fs.rmSync(aliasRoot, { force: true, recursive: true })
  } catch {
    // Best-effort cleanup only. A failed rm should not mask the original error.
  }
}

function ensureHashSafeRepoAlias() {
  if (!repoRoot.includes("#")) {
    return { ownsMount: false, runRepoRoot: repoRoot }
  }

  if (process.platform !== "linux") {
    throw new Error(
      "Hash-safe Medusa runner requires Linux with CAP_SYS_ADMIN/root privileges when repo paths contain '#'. It relies on mount --bind and umount -l."
    )
  }

  const digest = crypto
    .createHash("sha1")
    .update(repoRoot)
    .digest("hex")
    .slice(0, 10)
  const aliasRoot = path.join(
    os.tmpdir(),
    `new-engine-hash-safe-${digest}-${process.pid}`
  )

  try {
    const stat = fs.lstatSync(aliasRoot)
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      fs.rmSync(aliasRoot, { force: true, recursive: true })
    } else if (commandSucceeds("mountpoint", ["-q", aliasRoot])) {
      return { ownsMount: false, runRepoRoot: aliasRoot }
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error
    }
  }

  fs.mkdirSync(aliasRoot, { recursive: true })

  // Linux-only: requires CAP_SYS_ADMIN/root privileges for mount --bind.
  const mountResult = spawnSync("mount", ["--bind", repoRoot, aliasRoot], {
    stdio: "inherit",
  })

  if (mountResult.status !== 0) {
    removeAliasRoot(aliasRoot)
    throw new Error(
      `Unable to bind mount hash-safe path ${aliasRoot} for ${repoRoot}`
    )
  }

  return { ownsMount: true, runRepoRoot: aliasRoot }
}

function createHashSafeEnv(runCwd) {
  const env = {
    ...process.env,
    INIT_CWD: runCwd,
    PWD: runCwd,
  }

  for (const [key, value] of Object.entries(env)) {
    if (
      key.startsWith("npm_") &&
      typeof value === "string" &&
      value.includes("#")
    ) {
      delete env[key]
    }
  }

  return env
}

function getPnpmSpawnCommand() {
  const npmExecPath = process.env.npm_execpath

  if (npmExecPath?.includes("pnpm")) {
    return {
      argsPrefix: [npmExecPath],
      command: process.execPath,
    }
  }

  return {
    argsPrefix: [],
    command: "pnpm",
  }
}

export function createHashSafeRunContext() {
  const { ownsMount, runRepoRoot } = ensureHashSafeRepoAlias()
  const runCwd = path.join(runRepoRoot, path.relative(repoRoot, medusaBeDir))

  return {
    env: createHashSafeEnv(runCwd),
    runCwd,
    runRepoRoot,
    cleanup() {
      if (ownsMount) {
        spawnSync("umount", ["-l", runRepoRoot], { stdio: "ignore" })
        try {
          fs.rmdirSync(runRepoRoot)
        } catch {
          // Best-effort cleanup only. A failed rmdir should not mask test/build results.
        }
      }
    },
  }
}

export function runUnderHashSafeContext(bin, args) {
  const runContext = createHashSafeRunContext()
  const pnpm = getPnpmSpawnCommand()
  let didCleanup = false

  function cleanupOnce() {
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
    }
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

import { spawnSync } from "node:child_process"
import crypto from "node:crypto"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const scriptDir = path.dirname(fileURLToPath(import.meta.url))

export const medusaBeDir = path.resolve(scriptDir, "..")
export const repoRoot = path.resolve(medusaBeDir, "../..")

let didMountAlias = false

function commandSucceeds(command, args) {
  return spawnSync(command, args, { stdio: "ignore" }).status === 0
}

function ensureHashSafeRepoAlias() {
  if (!repoRoot.includes("#")) {
    return repoRoot
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
      return aliasRoot
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error
    }
  }

  fs.mkdirSync(aliasRoot, { recursive: true })

  const mountResult = spawnSync("mount", ["--bind", repoRoot, aliasRoot], {
    stdio: "inherit",
  })

  if (mountResult.status !== 0) {
    throw new Error(
      `Unable to bind mount hash-safe path ${aliasRoot} for ${repoRoot}`
    )
  }

  didMountAlias = true
  return aliasRoot
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

export function createHashSafeRunContext() {
  const runRepoRoot = ensureHashSafeRepoAlias()
  const runCwd = path.join(runRepoRoot, path.relative(repoRoot, medusaBeDir))

  return {
    env: createHashSafeEnv(runCwd),
    runCwd,
    runRepoRoot,
    cleanup() {
      if (didMountAlias) {
        spawnSync("umount", ["-l", runRepoRoot], { stdio: "ignore" })
        didMountAlias = false
        try {
          fs.rmdirSync(runRepoRoot)
        } catch {
          // Best-effort cleanup only. A failed rmdir should not mask test/build results.
        }
      }
    },
  }
}

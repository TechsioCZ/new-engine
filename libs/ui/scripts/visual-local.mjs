/**
 * Local A/B visual check without Docker: did the working tree change any pixels
 * compared with the commit it branched from? Baselines are rendered on this
 * machine from the base commit and kept in a machine-wide cache. Nothing is
 * written to the committed Linux baselines; CI stays the authority for those.
 */
import { execFileSync, spawn, spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import fs from "node:fs"
import { createRequire } from "node:module"
import net from "node:net"
import os from "node:os"
import path from "node:path"
import { visualStories } from "../test/visual-completion.mjs"
import { createVisualMatrix } from "../test/visual-projects.mjs"
import {
  affectedStoriesFromDisk,
  gitChangedFiles,
} from "./visual-affected-stories.mjs"

/**
 * @typedef {{ base: string, all: boolean, stories: string[], workers: number, rebuildBase: boolean, dryRun: boolean }} Options
 * @typedef {{ baseStories: string[], newStories: string[], missingBase: string[] }} BasePlan
 * @typedef {{ mode: "all" | "subset" | "none", storyIds: string[], reason: string }} Selection
 * @typedef {Record<string, string[]>} CaptureManifest Story id to the snapshot file names its last successful base capture produced.
 * @typedef {{ path: string, kind: "build" | "dependencies" }} ArtifactDir
 * @typedef {{ path: string, bytes: Buffer | Uint8Array | string }} HarnessFile
 * @typedef {{ buildDir: string, storybookDir: string, cacheDir: string, snapshotDir: string, manifestPath: string }} CachePaths
 * @typedef {{ status: number, output: string }} RunResult
 */

const uiRoot = path.resolve(import.meta.dirname, "..")
const repoRoot = path.resolve(uiRoot, "../..")
const headStorybookDir = path.join(uiRoot, "storybook-static")
const localDir = path.join(uiRoot, ".visual-local")
const playwrightConfig = "playwright.config.mts"
const visualSpec = "test/visual.spec.ts"
const fixtureDir = path.join("test", "fixtures", "visual-assets")
const usage =
  "Usage: node scripts/visual-local.mjs [--base <git ref>] [--all] [--stories <id,id>] [--workers <n>] [--rebuild-base] [--dry-run]"
const valueFlags = new Set(["--base", "--stories", "--workers"])
const booleanFlags = new Set(["--all", "--rebuild-base", "--dry-run"])
const positiveInteger = /^[1-9]\d*$/
const harnessModulePattern = /^visual-.*\.mjs$/
const testModulePattern = /\.test\.mjs$/
const artifactPattern = /\.(?:partial|retired)-(\d+)$/
const browserMissingPattern =
  /Executable doesn't exist at|Please run the following command to download new browsers/
const testResultPattern = /\b\d+ (?:passed|failed|flaky|skipped|interrupted)\b/
const manifestFile = "captured.json"
const tempPrefix = "ui-visual-base-"
const ownerFile = "owner-pid"
const lockSuffix = ".lock"
const guardianBin = path.join(os.homedir(), "bin", "disk-guardian-artifacts")
const guardianGraceHours = "24"
const lockPollMs = 2000
const lockTimeoutMs = 2 * 60 * 60 * 1000
const unownedLockMs = 30_000
const gib = 1024 ** 3
const minBaseFreeGiB = 3
const defaultCacheKeep = 5
const outputTailChars = 65_536
const browserHint =
  "Browsers are missing. Run `pnpm -C libs/ui exec playwright install chromium webkit`."
const runnerEnvKeys = [
  "VISUAL_BRANDS",
  "VISUAL_RELEASE_READINESS",
  "VISUAL_CHANGED_SINCE",
  "VISUAL_CHANGED_FILES",
  "VISUAL_CHANGED_DRY_RUN",
  "TEST_STORIES",
  "VISUAL_STORYBOOK_STATIC_DIR",
]
/** Removed from the inherited env of base runs only; compare runs keep what the user set. */
const baseOnlyEnvKeys = ["VISUAL_CANONICAL"]

/** @type {{ tmp: string, wt: string } | null} */
let baseTemp = null
/** @type {string[]} */
const heldLocks = []

/** @returns {number} */
export function defaultWorkers() {
  return Math.max(2, Math.min(8, os.availableParallelism() - 2))
}

/**
 * @param {Options} options
 * @param {string} flag
 */
function applyBoolean(options, flag) {
  if (flag === "--all") {
    options.all = true
  } else if (flag === "--rebuild-base") {
    options.rebuildBase = true
  } else {
    options.dryRun = true
  }
}

/**
 * @param {Options} options
 * @param {string} flag
 * @param {string | undefined} value
 */
function applyValue(options, flag, value) {
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${flag}. ${usage}`)
  }
  if (flag === "--base") {
    options.base = value
  } else if (flag === "--stories") {
    options.stories = value
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
    if (!options.stories.length) {
      throw new Error("--stories needs at least one story id")
    }
  } else {
    if (!positiveInteger.test(value)) {
      throw new Error(`--workers must be a positive integer, got "${value}"`)
    }
    options.workers = Number(value)
  }
}

/**
 * Parses the CLI. Throws on unknown flags, missing values and conflicting options.
 * @param {string[]} argv
 * @returns {Options}
 */
export function parseArgs(argv) {
  /** @type {Options} */
  const options = {
    base: "origin/master",
    all: false,
    stories: [],
    workers: defaultWorkers(),
    rebuildBase: false,
    dryRun: false,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (booleanFlags.has(arg)) {
      applyBoolean(options, arg)
    } else if (valueFlags.has(arg)) {
      index += 1
      applyValue(options, arg, argv[index])
    } else {
      throw new Error(`Unknown argument "${arg}". ${usage}`)
    }
  }
  if (options.all && options.stories.length) {
    throw new Error("--all and --stories cannot be combined")
  }
  return options
}

/**
 * @param {{ platform: string, arch: string, playwrightVersion: string }} input
 * @returns {string}
 */
export function cacheKey({ platform, arch, playwrightVersion }) {
  return `${platform}-${arch}-pw${playwrightVersion}`
}

/**
 * Snapshot baselines depend on the test harness, so their directory key adds a
 * harness hash to the platform key.
 * @param {{ platform: string, arch: string, playwrightVersion: string, harness: string }} input
 * @returns {string}
 */
export function harnessKey({ platform, arch, playwrightVersion, harness }) {
  return `${cacheKey({ platform, arch, playwrightVersion })}-h${harness}`
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {string} platform
 * @param {string} homedir
 * @returns {string}
 */
export function resolveCacheRoot(env, platform, homedir) {
  if (env.VISUAL_LOCAL_CACHE) {
    return path.resolve(env.VISUAL_LOCAL_CACHE)
  }
  if (platform === "darwin") {
    return path.join(homedir, "Library", "Caches", "techsio-ui-visual")
  }
  return path.join(homedir, ".cache", "techsio-ui-visual")
}

/**
 * Reads VISUAL_LOCAL_CACHE_KEEP, the number of base commits kept per cache level.
 * @param {Record<string, string | undefined>} env
 * @returns {number}
 */
export function cacheKeepFrom(env) {
  const raw = env.VISUAL_LOCAL_CACHE_KEEP ?? String(defaultCacheKeep)
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(
      `VISUAL_LOCAL_CACHE_KEEP must be a positive integer, got "${raw}"`
    )
  }
  return value
}

/**
 * @param {HarnessFile} a
 * @param {HarnessFile} b
 * @returns {number}
 */
function byPath(a, b) {
  if (a.path === b.path) {
    return 0
  }
  return a.path < b.path ? -1 : 1
}

/**
 * Hashes the harness files in sorted path order. Each entry hashes its path and
 * byte length before its bytes, so no two different file sets share a stream.
 * @param {HarnessFile[]} files
 * @returns {string} first 12 hex characters of a sha256
 */
export function harnessHash(files) {
  const hash = createHash("sha256")
  for (const file of [...files].sort(byPath)) {
    const data = Buffer.from(file.bytes)
    hash.update(`${file.path}\0${data.length}\0`)
    hash.update(data)
  }
  return hash.digest("hex").slice(0, 12)
}

/**
 * @param {string} dir
 * @returns {string[]} absolute paths of every file below dir
 */
function walkFiles(dir) {
  if (!fs.existsSync(dir)) {
    return []
  }
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      return walkFiles(full)
    }
    return entry.isFile() ? [full] : []
  })
}

/**
 * Reads the files the visual harness depends on: the spec, the Playwright config,
 * the visual-*.mjs helpers (not *.test.mjs) and the visual asset fixtures.
 * Paths are relative to uiDir with "/" separators.
 * @param {string} uiDir
 * @returns {HarnessFile[]}
 */
export function readHarnessFiles(uiDir) {
  const modules = fs
    .readdirSync(path.join(uiDir, "test"))
    .filter(
      (name) => harnessModulePattern.test(name) && !testModulePattern.test(name)
    )
    .map((name) => path.join("test", name))
  const fixtures = walkFiles(path.join(uiDir, fixtureDir)).map((file) =>
    path.relative(uiDir, file)
  )
  const relativePaths = [visualSpec, playwrightConfig, ...modules, ...fixtures]
  return relativePaths.map((rel) => ({
    path: rel.split(path.sep).join("/"),
    bytes: fs.readFileSync(path.join(uiDir, rel)),
  }))
}

/**
 * Finds the story that owns a snapshot file. A file belongs to the longest story
 * id its name starts with, followed by "-" (variant suffixes such as
 * "--interaction-open" or "-xs-open"), and ends with "-<project>-<platform>.png".
 * @param {string} fileName
 * @param {{ storyIds: string[], projectNames: string[], platform: string }} input
 * @returns {string | null}
 */
export function snapshotOwner(fileName, { storyIds, projectNames, platform }) {
  const bases = projectNames
    .map((project) => `-${project}-${platform}.png`)
    .filter((tail) => fileName.endsWith(tail))
    .map((tail) => fileName.slice(0, -tail.length))
  let owner = null
  for (const base of bases) {
    for (const id of storyIds) {
      const owns = base === id || base.startsWith(`${id}-`)
      if (owns && (owner === null || id.length > owner.length)) {
        owner = id
      }
    }
  }
  return owner
}

/**
 * Groups snapshot file names under the captured story that owns them.
 * @param {{ captured: string[], baseVisualIds: string[], fileNames: string[], projectNames: string[], platform: string }} input
 * @returns {CaptureManifest}
 */
export function buildManifestEntries({
  captured,
  baseVisualIds,
  fileNames,
  projectNames,
  platform,
}) {
  const wanted = new Set(captured)
  /** @type {CaptureManifest} */
  const entries = Object.fromEntries(captured.map((id) => [id, []]))
  for (const fileName of fileNames) {
    const owner = snapshotOwner(fileName, {
      storyIds: baseVisualIds,
      projectNames,
      platform,
    })
    if (owner !== null && wanted.has(owner)) {
      entries[owner].push(fileName)
    }
  }
  for (const id of captured) {
    entries[id].sort()
  }
  return entries
}

/**
 * A story is cached when a successful capture recorded its files and every one
 * of them, plus each project's primary file, is still on disk.
 * @param {{ id: string, manifest: CaptureManifest, existing: Set<string>, projectNames: string[], platform: string }} input
 * @returns {boolean}
 */
function storyCached({ id, manifest, existing, projectNames, platform }) {
  if (!Object.hasOwn(manifest, id)) {
    return false
  }
  const primary = projectNames.map(
    (project) => `${id}-${project}-${platform}.png`
  )
  return [...manifest[id], ...primary].every((name) => existing.has(name))
}

/**
 * Splits the selected stories by whether the base build has them, and lists the
 * base stories that still lack a recorded or primary baseline file.
 * @param {{ selected: string[], baseVisualIds: string[], projectNames: string[], platform: string, existingSnapshotNames: string[], manifest?: CaptureManifest }} input
 * @returns {BasePlan}
 */
export function planBase({
  selected,
  baseVisualIds,
  projectNames,
  platform,
  existingSnapshotNames,
  manifest = {},
}) {
  const baseIds = new Set(baseVisualIds)
  const existing = new Set(existingSnapshotNames)
  const baseStories = selected.filter((id) => baseIds.has(id))
  const newStories = selected.filter((id) => !baseIds.has(id))
  const missingBase = baseStories.filter(
    (id) => !storyCached({ id, manifest, existing, projectNames, platform })
  )
  return { baseStories, newStories, missingBase }
}

/**
 * Decides whether the base build must run. A forced rebuild is skipped when
 * another run published a build after this run started.
 * @param {{ hasIndex: boolean, rebuildBase: boolean, builtAt: number | null, startedAt: number }} input
 * @returns {boolean}
 */
export function needsBaseBuild({ hasIndex, rebuildBase, builtAt, startedAt }) {
  if (!hasIndex) {
    return true
  }
  if (!rebuildBase) {
    return false
  }
  return builtAt === null || builtAt < startedAt
}

/**
 * Operation-owned trees inside the temporary base worktree.
 * @param {string} wt
 * @returns {ArtifactDir[]}
 */
export function artifactDirs(wt) {
  return [
    { path: path.join(wt, "node_modules"), kind: "dependencies" },
    { path: path.join(wt, "libs", "ui", "node_modules"), kind: "dependencies" },
    { path: path.join(wt, "libs", "ui", "storybook-static"), kind: "build" },
  ]
}

/**
 * Cache locations for one base commit. Builds are shared by every harness;
 * snapshots live under the harness-keyed directory.
 * @param {string} root
 * @param {string} baseSha
 * @param {string} key
 * @returns {CachePaths}
 */
export function cachePathsFor(root, baseSha, key) {
  const buildDir = path.join(root, "builds", baseSha)
  const cacheDir = path.join(root, key, baseSha)
  return {
    buildDir,
    storybookDir: path.join(buildDir, "storybook-static"),
    cacheDir,
    snapshotDir: path.join(cacheDir, "snapshots"),
    manifestPath: path.join(cacheDir, manifestFile),
  }
}

/**
 * Returns the message for a base build that starts with too little free disk, or null.
 * @param {number} freeBytes
 * @returns {string | null}
 */
export function baseDiskError(freeBytes) {
  if (freeBytes >= minBaseFreeGiB * gib) {
    return null
  }
  const freeGiB = (freeBytes / gib).toFixed(1)
  return `Not enough free disk space for the base build (${freeGiB} GiB free, ${minBaseFreeGiB} GiB needed)`
}

/**
 * @param {string} ref
 * @param {string} stderr
 * @returns {string}
 */
export function mergeBaseError(ref, stderr) {
  const detail = stderr.trim()
  const suffix = detail ? `: ${detail}` : ""
  return `Cannot find a merge base of HEAD and "${ref}"${suffix}. Hint: run \`git fetch origin\` or pass --base <ref>`
}

/**
 * True when Playwright output says the browser executable is not installed.
 * @param {string} output
 * @returns {boolean}
 */
export function isBrowserMissing(output) {
  return browserMissingPattern.test(output)
}

/**
 * True when Playwright's summary shows at least one test result.
 * @param {string} output
 * @returns {boolean}
 */
export function ranTests(output) {
  return testResultPattern.test(output)
}

/**
 * Builds the environment for one Playwright run. Inherited variables that would
 * change what the spec runs are removed first. Base runs point at the base build,
 * compare runs never do.
 * @param {{ env: Record<string, string | undefined>, kind: "base" | "compare", snapshotDir: string, storybookDir?: string, storyIds: string[], port: number, workers: number, extra?: Record<string, string> }} input
 * @returns {Record<string, string | undefined>}
 */
export function childEnv({
  env,
  kind,
  snapshotDir,
  storybookDir,
  storyIds,
  port,
  workers,
  extra = {},
}) {
  if (kind === "base" && !storybookDir) {
    throw new Error("A base run needs the base Storybook directory")
  }
  const dropped = new Set([
    ...runnerEnvKeys,
    ...(kind === "base" ? baseOnlyEnvKeys : []),
  ])
  const inherited = Object.fromEntries(
    Object.entries(env).filter(([key]) => !dropped.has(key))
  )
  const baseOnly =
    kind === "base"
      ? { VISUAL_STORYBOOK_STATIC_DIR: path.resolve(storybookDir) }
      : {}
  return {
    ...inherited,
    ...baseOnly,
    VISUAL_NATIVE: "1",
    VISUAL_SNAPSHOT_DIR: path.resolve(snapshotDir),
    TEST_BASE_URL: `http://127.0.0.1:${port}`,
    TEST_STORIES: storyIds.join(","),
    PLAYWRIGHT_WORKERS: String(workers),
    ...extra,
  }
}

/**
 * Chooses which directories a cache level drops: everything outside the newest
 * `keep` by mtime. Protected names always stay and do not count toward `keep`.
 * @param {{ entries: { name: string, mtimeMs: number }[], keep: number, protectedNames: string[] }} input
 * @returns {string[]}
 */
export function pruneCandidates({ entries, keep, protectedNames }) {
  const protectedSet = new Set(protectedNames)
  const newest = [...entries].sort((a, b) => b.mtimeMs - a.mtimeMs)
  const kept = new Set(newest.slice(0, keep).map((entry) => entry.name))
  return newest
    .filter((entry) => !(kept.has(entry.name) || protectedSet.has(entry.name)))
    .map((entry) => entry.name)
}

/**
 * @param {string} file
 * @param {unknown} fallback
 * @returns {any}
 */
function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"))
  } catch {
    return fallback
  }
}

/**
 * @param {string} file
 * @returns {string}
 */
function readText(file) {
  try {
    return fs.readFileSync(file, "utf8")
  } catch {
    return ""
  }
}

/**
 * @param {string} file
 * @param {unknown} value
 */
function writeJsonAtomic(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const temp = `${file}.partial-${process.pid}`
  fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`)
  fs.renameSync(temp, file)
}

/**
 * @param {number} pid
 * @returns {boolean}
 */
function processAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false
  }
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return error.code === "EPERM"
  }
}

/** @returns {string} */
function tempRoot() {
  return process.env.OWNED_TEMP_DIR || os.tmpdir()
}

/**
 * @param {number} pid
 * @returns {string}
 */
function ownerTag(pid) {
  return `visual-local:${pid}`
}

/**
 * Registers or releases a tree with the disk guardian when it is installed.
 * @param {"register" | "release"} action
 * @param {ArtifactDir} artifact
 * @param {number} pid
 */
function guardian(action, artifact, pid) {
  if (!(fs.existsSync(guardianBin) && fs.existsSync(artifact.path))) {
    return
  }
  const args = [action, artifact.path, "--owner", ownerTag(pid)]
  if (action === "register") {
    args.push(
      "--kind",
      artifact.kind,
      "--grace-hours",
      guardianGraceHours,
      "--owner-pid",
      String(pid)
    )
  }
  const result = spawnSync(guardianBin, args, { stdio: "pipe" })
  if (action === "register" && result.status !== 0) {
    console.warn(`disk-guardian-artifacts could not register ${artifact.path}`)
  }
}

/**
 * @param {string} wt
 * @param {number} pid
 * @param {ArtifactDir["kind"]} kind
 */
function registerArtifacts(wt, pid, kind) {
  for (const artifact of artifactDirs(wt)) {
    if (artifact.kind === kind) {
      guardian("register", artifact, pid)
    }
  }
}

/**
 * Removes a temporary base worktree and its directory. Safe when partly created.
 * @param {string} tmp
 * @param {string} wt
 * @param {number} pid
 */
function removeBaseTemp(tmp, wt, pid) {
  for (const artifact of artifactDirs(wt)) {
    guardian("release", artifact, pid)
  }
  spawnSync("git", ["worktree", "remove", "--force", wt], {
    cwd: repoRoot,
    stdio: "pipe",
  })
  fs.rmSync(tmp, { recursive: true, force: true })
  spawnSync("git", ["worktree", "prune"], { cwd: repoRoot, stdio: "pipe" })
}

/** Removes the temporary base worktree and directory; safe to call more than once. */
function cleanupBaseTemp() {
  if (!baseTemp) {
    return
  }
  const { tmp, wt } = baseTemp
  baseTemp = null
  removeBaseTemp(tmp, wt, process.pid)
}

/**
 * Removes temporary base directories whose owner died without cleaning up
 * (SIGKILL, crash, closed terminal) and prunes stale worktree records.
 */
function sweepStaleBaseTemps() {
  const root = tempRoot()
  if (fs.existsSync(root)) {
    for (const name of fs.readdirSync(root)) {
      if (!name.startsWith(tempPrefix)) {
        continue
      }
      const tmp = path.join(root, name)
      const pid = Number(readText(path.join(tmp, ownerFile)).trim())
      if (!processAlive(pid)) {
        removeBaseTemp(tmp, path.join(tmp, "wt"), pid)
      }
    }
  }
  spawnSync("git", ["worktree", "prune"], { cwd: repoRoot, stdio: "pipe" })
}

/**
 * @param {string} dir
 * @returns {string[]}
 */
function dirsIn(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
}

/**
 * Removes partial captures, partial publishes and retired locks whose owner pid
 * is dead. Looks at the two cache levels: builds/ and <key>/ at the top, then
 * each base commit directory below them.
 * @param {string} dir
 */
function sweepDeadArtifacts(dir) {
  for (const name of fs.readdirSync(dir)) {
    const match = artifactPattern.exec(name)
    if (match && !processAlive(Number(match[1]))) {
      fs.rmSync(path.join(dir, name), { recursive: true, force: true })
    }
  }
}

/**
 * @param {string} root
 */
function sweepStaleArtifacts(root) {
  if (!fs.existsSync(root)) {
    return
  }
  for (const level of dirsIn(root)) {
    const levelDir = path.join(root, level)
    sweepDeadArtifacts(levelDir)
    for (const sha of dirsIn(levelDir)) {
      sweepDeadArtifacts(path.join(levelDir, sha))
    }
  }
}

/** @returns {number | null} */
function readBuiltAt(buildDir) {
  const createdAt = readJson(path.join(buildDir, "meta.json"), {}).createdAt
  const time = Date.parse(createdAt ?? "")
  return Number.isNaN(time) ? null : time
}

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * @param {string} content
 * @returns {number | null}
 */
function ownerOf(content) {
  const pid = Number(content.trim())
  return Number.isInteger(pid) && pid > 0 ? pid : null
}

/**
 * A lock is stale when its owner is gone, or when it was never written and is old.
 * @param {string} content the lock text as read
 * @param {string} file
 * @returns {boolean}
 */
function isStaleLock(content, file) {
  const pid = ownerOf(content)
  if (pid !== null) {
    return !processAlive(pid)
  }
  try {
    return Date.now() - fs.statSync(file).mtimeMs > unownedLockMs
  } catch {
    return false
  }
}

/**
 * @param {string} file
 * @returns {boolean} true when this process created the lock
 */
function tryCreateLock(file) {
  try {
    fs.writeFileSync(file, `${process.pid}\n`, { flag: "wx" })
  } catch (error) {
    if (error.code === "EEXIST") {
      return false
    }
    throw error
  }
  heldLocks.push(file)
  return true
}

/**
 * Moves a lock out of the way under a unique name, so only one caller can take
 * a given lock. If the moved file is not the one the caller inspected, it is put
 * back and nothing is removed.
 * @param {string} file
 * @param {string} expected the lock text the caller inspected
 * @returns {boolean} true when the lock was removed
 */
function retireLock(file, expected) {
  const grave = `${file}.retired-${process.pid}`
  try {
    fs.renameSync(file, grave)
  } catch (error) {
    if (error.code === "ENOENT") {
      return false
    }
    throw error
  }
  if (readText(grave) === expected) {
    fs.rmSync(grave, { force: true })
    return true
  }
  try {
    fs.linkSync(grave, file)
  } catch (error) {
    if (error.code !== "EEXIST") {
      throw error
    }
  }
  fs.rmSync(grave, { force: true })
  return false
}

/**
 * @param {string} file
 * @returns {boolean} true when a stale lock was removed and the caller may retry
 */
function takeOverStaleLock(file) {
  const observed = readText(file)
  return isStaleLock(observed, file) && retireLock(file, observed)
}

/**
 * Takes a lock so one run at a time builds, publishes or captures a directory.
 * Waits while another live run holds it.
 * @param {string} file
 */
async function acquireLock(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const deadline = Date.now() + lockTimeoutMs
  let announced = false
  while (!tryCreateLock(file)) {
    if (!takeOverStaleLock(file)) {
      if (!announced) {
        console.log(`Waiting for another run that holds ${file}`)
        announced = true
      }
      if (Date.now() > deadline) {
        throw new Error(`Timed out waiting for ${file}`)
      }
      await sleep(lockPollMs)
    }
  }
}

/** Releases every lock this process holds. */
function releaseLocks() {
  for (const file of heldLocks.splice(0)) {
    const observed = readText(file)
    if (ownerOf(observed) === process.pid) {
      retireLock(file, observed)
    }
  }
}

/** Runs every cleanup this process owns. Synchronous, so it works on exit. */
function runCleanup() {
  cleanupBaseTemp()
  releaseLocks()
}

/**
 * @param {string} dir
 * @returns {string[]}
 */
function visualIdsOf(dir) {
  return visualStories(readIndexEntries(dir)).map((entry) => entry.id)
}

/**
 * @param {string} dir
 * @returns {Record<string, { id: string, type: string, tags?: string[] }>}
 */
function readIndexEntries(dir) {
  const indexPath = path.join(dir, "index.json")
  if (!fs.existsSync(indexPath)) {
    throw new Error(
      `Storybook index not found: ${indexPath}. Build Storybook first.`
    )
  }
  return JSON.parse(fs.readFileSync(indexPath, "utf8")).entries
}

/**
 * @param {string} command
 * @param {string[]} args
 * @param {import("node:child_process").SpawnSyncOptions} [options]
 * @returns {number} exit status; null signals count as 1
 */
function spawnStatus(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", ...options })
  if (result.error) {
    throw new Error(`Cannot start ${command}: ${result.error.message}`)
  }
  return result.status ?? 1
}

/**
 * @param {string} command
 * @param {string[]} args
 * @param {import("node:child_process").SpawnSyncOptions} [options]
 */
function run(command, args, options = {}) {
  const status = spawnStatus(command, args, options)
  if (status !== 0) {
    throw new Error(`Command failed (${status}): ${command} ${args.join(" ")}`)
  }
}

/**
 * Runs a command with output shown live. The last characters are kept so the
 * caller can recognise known failures.
 * @param {string} command
 * @param {string[]} args
 * @param {import("node:child_process").SpawnOptions} options
 * @returns {Promise<RunResult>}
 */
function runStreamed(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      stdio: ["inherit", "pipe", "pipe"],
    })
    let tail = ""
    /** @param {NodeJS.WriteStream} sink */
    const relay = (sink) => (chunk) => {
      sink.write(chunk)
      tail = (tail + chunk.toString()).slice(-outputTailChars)
    }
    child.stdout.on("data", relay(process.stdout))
    child.stderr.on("data", relay(process.stderr))
    child.on("error", (error) => {
      reject(new Error(`Cannot start ${command}: ${error.message}`))
    })
    child.on("close", (code) => {
      resolve({ status: code ?? 1, output: tail })
    })
  })
}

/**
 * Builds Storybook with Node so Windows never spawns the pnpm.cmd shim.
 * The CLI is resolved from the given UI directory, so a temporary worktree
 * builds with its own Storybook.
 * @param {string} uiDir
 */
function buildStorybook(uiDir) {
  const manifest = createRequire(path.join(uiDir, "package.json")).resolve(
    "storybook/package.json"
  )
  const bin = JSON.parse(fs.readFileSync(manifest, "utf8")).bin
  const binPath = typeof bin === "string" ? bin : bin?.storybook
  run(process.execPath, [path.join(path.dirname(manifest), binPath), "build"], {
    cwd: uiDir,
  })
}

/** @returns {string} */
function readPlaywrightVersion() {
  const manifest = createRequire(path.join(uiRoot, "package.json")).resolve(
    "@playwright/test/package.json"
  )
  return JSON.parse(fs.readFileSync(manifest, "utf8")).version
}

/** @returns {string} */
function playwrightCli() {
  return createRequire(path.join(uiRoot, "package.json")).resolve(
    "@playwright/test/cli"
  )
}

/** @returns {string[]} */
function matrixNames() {
  return createVisualMatrix().map((project) => project.name)
}

/**
 * Asks the OS for an unused port. The port can be reused by another process
 * after this returns; that race is accepted for a local tool.
 * @returns {Promise<number>}
 */
export function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.on("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      const port = typeof address === "object" && address ? address.port : 0
      server.close(() => resolve(port))
    })
  })
}

/**
 * Copies a finished build next to the target and renames it into place, so a
 * half-copied build is never read as a cache hit. Callers hold the base lock.
 * @param {string} sourceDir
 * @param {string} targetDir
 */
function publishBuild(sourceDir, targetDir) {
  fs.mkdirSync(path.dirname(targetDir), { recursive: true })
  const staging = `${targetDir}.partial-${process.pid}`
  fs.rmSync(staging, { recursive: true, force: true })
  fs.cpSync(sourceDir, staging, { recursive: true })
  fs.rmSync(targetDir, { recursive: true, force: true })
  fs.renameSync(staging, targetDir)
}

/**
 * Moves the files of a finished partial capture into the snapshot directory,
 * one rename per file, overwriting older files of the same name.
 * @param {string} fromDir
 * @param {string} toDir
 */
function publishSnapshots(fromDir, toDir) {
  fs.mkdirSync(toDir, { recursive: true })
  for (const name of fs.readdirSync(fromDir)) {
    fs.renameSync(path.join(fromDir, name), path.join(toDir, name))
  }
}

/**
 * Fails early when the temporary location cannot hold a base build.
 * @param {string} dir
 */
function assertBaseDisk(dir) {
  const stats = fs.statfsSync(dir)
  const message = baseDiskError(stats.bavail * stats.bsize)
  if (message) {
    throw new Error(message)
  }
}

/**
 * Builds Storybook for the base commit in a temporary worktree and publishes it
 * to the cache. The temporary worktree and directory are always removed.
 * @param {{ baseSha: string, paths: CachePaths }} input
 */
function buildBaseInTemp({ baseSha, paths }) {
  fs.mkdirSync(tempRoot(), { recursive: true })
  assertBaseDisk(tempRoot())
  const tmp = fs.mkdtempSync(path.join(tempRoot(), tempPrefix))
  const wt = path.join(tmp, "wt")
  fs.writeFileSync(path.join(tmp, ownerFile), String(process.pid))
  baseTemp = { tmp, wt }
  try {
    run("git", ["worktree", "add", "--detach", wt, baseSha], { cwd: repoRoot })
    run("pnpm", ["install", "--frozen-lockfile", "--prefer-offline"], {
      cwd: wt,
    })
    registerArtifacts(wt, process.pid, "dependencies")
    buildStorybook(path.join(wt, "libs", "ui"))
    registerArtifacts(wt, process.pid, "build")
    publishBuild(
      path.join(wt, "libs", "ui", "storybook-static"),
      paths.storybookDir
    )
    writeJsonAtomic(path.join(paths.buildDir, "meta.json"), {
      baseSha,
      createdAt: new Date().toISOString(),
    })
  } finally {
    cleanupBaseTemp()
  }
}

/**
 * Forced rebuilds also drop the base baselines for this harness, so a bad
 * capture cannot survive.
 * @param {CachePaths} paths
 */
function clearBaseSnapshots(paths) {
  fs.rmSync(paths.snapshotDir, { recursive: true, force: true })
  fs.rmSync(paths.manifestPath, { force: true })
}

/**
 * @param {string[]} args
 * @param {Record<string, string | undefined>} env
 * @returns {Promise<RunResult>}
 */
function runPlaywright(args, env) {
  return runStreamed(
    process.execPath,
    [playwrightCli(), "test", "-c", playwrightConfig, visualSpec, ...args],
    { cwd: uiRoot, env }
  )
}

/**
 * Selects the stories to check. Explicit ids skip change detection.
 * @param {{ options: Options, baseSha: string, headIds: string[] }} input
 * @returns {Selection}
 */
function selectStories({ options, baseSha, headIds }) {
  if (options.stories.length) {
    const unknown = options.stories.filter((id) => !headIds.includes(id))
    if (unknown.length) {
      throw new Error(`Unknown visual story id(s): ${unknown.join(", ")}`)
    }
    return {
      mode: "subset",
      storyIds: options.stories,
      reason: "explicit --stories",
    }
  }
  if (options.all) {
    return { mode: "all", storyIds: headIds, reason: "--all" }
  }
  const selection = affectedStoriesFromDisk({
    repoRoot,
    storybookDir: headStorybookDir,
    changedFiles: gitChangedFiles(repoRoot, baseSha),
  })
  return selection.mode === "all"
    ? { ...selection, storyIds: headIds }
    : selection
}

/**
 * @param {string} ref
 * @returns {string}
 */
function mergeBase(ref) {
  try {
    return execFileSync("git", ["merge-base", "HEAD", ref], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim()
  } catch (error) {
    throw new Error(mergeBaseError(ref, String(error.stderr ?? "")))
  }
}

/**
 * @param {string} snapshotDir
 * @returns {string[]}
 */
function snapshotNames(snapshotDir) {
  return fs.existsSync(snapshotDir) ? fs.readdirSync(snapshotDir) : []
}

/** @returns {string} */
function cacheRoot() {
  return resolveCacheRoot(process.env, process.platform, os.homedir())
}

/**
 * The harness-keyed snapshot directory key for this working tree.
 * @returns {string}
 */
function currentHarnessKey() {
  return harnessKey({
    platform: process.platform,
    arch: process.arch,
    playwrightVersion: readPlaywrightVersion(),
    harness: harnessHash(readHarnessFiles(uiRoot)),
  })
}

/**
 * Plans against the cached base build. Requires its index.json.
 * @param {CachePaths} paths
 * @param {string[]} selected
 * @returns {BasePlan}
 */
function basePlanFor(paths, selected) {
  return planBase({
    selected,
    baseVisualIds: visualIdsOf(paths.storybookDir),
    projectNames: matrixNames(),
    platform: process.platform,
    existingSnapshotNames: snapshotNames(paths.snapshotDir),
    manifest: readJson(paths.manifestPath, {}),
  })
}

/**
 * Prints the plan as one JSON object. Base fields stay null until the base build is cached.
 * @param {{ baseSha: string, paths: CachePaths, selection: Selection }} input
 * @returns {void}
 */
function printPlan({ baseSha, paths, selection }) {
  const hasBase = fs.existsSync(path.join(paths.storybookDir, "index.json"))
  const plan = hasBase ? basePlanFor(paths, selection.storyIds) : null
  console.log(
    JSON.stringify({
      baseSha,
      cacheDir: paths.cacheDir,
      mode: selection.mode,
      reason: selection.reason,
      selected: selection.storyIds,
      missingBase: plan?.missingBase ?? null,
      newStories: plan?.newStories ?? null,
    })
  )
}

/**
 * Captures base baselines for stories that lack at least one recorded file. The
 * capture goes to a fresh partial directory, which is only published after Playwright
 * exits 0. Any other outcome removes it.
 * @param {{ paths: CachePaths, storyIds: string[], workers: number }} input
 */
async function captureMissing({ paths, storyIds, workers }) {
  const partial = path.join(paths.cacheDir, `snapshots.partial-${process.pid}`)
  const port = await freePort()
  fs.rmSync(partial, { recursive: true, force: true })
  fs.mkdirSync(partial, { recursive: true })
  try {
    const result = await runPlaywright(
      [
        "--update-snapshots=missing",
        "--reporter=line",
        "--output",
        path.join(localDir, "base-results"),
      ],
      childEnv({
        env: process.env,
        kind: "base",
        snapshotDir: partial,
        storybookDir: paths.storybookDir,
        storyIds,
        port,
        workers,
      })
    )
    if (result.status !== 0) {
      const hint = isBrowserMissing(result.output) ? ` ${browserHint}` : ""
      throw new Error(
        `Base baseline capture failed with exit ${result.status}.${hint}`
      )
    }
    publishSnapshots(partial, paths.snapshotDir)
  } finally {
    fs.rmSync(partial, { recursive: true, force: true })
  }
}

/**
 * Records the files each captured story now owns. Runs only after a successful
 * capture, so a failed run never marks a story as cached.
 * @param {{ paths: CachePaths, storyIds: string[] }} input
 */
function recordCaptures({ paths, storyIds }) {
  const entries = buildManifestEntries({
    captured: storyIds,
    baseVisualIds: visualIdsOf(paths.storybookDir),
    fileNames: snapshotNames(paths.snapshotDir),
    projectNames: matrixNames(),
    platform: process.platform,
  })
  writeJsonAtomic(paths.manifestPath, {
    ...readJson(paths.manifestPath, {}),
    ...entries,
  })
}

/**
 * Builds and captures what the base commit needs under the per-directory locks,
 * taken in a fixed order (build, then snapshots) so runs cannot deadlock.
 * @param {{ options: Options, baseSha: string, paths: CachePaths, selectedIds: string[], startedAt: number }} input
 * @returns {Promise<BasePlan>}
 */
async function prepareBase({
  options,
  baseSha,
  paths,
  selectedIds,
  startedAt,
}) {
  try {
    await acquireLock(`${paths.buildDir}${lockSuffix}`)
    await acquireLock(`${paths.cacheDir}${lockSuffix}`)
    fs.mkdirSync(paths.cacheDir, { recursive: true })
    const building = needsBaseBuild({
      hasIndex: fs.existsSync(path.join(paths.storybookDir, "index.json")),
      rebuildBase: options.rebuildBase,
      builtAt: readBuiltAt(paths.buildDir),
      startedAt,
    })
    if (building) {
      console.log(
        `Building the base commit ${baseSha} in a temporary worktree (about 2 minutes)...`
      )
      buildBaseInTemp({ baseSha, paths })
      if (options.rebuildBase) {
        clearBaseSnapshots(paths)
      }
    }
    const plan = basePlanFor(paths, selectedIds)
    if (plan.missingBase.length) {
      console.log(
        `Capturing ${plan.missingBase.length} base screenshot stories...`
      )
      await captureMissing({
        paths,
        storyIds: plan.missingBase,
        workers: options.workers,
      })
      recordCaptures({ paths, storyIds: plan.missingBase })
    }
    return plan
  } finally {
    releaseLocks()
  }
}

/**
 * @param {{ paths: CachePaths, storyIds: string[], workers: number }} input
 * @returns {Promise<RunResult>}
 */
async function compareWorkingTree({ paths, storyIds, workers }) {
  const reportDir = path.join(localDir, "report")
  const port = await freePort()
  return runPlaywright(
    ["--reporter=list,html", "--output", path.join(localDir, "results")],
    childEnv({
      env: process.env,
      kind: "compare",
      snapshotDir: paths.snapshotDir,
      storyIds,
      port,
      workers,
      extra: {
        PLAYWRIGHT_HTML_OUTPUT_DIR: reportDir,
        PLAYWRIGHT_HTML_OPEN: "never",
      },
    })
  )
}

/**
 * Marks the base directories used by this run as recent, then drops the older
 * ones beyond `keep`. Locked directories are never dropped.
 * @param {{ root: string, paths: CachePaths, baseSha: string, keep: number }} input
 */
function touchAndPrune({ root, paths, baseSha, keep }) {
  const now = new Date()
  for (const dir of [paths.buildDir, paths.cacheDir]) {
    fs.utimesSync(dir, now, now)
  }
  pruneLevel(path.join(root, "builds"), keep, [baseSha])
  pruneLevel(path.dirname(paths.cacheDir), keep, [baseSha])
}

/**
 * Names of base commits whose lock is held by a live run.
 * @param {string} dir
 * @returns {string[]}
 */
function liveLockNames(dir) {
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(lockSuffix))
    .filter((name) => {
      const file = path.join(dir, name)
      return !isStaleLock(readText(file), file)
    })
    .map((name) => name.slice(0, -lockSuffix.length))
}

/**
 * @param {string} dir
 * @param {number} keep
 * @param {string[]} protectedNames
 */
function pruneLevel(dir, keep, protectedNames) {
  if (!fs.existsSync(dir)) {
    return
  }
  const entries = dirsIn(dir).map((name) => ({
    name,
    mtimeMs: fs.statSync(path.join(dir, name)).mtimeMs,
  }))
  const stale = pruneCandidates({
    entries,
    keep,
    protectedNames: [...protectedNames, ...liveLockNames(dir)],
  })
  for (const name of stale) {
    fs.rmSync(path.join(dir, name), { recursive: true, force: true })
  }
}

/**
 * @param {{ baseSha: string, paths: CachePaths, plan: BasePlan, compare: RunResult | null, selectedCount: number, cached: number }} input
 */
function printSummary({
  baseSha,
  paths,
  plan,
  compare,
  selectedCount,
  cached,
}) {
  const reportDir = path.join(localDir, "report")
  const lines = [
    `Base: ${baseSha}`,
    `Cache: ${paths.cacheDir}`,
    `Stories: selected ${selectedCount}, base cached ${cached}, base captured now ${plan.missingBase.length}, compared ${plan.baseStories.length}, new ${plan.newStories.length}`,
  ]
  if (plan.newStories.length) {
    lines.push(`New, no baseline (not compared): ${plan.newStories.join(", ")}`)
  }
  lines.push(`Report: ${reportDir}`)
  if (compare && compare.status !== 0) {
    if (isBrowserMissing(compare.output)) {
      lines.push(browserHint)
    } else if (ranTests(compare.output)) {
      lines.push(
        `Differences are against ${baseSha}; open the report: pnpm exec playwright show-report ${reportDir}`
      )
    } else {
      lines.push(
        `The compare run exited ${compare.status} before any test ran; see the output above.`
      )
    }
  }
  console.log(lines.join("\n"))
}

/**
 * @param {Options} options
 * @returns {Promise<number>}
 */
async function main(options) {
  const startedAt = Date.now()
  const keep = cacheKeepFrom(process.env)
  const root = cacheRoot()
  sweepStaleBaseTemps()
  sweepStaleArtifacts(root)
  const baseSha = mergeBase(options.base)
  const paths = cachePathsFor(root, baseSha, currentHarnessKey())
  if (process.env.PLAYWRIGHT_STORYBOOK_REBUILD !== "0") {
    buildStorybook(uiRoot)
  }
  const headIds = visualIdsOf(headStorybookDir)
  const selection = selectStories({ options, baseSha, headIds })
  if (selection.mode === "none") {
    console.log("No visual story is affected by these changes.")
    return 0
  }
  const plan = await prepareBase({
    options,
    baseSha,
    paths,
    selectedIds: selection.storyIds,
    startedAt,
  })
  const cached = plan.baseStories.length - plan.missingBase.length
  /** @type {RunResult | null} */
  let compare = null
  if (plan.baseStories.length) {
    compare = await compareWorkingTree({
      paths,
      storyIds: plan.baseStories,
      workers: options.workers,
    })
  } else {
    console.log("No selected story has a base build; nothing to compare.")
  }
  printSummary({
    baseSha,
    paths,
    plan,
    compare,
    selectedCount: selection.storyIds.length,
    cached,
  })
  const status = compare?.status ?? 0
  if (status === 0) {
    try {
      touchAndPrune({ root, paths, baseSha, keep })
    } catch (error) {
      console.warn(`Cache pruning skipped: ${error.message}`)
    }
  }
  return status
}

if (process.argv[1] && import.meta.filename === path.resolve(process.argv[1])) {
  // Signal handlers call process.exit, which runs runCleanup through the exit event.
  process.on("exit", runCleanup)
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    process.on(signal, () => process.exit(1))
  }
  try {
    const options = parseArgs(process.argv.slice(2))
    if (options.dryRun) {
      const baseSha = mergeBase(options.base)
      const selection = selectStories({
        options,
        baseSha,
        headIds: visualIdsOf(headStorybookDir),
      })
      printPlan({
        baseSha,
        paths: cachePathsFor(cacheRoot(), baseSha, currentHarnessKey()),
        selection,
      })
      process.exitCode = 0
    } else {
      main(options).then(
        (status) => {
          process.exitCode = status
        },
        (error) => {
          console.error(
            "Error:",
            error instanceof Error ? error.message : error
          )
          process.exitCode = 1
        }
      )
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}

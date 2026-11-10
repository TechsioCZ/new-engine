/**
 * Rebuilds libs/ui/storybook-static only when the files that shape the build
 * changed. The marker next to the build records the inputs it was made from.
 */
import { execFileSync, spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import fs from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { GIT_MAX_BUFFER } from "./visual-affected-stories.mjs"

/**
 * @typedef {{ path: string, id: string }} InputEntry
 * @typedef {"external" | "kept" | "current" | "built"} BuildAction
 */

const defaultUiRoot = path.resolve(import.meta.dirname, "..")
const defaultRepoRoot = path.resolve(defaultUiRoot, "../..")
const markerName = ".visual-build.json"
const INPUT_PATHSPECS = [
  "libs/ui",
  "pnpm-lock.yaml",
  "package.json",
  "pnpm-workspace.yaml",
  "tsconfig.base.json",
  ".npmrc",
  ".gitattributes",
  "patches",
  // Workflows pin the Node version and spell out the build command.
  ".github/workflows",
]
// Everything else under libs/ui is an input: the bundler config imports test
// helpers and Tailwind scans every tracked file there for class names.
const BASELINE_PREFIX = "libs/ui/test/visual.spec.ts-snapshots/"
const RENAME_STATUS = /[RC]/

/**
 * @param {string} file repo-relative POSIX path
 * @returns {boolean} false only for the committed baseline screenshots
 */
export function isBuildInput(file) {
  return !file.startsWith(BASELINE_PREFIX)
}

/**
 * @param {InputEntry} a
 * @param {InputEntry} b
 * @returns {number}
 */
function byPath(a, b) {
  if (a.path === b.path) {
    return 0
  }
  return a.path < b.path ? -1 : 1
}

/**
 * @param {InputEntry[]} entries
 * @returns {string} first 16 hex characters of a sha256
 */
export function inputsHash(entries) {
  const hash = createHash("sha256")
  for (const { path: file, id } of [...entries].sort(byPath)) {
    hash.update(`${file}\0${id}\n`)
  }
  return hash.digest("hex").slice(0, 16)
}

/**
 * @param {string} repoRoot
 * @param {string[]} args
 * @returns {string[]} NUL-separated records
 */
function gitRecords(repoRoot, args) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: GIT_MAX_BUFFER,
  })
    .split("\0")
    .filter(Boolean)
}

/**
 * @param {string} repoRoot
 * @returns {Map<string, string>} tracked input path to blob id
 */
function trackedInputs(repoRoot) {
  const ids = new Map()
  for (const record of gitRecords(repoRoot, [
    "ls-files",
    "-s",
    "-z",
    "--",
    ...INPUT_PATHSPECS,
  ])) {
    // Each record is "<mode> <blob> <stage>\t<path>".
    const tab = record.indexOf("\t")
    ids.set(record.slice(tab + 1), record.slice(0, tab).split(" ")[1])
  }
  return ids
}

/**
 * Paths with local changes under the input pathspecs, untracked files included.
 * @param {string} repoRoot
 * @returns {string[]}
 */
function changedPaths(repoRoot) {
  const records = gitRecords(repoRoot, [
    "status",
    "--porcelain=v1",
    "-z",
    "--untracked-files=all",
    "--",
    ...INPUT_PATHSPECS,
  ])
  const paths = []
  for (let index = 0; index < records.length; index += 1) {
    paths.push(records[index].slice(3))
    if (RENAME_STATUS.test(records[index].slice(0, 2))) {
      // A rename or copy record is followed by its original path; skip it.
      index += 1
    }
  }
  return paths
}

/**
 * @param {string} repoRoot
 * @param {string} file
 * @returns {string} content id of the file on disk, or "deleted"
 */
function worktreeId(repoRoot, file) {
  const absolute = path.join(repoRoot, file)
  if (!fs.existsSync(absolute)) {
    return "deleted"
  }
  const digest = createHash("sha256")
    .update(fs.readFileSync(absolute))
    .digest("hex")
  return `wt:${digest}`
}

/**
 * Files that can change the Storybook build, with a content id for each. Tracked
 * files use their blob id; working-tree edits, new files and deletions override it.
 * @param {string} repoRoot
 * @returns {InputEntry[]}
 */
export function storybookInputEntries(repoRoot) {
  const ids = trackedInputs(repoRoot)
  for (const file of changedPaths(repoRoot).filter(isBuildInput)) {
    ids.set(file, worktreeId(repoRoot, file))
  }
  return [...ids]
    .filter(([file]) => isBuildInput(file))
    .map(([file, id]) => ({ path: file, id }))
}

/**
 * @param {string} storybookDir
 * @returns {{ inputs?: string } | null}
 */
function readMarker(storybookDir) {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(storybookDir, markerName), "utf8")
    )
  } catch {
    return null
  }
}

/**
 * @param {string} storybookDir
 * @param {string} inputs
 */
function writeMarker(storybookDir, inputs) {
  fs.writeFileSync(
    path.join(storybookDir, markerName),
    `${JSON.stringify({ inputs })}\n`
  )
}

/**
 * Runs the Storybook CLI with Node so Windows never spawns the pnpm.cmd shim.
 * The CLI resolves from the given UI directory, so a worktree builds its own.
 * @param {string} dir
 * @param {string} outputDir
 */
function buildStorybook(dir, outputDir) {
  const manifest = createRequire(path.join(dir, "package.json")).resolve(
    "storybook/package.json"
  )
  const bin = JSON.parse(fs.readFileSync(manifest, "utf8")).bin
  const binPath = typeof bin === "string" ? bin : bin?.storybook
  const result = spawnSync(
    process.execPath,
    [
      path.join(path.dirname(manifest), binPath),
      "build",
      "--output-dir",
      path.resolve(outputDir),
    ],
    { cwd: dir, stdio: "inherit" }
  )
  if (result.error || result.status !== 0) {
    throw new Error(`Storybook build failed in ${dir}`)
  }
}

/**
 * @param {{ uiRoot: string, repoRoot: string, storybookDir: string, externalBuild: boolean, rebuild: string | undefined }} options
 * @returns {BuildAction}
 */
function decideAndBuild({
  uiRoot: dir,
  repoRoot: root,
  storybookDir,
  externalBuild,
  rebuild,
}) {
  if (externalBuild) {
    console.log("Storybook: external build given, not building")
    return "external"
  }
  if (rebuild === "0") {
    console.log(
      `Storybook: PLAYWRIGHT_STORYBOOK_REBUILD=0, reusing ${storybookDir}`
    )
    return "kept"
  }
  const inputs = inputsHash(storybookInputEntries(root))
  if (rebuild !== "1" && readMarker(storybookDir)?.inputs === inputs) {
    console.log(`Storybook: build is current, inputs ${inputs}`)
    return "current"
  }
  const reason =
    rebuild === "1"
      ? "forced by PLAYWRIGHT_STORYBOOK_REBUILD=1"
      : "inputs changed or no build recorded"
  console.log(`Storybook: building (${reason}), inputs ${inputs}`)
  // A failed rebuild must not leave the previous marker on a half-written build.
  fs.rmSync(path.join(storybookDir, markerName), { force: true })
  buildStorybook(dir, storybookDir)
  writeMarker(storybookDir, inputs)
  return "built"
}

/**
 * Makes sure storybookDir holds a usable build of the checked-out inputs.
 * @param {{ uiRoot: string, repoRoot: string, storybookDir: string, externalBuild: boolean, rebuild: string | undefined }} options
 *   externalBuild: the build comes from VISUAL_STORYBOOK_STATIC_DIR and is never rebuilt.
 *   rebuild: PLAYWRIGHT_STORYBOOK_REBUILD; "1" always builds, "0" never builds.
 * @returns {BuildAction}
 */
export function ensureStorybookBuild({
  uiRoot: dir,
  repoRoot: root,
  storybookDir,
  externalBuild,
  rebuild,
}) {
  const action = decideAndBuild({
    uiRoot: dir,
    repoRoot: root,
    storybookDir,
    externalBuild,
    rebuild,
  })
  if (!fs.existsSync(path.join(storybookDir, "iframe.html"))) {
    throw new Error(`Storybook build not found: ${storybookDir}`)
  }
  return action
}

/** @param {string[]} argv */
function main(argv) {
  if (argv.includes("--inputs-hash")) {
    console.log(inputsHash(storybookInputEntries(defaultRepoRoot)))
    return
  }
  if (argv.includes("--ensure")) {
    console.log(
      ensureStorybookBuild({
        uiRoot: defaultUiRoot,
        repoRoot: defaultRepoRoot,
        storybookDir: path.join(defaultUiRoot, "storybook-static"),
        externalBuild: false,
        rebuild: process.env.PLAYWRIGHT_STORYBOOK_REBUILD,
      })
    )
    return
  }
  throw new Error("Usage: visual-storybook-build.mjs --inputs-hash | --ensure")
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  try {
    main(process.argv.slice(2))
  } catch (error) {
    process.stderr.write(`${error.message}\n`)
    process.exitCode = 1
  }
}

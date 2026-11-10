/**
 * Maps changed UI-library files to the Storybook visual stories they can affect,
 * so local visual runs can screenshot a subset. Conservative by design: whenever
 * a change might alter any screenshot, the answer is mode "all".
 */
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { visualStories } from "../test/visual-completion.mjs"

/**
 * @typedef {{ mode: "all" | "subset" | "none", storyIds: string[], reason: string }} Selection
 * @typedef {{ id: string, type: string, importPath?: string, tags?: string[] }} IndexEntry
 * @typedef {{ all?: string, storyIds?: string[] }} Verdict
 * @typedef {{
 *   visual: IndexEntry[],
 *   storyIdsByKey: Map<string, string[]>,
 *   storyKeysByFile: Map<string, Set<string>>,
 *   missing: string | undefined,
 * }} Context
 */

const SELF_PACKAGE = "@techsio/ui-kit"
const SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".mts",
  ".mjs",
  ".js",
  ".jsx",
])
const RESOLVE_EXTENSIONS = [
  ".tsx",
  ".ts",
  ".mts",
  ".mjs",
  ".js",
  ".jsx",
  ".json",
  ".css",
]
const INDEX_FILES = ["index.tsx", "index.ts"]
const ROOT_DEPENDENCY_FILES = new Set([
  "pnpm-lock.yaml",
  "package.json",
  "pnpm-workspace.yaml",
])
/** Root files matched by exact repo-relative path; they change how Storybook is built. */
const ROOT_BUILD_CONFIG_FILES = new Set([
  "tsconfig.base.json",
  "nx.json",
  ".npmrc",
  ".mise.toml",
  ".prototools",
])
const PATCHES_PREFIX = "patches/"
const DOCKER_PLAYWRIGHT_PREFIX = "docker/development/playwright/"
const UI_PREFIX = "libs/ui/"
const SNAPSHOT_PATTERN =
  /^libs\/ui\/test\/visual\.spec\.ts-snapshots\/([^/]+)\.png$/
const SOURCE_ROOTS = ["libs/ui/stories/", "libs/ui/src/"]
const IGNORED_UI_DIRS = [
  "libs/ui/tests/",
  "libs/ui/skills/",
  "libs/ui/agent-plugin/",
]
const IGNORED_UI_FILES = new Set([
  "libs/ui/test/tour.playwright.config.ts",
  "libs/ui/test/vertical-navigation.playwright.config.ts",
])
const MAX_REASON_ITEMS = 5
/** git output cap; the 1 MiB default overflows (ENOBUFS) on large diffs. */
export const GIT_MAX_BUFFER = 256 * 1024 * 1024
const DIST_JS_PATTERN = /^\.\/dist\/.+\.js$/
const UI_TEST_SPEC = /\.spec\.ts$/
const IGNORED_NAME_PATTERNS = [
  /\.(md|mdx|d\.ts)$/,
  /\.figma\.tsx?$/,
  /\.test\.(ts|tsx|mjs)$/,
  /\.node-test\.mjs$/,
]

const FROM_SPECIFIER =
  /\b(?:import|export)\b[^'"`;]*?\bfrom\s*["']([^"'\n]+)["']/g
const SIDE_EFFECT_IMPORT = /\bimport\s*["']([^"'\n]+)["']/g
const DYNAMIC_IMPORT = /\bimport\s*\(\s*["']([^"'\n]+)["']\s*\)/g
const REQUIRE_CALL = /\brequire\s*\(\s*["']([^"'\n]+)["']\s*\)/g

/** Stands in for an import or require whose argument is not a string literal. */
export const NON_LITERAL_SPECIFIER = "<non-literal import>"
const BLOCK_COMMENT = /\/\*[\s\S]*?\*\//g
const LINE_COMMENT = /(^|\s)\/\/.*$/gm
const IMPORT_CALL_SITE = /\b(?:import|require)\s*\(/g

/**
 * Blank out comments so apostrophes or semicolons inside them cannot break matching.
 * The stripper is not string-aware, so it can also blank code that follows a "/*"
 * or "//" inside a string; collectImportSpecifiers therefore also scans the raw source.
 * @param {string} source
 * @returns {string}
 */
function stripComments(source) {
  return source
    .replace(BLOCK_COMMENT, (match) => match.replace(/[^\n]/g, " "))
    .replace(LINE_COMMENT, (_match, lead) => lead)
}

/**
 * Collect module specifiers from import, export-from, dynamic import and require.
 * Matches come from both the raw and the comment-stripped source, so a stripper
 * mistake can only add an edge, never drop one. A dynamic import or require whose
 * argument is not a plain string literal adds NON_LITERAL_SPECIFIER, which the
 * resolver treats as unresolved.
 * @param {string} source
 * @returns {string[]} sorted, unique
 */
export function collectImportSpecifiers(source) {
  const specifiers = new Set()
  let nonLiteral = false
  for (const code of new Set([source, stripComments(source)])) {
    for (const pattern of [
      FROM_SPECIFIER,
      SIDE_EFFECT_IMPORT,
      DYNAMIC_IMPORT,
      REQUIRE_CALL,
    ]) {
      for (const match of code.matchAll(pattern)) {
        specifiers.add(match[1])
      }
    }
    const callSites = [...code.matchAll(IMPORT_CALL_SITE)].length
    const literalCalls = [...code.matchAll(DYNAMIC_IMPORT)].length
    const literalRequires = [...code.matchAll(REQUIRE_CALL)].length
    if (callSites > literalCalls + literalRequires) {
      nonLiteral = true
    }
  }
  if (nonLiteral) {
    specifiers.add(NON_LITERAL_SPECIFIER)
  }
  return [...specifiers].sort()
}

/**
 * Normalize a repo- or ui-relative POSIX path (drops a leading "./").
 * @param {string | undefined} value
 * @returns {string}
 */
function normalizeRel(value) {
  return path.posix.normalize(String(value))
}

/**
 * @param {(candidate: string) => boolean} exists file-only existence check
 * @param {string} base absolute path without extension
 * @returns {string | null}
 */
function resolveFile(exists, base) {
  const candidates = [
    base,
    ...RESOLVE_EXTENSIONS.map((extension) => base + extension),
    ...INDEX_FILES.map((name) => path.join(base, name)),
  ]
  return candidates.find((candidate) => exists(candidate)) ?? null
}

/**
 * Find the exports entry for a subpath: exact key first, else the longest "*" pattern.
 * @param {Record<string, unknown>} packageExports
 * @param {string} subpath e.g. "." or "./atoms/button"
 * @returns {{ value: unknown, star?: string } | undefined}
 */
function matchExport(packageExports, subpath) {
  if (Object.hasOwn(packageExports, subpath)) {
    return { value: packageExports[subpath] }
  }
  let best
  for (const key of Object.keys(packageExports)) {
    const star = key.indexOf("*")
    if (star === -1 || key.indexOf("*", star + 1) !== -1) {
      continue
    }
    const prefix = key.slice(0, star)
    const suffix = key.slice(star + 1)
    const fits =
      subpath.length >= prefix.length + suffix.length &&
      subpath.startsWith(prefix) &&
      subpath.endsWith(suffix)
    if (fits && (!best || prefix.length > best.prefix.length)) {
      best = {
        prefix,
        value: packageExports[key],
        star: subpath.slice(prefix.length, subpath.length - suffix.length),
      }
    }
  }
  return best && { value: best.value, star: best.star }
}

/**
 * Pick the first usable target condition: default, then import, then style.
 * @param {unknown} value
 * @returns {string | undefined}
 */
function pickTarget(value) {
  if (typeof value === "string") {
    return value
  }
  if (value && typeof value === "object") {
    for (const condition of ["default", "import", "style"]) {
      if (typeof value[condition] === "string") {
        return value[condition]
      }
    }
  }
}

/**
 * Resolve a self-package specifier through the package "exports" map.
 * @param {{ uiRoot: string, packageExports: Record<string, unknown>, exists: (p: string) => boolean }} options
 * @param {string} specifier
 * @returns {string | null}
 */
function resolveSelfExport({ uiRoot, packageExports, exists }, specifier) {
  const subpath =
    specifier === SELF_PACKAGE
      ? "."
      : `./${specifier.slice(SELF_PACKAGE.length + 1)}`
  const found = matchExport(packageExports, subpath)
  const target = found && pickTarget(found.value)
  if (!target) {
    return null
  }
  let resolved =
    found.star === undefined ? target : target.replaceAll("*", found.star)
  if (DIST_JS_PATTERN.test(resolved)) {
    resolved = `./src/${resolved.slice("./dist/".length, -".js".length)}`
  }
  return resolveFile(exists, path.resolve(uiRoot, resolved))
}

/**
 * Build a resolver for internal specifiers.
 * @param {{ uiRoot: string, packageExports?: Record<string, unknown>, exists: (p: string) => boolean }} options
 * @returns {(fromFileAbs: string, specifier: string) => string | null | undefined}
 *   absolute path; null when internal but unresolvable; undefined when external
 */
export function createResolver({ uiRoot, packageExports = {}, exists }) {
  return (fromFileAbs, specifier) => {
    if (specifier === NON_LITERAL_SPECIFIER) {
      return null
    }
    if (specifier.startsWith("./") || specifier.startsWith("../")) {
      return resolveFile(
        exists,
        path.resolve(path.dirname(fromFileAbs), specifier)
      )
    }
    if (specifier.startsWith("@/")) {
      return resolveFile(exists, path.join(uiRoot, "src", specifier.slice(2)))
    }
    if (
      specifier === SELF_PACKAGE ||
      specifier.startsWith(`${SELF_PACKAGE}/`)
    ) {
      return resolveSelfExport({ uiRoot, packageExports, exists }, specifier)
    }
  }
}

/**
 * @param {string} absPath
 * @param {string} repoRoot
 * @returns {string} repo-relative POSIX path
 */
function toRepoRel(repoRoot, absPath) {
  return path.relative(repoRoot, absPath).split(path.sep).join("/")
}

/**
 * Compute the transitive import closure of each story file.
 * Closures hold repo-relative paths and include the story file itself. Non-source
 * files (css, json, ...) are leaves and are not parsed.
 * @param {{
 *   uiRoot: string,
 *   storyFiles: string[],
 *   readFile: (absPath: string) => string,
 *   exists: (absPath: string) => boolean,
 *   packageExports?: Record<string, unknown>,
 * }} options storyFiles are relative to uiRoot
 * @returns {{ closures: Map<string, Set<string>>, unresolved: string[] }}
 */
export function buildStoryClosures({
  uiRoot,
  storyFiles,
  readFile,
  exists,
  packageExports,
}) {
  const repoRoot = path.resolve(uiRoot, "../..")
  const resolve = createResolver({ uiRoot, packageExports, exists })
  const closures = new Map()
  const unresolved = new Set()
  for (const storyFile of storyFiles) {
    const key = normalizeRel(storyFile)
    const start = path.resolve(uiRoot, key)
    if (!exists(start)) {
      unresolved.add(`${key} (story file missing)`)
      continue
    }
    const seen = walkClosure(start, { resolve, readFile, repoRoot, unresolved })
    closures.set(key, new Set([...seen].map((abs) => toRepoRel(repoRoot, abs))))
  }
  return { closures, unresolved: [...unresolved].sort() }
}

/**
 * Depth-first walk of internal imports from one story file.
 * @param {string} start absolute story file path
 * @param {{
 *   resolve: ReturnType<typeof createResolver>,
 *   readFile: (absPath: string) => string,
 *   repoRoot: string,
 *   unresolved: Set<string>,
 * }} deps unresolved receives "file imports specifier" entries
 * @returns {Set<string>} absolute paths, including start and leaves
 */
function walkClosure(start, { resolve, readFile, repoRoot, unresolved }) {
  const seen = new Set([start])
  const queue = [start]
  while (queue.length > 0) {
    const file = queue.pop()
    if (!SOURCE_EXTENSIONS.has(path.extname(file))) {
      continue
    }
    for (const specifier of collectImportSpecifiers(readFile(file))) {
      const resolved = resolve(file, specifier)
      if (resolved === null) {
        unresolved.add(`${toRepoRel(repoRoot, file)} imports "${specifier}"`)
      } else if (resolved && !seen.has(resolved)) {
        seen.add(resolved)
        queue.push(resolved)
      }
    }
  }
  return seen
}

/**
 * @param {string} reason
 * @returns {Selection}
 */
function allSelection(reason) {
  return { mode: "all", storyIds: [], reason }
}

/**
 * @param {IndexEntry[] | Record<string, IndexEntry>} entries
 * @param {Map<string, Set<string>>} closures
 * @returns {Context}
 */
function buildContext(entries, closures) {
  const visual = visualStories(entries)
  const storyIdsByKey = new Map()
  for (const entry of visual) {
    const key = normalizeRel(entry.importPath)
    storyIdsByKey.set(key, [...(storyIdsByKey.get(key) ?? []), entry.id])
  }
  const storyKeysByFile = new Map()
  for (const [key, files] of closures) {
    for (const file of files) {
      const keys = storyKeysByFile.get(file) ?? new Set()
      keys.add(key)
      storyKeysByFile.set(file, keys)
    }
  }
  const missing = [...storyIdsByKey.keys()].find((key) => !closures.has(key))
  return { visual, storyIdsByKey, storyKeysByFile, missing }
}

/**
 * Longest visual story id such that the snapshot name equals it or starts with "id-".
 * @param {string} name snapshot file name without ".png"
 * @param {IndexEntry[]} visual
 * @returns {string[]}
 */
function longestSnapshotStory(name, visual) {
  let best
  for (const { id } of visual) {
    const matches = name === id || name.startsWith(`${id}-`)
    if (matches && (!best || id.length > best.length)) {
      best = id
    }
  }
  return best ? [best] : []
}

/**
 * Files under libs/ui that cannot change any screenshot.
 * @param {string} file
 * @returns {boolean}
 */
function isIgnoredUiFile(file) {
  return isIgnoredByName(path.posix.basename(file)) || isIgnoredByLocation(file)
}

/**
 * @param {string} base file name
 * @returns {boolean}
 */
function isIgnoredByName(base) {
  return IGNORED_NAME_PATTERNS.some((pattern) => pattern.test(base))
}

/**
 * @param {string} file repo-relative POSIX path under libs/ui
 * @returns {boolean}
 */
function isIgnoredByLocation(file) {
  if (IGNORED_UI_DIRS.some((prefix) => file.startsWith(prefix))) {
    return true
  }
  if (path.posix.dirname(file) === "libs/ui/test" && UI_TEST_SPEC.test(file)) {
    return !file.endsWith("/visual.spec.ts")
  }
  return IGNORED_UI_FILES.has(file)
}

/**
 * @param {string} file
 * @param {Context} context
 * @returns {Verdict}
 */
function classifyOutsideUi(file, context) {
  if (context.storyKeysByFile.has(file)) {
    return { all: "rule 2: imported by a visual story from outside libs/ui" }
  }
  if (
    ROOT_DEPENDENCY_FILES.has(path.posix.basename(file)) ||
    ROOT_BUILD_CONFIG_FILES.has(file) ||
    file.startsWith(PATCHES_PREFIX) ||
    file.startsWith(DOCKER_PLAYWRIGHT_PREFIX)
  ) {
    return {
      all: "rule 2: shared dependency, patch, build config or Playwright image input",
    }
  }
  return { storyIds: [] }
}

/**
 * @param {string} file repo-relative POSIX path
 * @param {Context} context
 * @returns {Verdict}
 */
function classifyChangedFile(file, context) {
  const snapshot = SNAPSHOT_PATTERN.exec(file)
  if (snapshot) {
    return { storyIds: longestSnapshotStory(snapshot[1], context.visual) }
  }
  if (!file.startsWith(UI_PREFIX)) {
    return classifyOutsideUi(file, context)
  }
  if (isIgnoredUiFile(file)) {
    return { storyIds: [] }
  }
  const keys = context.storyKeysByFile.get(file)
  if (keys && SOURCE_ROOTS.some((root) => file.startsWith(root))) {
    return {
      storyIds: [...keys].flatMap(
        (key) => context.storyIdsByKey.get(key) ?? []
      ),
    }
  }
  return {
    all: `rule 5: ${file} is not in any visual story's import closure`,
  }
}

/**
 * Pure selection: classify changed files against story closures and index entries.
 * @param {{
 *   changedFiles: string[],
 *   entries: IndexEntry[] | Record<string, IndexEntry>,
 *   closures: Map<string, Set<string>>,
 *   unresolved?: string[],
 * }} options
 * @returns {Selection}
 */
export function selectAffectedStories({
  changedFiles,
  entries,
  closures,
  unresolved = [],
}) {
  if (unresolved.length > 0) {
    const shown = unresolved.slice(0, MAX_REASON_ITEMS).join("; ")
    return allSelection(
      `unresolved internal imports (${unresolved.length}): ${shown}`
    )
  }
  const context = buildContext(entries, closures)
  if (context.missing) {
    return allSelection(`no import closure for story file ${context.missing}`)
  }
  const files = [...new Set(changedFiles.map(normalizeRel))].sort()
  const storyIds = new Set()
  for (const file of files) {
    const verdict = classifyChangedFile(file, context)
    if (verdict.all) {
      return allSelection(`${file}: ${verdict.all}`)
    }
    for (const id of verdict.storyIds ?? []) {
      storyIds.add(id)
    }
  }
  const sorted = [...storyIds].sort()
  if (sorted.length === 0) {
    return {
      mode: "none",
      storyIds: [],
      reason: "no changed file can affect a visual story",
    }
  }
  return {
    mode: "subset",
    storyIds: sorted,
    reason: `${files.length} changed file(s) affect ${sorted.length} visual stories`,
  }
}

/**
 * @param {string} absPath
 * @returns {boolean}
 */
function isFile(absPath) {
  try {
    return fs.statSync(absPath).isFile()
  } catch {
    return false
  }
}

/**
 * Selection using the built Storybook index and the real source tree.
 * @param {{ repoRoot: string, changedFiles: string[], storybookDir?: string }} options
 *   storybookDir defaults to libs/ui/storybook-static; it must match the runner's build dir
 * @returns {Selection}
 */
export function affectedStoriesFromDisk({
  repoRoot,
  changedFiles,
  storybookDir,
}) {
  const uiRoot = path.join(repoRoot, "libs/ui")
  const indexPath = path.join(
    storybookDir ?? path.join(uiRoot, "storybook-static"),
    "index.json"
  )
  if (!isFile(indexPath)) {
    throw new Error("Storybook index.json not found. Build Storybook first.")
  }
  const index = JSON.parse(fs.readFileSync(indexPath, "utf8"))
  const entries = index.entries ?? index
  const pkg = JSON.parse(
    fs.readFileSync(path.join(uiRoot, "package.json"), "utf8")
  )
  const storyFiles = [
    ...new Set(
      visualStories(entries).map((entry) => normalizeRel(entry.importPath))
    ),
  ]
  const { closures, unresolved } = buildStoryClosures({
    uiRoot,
    storyFiles,
    readFile: (absPath) => fs.readFileSync(absPath, "utf8"),
    exists: isFile,
    packageExports: pkg.exports ?? {},
  })
  return selectAffectedStories({ changedFiles, entries, closures, unresolved })
}

/**
 * Files changed since the merge-base with sinceRef: tracked edits (working tree
 * vs base, including deletions) plus untracked files.
 * @param {string} repoRoot
 * @param {string} sinceRef
 * @returns {string[]} sorted, unique, repo-relative
 */
export function gitChangedFiles(repoRoot, sinceRef) {
  const gitOutput = (args) =>
    execFileSync("git", args, {
      cwd: repoRoot,
      encoding: "utf8",
      maxBuffer: GIT_MAX_BUFFER,
    })
  const run = (args) => gitOutput(args).split("\n").filter(Boolean)
  // -z keeps names unquoted (non-ASCII or special characters).
  const runZ = (args) => gitOutput(args).split("\0").filter(Boolean)
  const base = run(["merge-base", sinceRef, "HEAD"])[0]
  const tracked = runZ(["diff", "-z", "--name-only", "--no-renames", base])
  const untracked = runZ(["ls-files", "-z", "--others", "--exclude-standard"])
  return [...new Set([...tracked, ...untracked])].sort()
}

/**
 * @param {string[]} argv
 * @returns {{ since?: string, files?: string[] }}
 */
export function parseCliArgs(argv) {
  const options = {}
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index]
    const value = argv[index + 1]
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for ${flag}`)
    }
    if (flag === "--since") {
      options.since = value
    } else if (flag === "--files") {
      options.files = value.split(",").filter(Boolean)
    } else {
      throw new Error(`Unknown option ${flag}`)
    }
  }
  if ((options.since === undefined) === (options.files === undefined)) {
    throw new Error(
      "Usage: visual-affected-stories.mjs --since <ref> | --files a,b,c"
    )
  }
  return options
}

/**
 * @param {string[]} argv
 */
function main(argv) {
  const repoRoot = path.resolve(import.meta.dirname, "../../..")
  const options = parseCliArgs(argv)
  const changedFiles = options.files ?? gitChangedFiles(repoRoot, options.since)
  const result = affectedStoriesFromDisk({ repoRoot, changedFiles })
  process.stdout.write(
    `${JSON.stringify({
      mode: result.mode,
      reason: result.reason,
      count: result.storyIds.length,
      storyIds: result.storyIds,
    })}\n`
  )
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

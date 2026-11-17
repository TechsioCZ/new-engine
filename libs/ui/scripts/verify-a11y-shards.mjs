#!/usr/bin/env node
/**
 * The accessibility shard contract. The planner splits the scan across shards, so
 * no single job can prove coverage any more. Three modes do it together:
 *
 *   --plan    decide which story suites one job must scan and write the theme's
 *             expected story set to expected-stories.json and write only this
 *             shard's entries to the served index.
 *   --record  write the story ids the job actually scanned to scanned.json, read
 *             from Jest's own result JSON, next to that shard's report.
 *   --expect  prove that every declared theme and shard reported, that the
 *             shards of a theme covered its expected set exactly once, and that
 *             calibration passed exactly once per contract story per theme.
 *
 * Usage:
 *   node scripts/verify-a11y-shards.mjs --plan --index <index.json> --out <dir>
 *     --theme <brand-mode> --shard <i/n> --theme-count <n>
 *     --scope full|changed [--changed-files <list>]
 *   node scripts/verify-a11y-shards.mjs --record --index <index.json> --out <dir>
 *     --theme <brand-mode> --shard <i/n> --jest-output <captured stdout>
 *   node scripts/verify-a11y-shards.mjs --expect <declared matrix> --reports <dir>
 *
 * The verify mode reads the matrix the plan job declared (its `a11y.themes` and
 * the per-theme `a11y.shards` counts) and the downloaded shard artifacts, so a theme or
 * shard that never ran fails the gate instead of passing as silence. It touches
 * nothing outside libs/ui and resolves nothing from node_modules, so it runs on
 * a bare checkout without an install.
 */
import fs from "node:fs"
import path from "node:path"
import { a11yBrand, calibrationIds } from "../.storybook/a11y-policy.mjs"
import { visualStories } from "../test/visual-completion.mjs"

/** Written next to every shard's report: the theme's story set, and the stories
 * that shard scanned. The plan job's own expected.json declares the matrix, so
 * these carry distinct names. */
const EXPECTED_NAME = "expected-stories.json"
const SCANNED_NAME = "scanned.json"
const CALIBRATION_NAME = "calibration.ndjson"
const SHARD_FORMAT = /^([1-9][0-9]*)\/([1-9][0-9]*)$/
const SUITE_SEPARATOR = "--"
const NEWLINE = /\r?\n/
/** Statuses that mean Jest ran the story; anything else left it unscanned. */
const EXECUTED = new Set(["passed", "failed"])
const EXAMPLE_COUNT = 5
const KEY_SEPARATOR = "\u0000"

/**
 * @param {string[]} values
 * @returns {string}
 */
function examples(values) {
  const shown = values.slice(0, EXAMPLE_COUNT).join(", ")
  return values.length > EXAMPLE_COUNT ? `${shown}, ...` : shown
}

/**
 * @param {string[]} argv
 * @param {string} name
 * @returns {string | undefined}
 */
function readArg(argv, name) {
  const inline = argv.find((arg) => arg.startsWith(`${name}=`))
  if (inline) {
    return inline.slice(name.length + 1)
  }
  const at = argv.indexOf(name)
  if (at === -1) {
    return
  }
  const value = argv[at + 1]
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`Missing value for ${name}`)
  }
  return value
}

/**
 * @param {string[]} argv
 * @param {string} name
 * @returns {string}
 */
function requireArg(argv, name) {
  const value = readArg(argv, name)
  if (!value) {
    throw new Error(`Missing required option ${name}`)
  }
  return value
}

/** @param {string} file */
function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"))
}

/**
 * @param {string} file
 * @param {unknown} value
 */
function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`)
}

/**
 * @param {string} value
 * @returns {{index: number, total: number}}
 */
function parseShard(value) {
  const match = SHARD_FORMAT.exec(value)
  if (!match) {
    throw new Error(`Invalid shard "${value}"; use index/total`)
  }
  const index = Number(match[1])
  const total = Number(match[2])
  if (index > total) {
    throw new Error(`Shard index out of range: ${value}`)
  }
  return { index, total }
}

/** The test runner generates one Jest suite per story title, named after the
 * title id that every story id of that title carries as its prefix.
 * @param {string} id
 * @returns {string}
 */
function suiteOf(id) {
  const at = id.indexOf(SUITE_SEPARATOR)
  if (at < 1) {
    throw new Error(`Story id without a suite prefix: ${id}`)
  }
  return id.slice(0, at)
}

/** Stories the accessibility runner executes: every non-docs index entry. The
 * "visual-skip" tag drops a story from the screenshot matrix, not from this
 * scan, so the expected set is wider than the screenshot story set.
 * @param {object} index
 * @returns {{id: string, title: string, name: string, type: string}[]}
 */
function scannableStories(index) {
  return Object.values(index.entries ?? index).filter(
    (entry) => entry.type === "story"
  )
}

/**
 * @param {object} index
 * @returns {Map<string, string[]>} suite id to its story ids
 */
function suiteStories(index) {
  const suites = new Map()
  for (const entry of scannableStories(index)) {
    const suite = suiteOf(entry.id)
    const ids = suites.get(suite) ?? []
    ids.push(entry.id)
    suites.set(suite, ids)
  }
  return suites
}

/**
 * @param {object} index
 * @returns {Map<string, string>} "title\0name" to story id
 */
function storyIdsByName(index) {
  const ids = new Map()
  for (const entry of scannableStories(index)) {
    const key = `${entry.title}${KEY_SEPARATOR}${entry.name}`
    if (ids.has(key)) {
      throw new Error(
        `Two stories share a title and name: ${entry.title} / ${entry.name}`
      )
    }
    ids.set(key, entry.id)
  }
  return ids
}

/** Suites the changed files can reach, plus calibration, which stays in every
 * run so the reporter's contract keeps its full strength. The classifier is
 * conservative: "all" means scan everything.
 * @param {string} indexFile
 * @param {string | undefined} changedFiles
 * @returns {Promise<{suites: Set<string> | undefined, reason: string}>}
 */
async function changedSuites(indexFile, changedFiles) {
  if (!changedFiles) {
    throw new Error("A narrowed scan needs --changed-files")
  }
  const { affectedStoriesFromDisk, readPathList } = await import(
    "./visual-affected-stories.mjs"
  )
  const selection = affectedStoriesFromDisk({
    repoRoot: path.resolve(import.meta.dirname, "../../.."),
    changedFiles: readPathList(changedFiles),
    // The plan reads a per-run copy (index-full.json), not <storybook>/index.json.
    indexPath: indexFile,
  })
  const reason = `${selection.mode}: ${selection.reason}`
  if (selection.mode === "all") {
    return { suites: undefined, reason }
  }
  return {
    suites: new Set([...selection.storyIds, ...calibrationIds].map(suiteOf)),
    reason,
  }
}

/** The index this shard is given to scan: the same index with every entry that
 * belongs to another shard removed.
 *
 * This, and not a Jest path pattern, is how a shard is narrowed. The runner
 * generates one suite per index entry it is served, so filtering the index
 * makes the shard boundary data rather than a regex. A pattern cannot be used:
 * test-storybook assembles its jest command into a string and runs it through
 * /bin/sh, so "(^|/)(?:atoms-badge|...)" dies with `Syntax error: "("
 * unexpected` (measured on run 43889315897), and every alternation needs
 * characters the shell would eat.
 * @param {object} index
 * @param {string[]} storyIds
 * @returns {object}
 */
function shardIndex(index, storyIds) {
  const mine = new Set(storyIds)
  const entries = Object.fromEntries(
    Object.entries(index.entries ?? index).filter(([, entry]) =>
      mine.has(entry.id)
    )
  )
  return index.entries ? { ...index, entries } : entries
}

/** Deterministic, balanced assignment of suites to shards.
 *
 * Jest's own --shard cannot do this job here. It sorts the suites by a SHA-1 of
 * each test path taken relative to rootDir, and the test runner generates the
 * index-json suites into a fresh mkdtemp directory on every invocation, so each
 * shard hashes a different set of paths. Measured on run 43882857373: three
 * shards of business-light each took 38 of 114 suites, but 21 stories ran in
 * two shards while others ran in none. Planning the split from the Storybook
 * index makes it a property of the index rather than of a temp directory, so
 * the shards agree by construction.
 *
 * Longest-first assignment to the lightest shard keeps the story counts close;
 * ties break on the suite name so every shard computes the same partition.
 * @param {string[]} selected
 * @param {Map<string, string[]>} suites suite name to its story ids
 * @param {number} total
 * @returns {string[][]}
 */
function partitionSuites(selected, suites, total) {
  const sizeOf = (suite) => (suites.get(suite) ?? []).length
  const buckets = Array.from({ length: total }, () => ({
    names: [],
    stories: 0,
  }))
  const ordered = [...selected].sort((a, b) => {
    const bySize = sizeOf(b) - sizeOf(a)
    if (bySize !== 0) {
      return bySize
    }
    return a < b ? -1 : a > b ? 1 : 0
  })
  for (const name of ordered) {
    let target = buckets[0]
    for (const bucket of buckets) {
      if (bucket.stories < target.stories) {
        target = bucket
      }
    }
    target.names.push(name)
    target.stories += sizeOf(name)
  }
  return buckets.map((bucket) =>
    bucket.names.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
  )
}

/** A full scan must still cover every story the screenshot matrix owns.
 * @param {object} index
 * @param {Set<string>} storyIds
 */
function assertCoversVisualStories(index, storyIds, theme) {
  const missing = visualStories(index.entries ?? index)
    .filter((entry) => belongsToTheme(entry, theme))
    .map((entry) => entry.id)
    .filter((id) => !storyIds.has(id))
  if (missing.length > 0) {
    throw new Error(
      `A full scan would skip ${missing.length} visual stories: ${examples(missing)}`
    )
  }
}

/** @param {{tags?: string[]}} entry @param {string} theme */
function belongsToTheme(entry, theme) {
  const brand = a11yBrand(entry.tags ?? [])
  return brand === undefined || theme.startsWith(`${brand}-`)
}

/** @param {string[]} argv */
async function planShard(argv) {
  const indexFile = requireArg(argv, "--index")
  const out = requireArg(argv, "--out")
  const theme = requireArg(argv, "--theme")
  const shard = parseShard(requireArg(argv, "--shard"))
  const themeCount = Number(requireArg(argv, "--theme-count"))
  const scope = requireArg(argv, "--scope")
  if (!(Number.isInteger(themeCount) && themeCount > 0)) {
    throw new Error(`Invalid --theme-count: ${themeCount}`)
  }
  const index = readJson(indexFile)
  const allSuites = suiteStories(index)
  const themedIndex = {
    ...index,
    entries: Object.fromEntries(Object.entries(index.entries ?? index).filter(
      ([, entry]) => belongsToTheme(entry, theme)
    )),
  }
  const suites = suiteStories(themedIndex)
  if (suites.size === 0) {
    throw new Error(`No stories in the Storybook index ${indexFile}`)
  }
  const selection =
    scope === "full"
      ? { suites: undefined, reason: "every supported story" }
      : await changedSuites(indexFile, readArg(argv, "--changed-files"))
  const requested = [...(selection.suites ?? allSuites.keys())]
  const unknown = requested.filter((suite) => !allSuites.has(suite))
  if (unknown.length > 0) {
    throw new Error(
      `No Storybook suite for ${unknown.length} selected id(s): ${examples(unknown)}`
    )
  }
  const selected = requested.filter((suite) => suites.has(suite)).sort()
  const themeStoryIds = selected
    .flatMap((suite) => suites.get(suite) ?? [])
    .sort()
  if (!selection.suites) {
    assertCoversVisualStories(index, new Set(themeStoryIds), theme)
  }
  // This shard's own share of the theme, decided here rather than by Jest.
  const mine = partitionSuites(selected, suites, shard.total)[shard.index - 1]
  const storyIds = mine.flatMap((suite) => suites.get(suite) ?? []).sort()
  fs.mkdirSync(out, { recursive: true })
  writeJson(path.join(out, EXPECTED_NAME), {
    theme,
    themeCount,
    shard: `${shard.index}/${shard.total}`,
    shards: shard.total,
    scope: selection.suites ? "subset" : "full",
    reason: selection.reason,
    suites: mine,
    storyIds,
    themeSuites: selected,
    themeStoryIds,
  })
  // The runner is served this index, so it generates exactly these suites.
  writeJson(requireArg(argv, "--write-index"), shardIndex(index, storyIds))
  process.stderr.write(
    `A11y plan ${theme} shard ${shard.index}/${shard.total}: ${mine.length} of ${selected.length} suites, ${storyIds.length} of ${themeStoryIds.length} stories (${selection.reason})\n`
  )
}

/**
 * @param {string} line
 * @returns {any}
 */
function parseJsonLine(line) {
  if (!line.startsWith("{")) {
    return
  }
  try {
    return JSON.parse(line)
  } catch {}
}

/** Under --json Jest writes its result JSON as the last line of stdout and
 * leaves every human message on stderr; the runner's own banner shares the
 * stream, so take the last line that parses into a result object.
 * @param {string} file
 */
function readJestResults(file) {
  const lines = fs
    .readFileSync(file, "utf8")
    .split(NEWLINE)
    .filter((line) => line.trim().length > 0)
  for (const line of [...lines].reverse()) {
    const parsed = parseJsonLine(line)
    if (parsed && Array.isArray(parsed.testResults)) {
      return parsed
    }
  }
  throw new Error(
    `No Jest result JSON in ${file} (${lines.length} non-empty lines)`
  )
}

/** @param {string[]} argv */
function recordShard(argv) {
  const indexFile = requireArg(argv, "--index")
  const out = requireArg(argv, "--out")
  const theme = requireArg(argv, "--theme")
  const shard = requireArg(argv, "--shard")
  const parsedShard = parseShard(shard)
  const results = readJestResults(requireArg(argv, "--jest-output"))
  const expected = readJson(path.join(out, EXPECTED_NAME))
  if (expected.theme !== theme) {
    throw new Error(`Planned theme ${expected.theme}, recorded ${theme}`)
  }
  if (expected.shard !== shard) {
    throw new Error(`Planned shard ${expected.shard}, recorded ${shard}`)
  }
  const ids = storyIdsByName(readJson(indexFile))
  const scanned = new Set()
  const unmatched = []
  const skipped = []
  for (const suite of results.testResults ?? []) {
    for (const test of suite.assertionResults ?? []) {
      const titles = test.ancestorTitles ?? []
      const label = test.fullName ?? titles.join(" / ")
      if (!EXECUTED.has(test.status)) {
        skipped.push(label)
        continue
      }
      const id = ids.get(`${titles[0]}${KEY_SEPARATOR}${titles[1]}`)
      if (id) {
        scanned.add(id)
      } else {
        unmatched.push(label)
      }
    }
  }
  if (unmatched.length > 0) {
    throw new Error(
      `Jest ran ${unmatched.length} test(s) that match no story in the Storybook index: ${examples(unmatched)}`
    )
  }
  // Planned against scanned, not scope against zero: a shard that owns suites
  // and scanned nothing is the failure, and an empty shard is legitimate only
  // when the plan gave it no suite.
  const planned = expected.storyIds ?? []
  if (planned.length > 0 && scanned.size === 0) {
    throw new Error(
      `The accessibility scan of ${theme} shard ${shard} ran none of its ${planned.length} planned stories`
    )
  }
  const storyIds = [...scanned].sort()
  // Also enforce the contract here: workflow_dispatch has no parent
  // quality-gate to discover a missing story or calibration result.
  assertShardsRanTheirPlan(
    { ...expected, byShard: new Map([[parsedShard.index, planned]]) },
    new Map([[parsedShard.index, { scanned: { storyIds } }]])
  )
  assertCalibrationCoverage(
    expected,
    [{ dir: out }],
    planned.filter((id) => calibrationIds.includes(id))
  )
  assertScanEvidence(out, planned)
  writeJson(path.join(out, SCANNED_NAME), {
    theme,
    shard,
    scope: expected.scope,
    suites: [...new Set(storyIds.map(suiteOf))].sort(),
    skipped,
    storyIds,
  })
  process.stderr.write(
    `A11y shard ${shard} of ${theme} scanned ${storyIds.length} stories (${skipped.length} skipped)\n`
  )
}

/** A passing render is not proof that its contrast scan ran.
 * @param {string} directory
 * @param {string[]} planned
 */
function assertScanEvidence(directory, planned) {
  const file = path.join(directory, "report.ndjson")
  const expected = new Set(planned.filter((id) => !calibrationIds.includes(id)))
  const seen = new Set()
  const lines = fs.existsSync(file) ? fs.readFileSync(file, "utf8").split("\n") : []
  for (const line of lines.filter(Boolean)) {
    const entry = JSON.parse(line)
    if (!expected.has(entry.storyId) || seen.has(entry.storyId)) {
      throw new Error(`Unexpected or repeated accessibility scan: ${entry.storyId}`)
    }
    if (!Array.isArray(entry.results?.violations)) {
      throw new Error(`Accessibility scan has no results: ${entry.storyId}`)
    }
    seen.add(entry.storyId)
  }
  const missing = [...expected].filter((id) => !seen.has(id))
  if (missing.length) {
    throw new Error(`No accessibility scan recorded for ${missing.length} planned stories: ${examples(missing)}`)
  }
}

/**
 * @param {string} directory
 * @param {string} name
 * @returns {string[]}
 */
function find(directory, name) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      return find(full, name)
    }
    return entry.name === name ? [full] : []
  })
}

/**
 * @param {string} target
 * @param {string} name
 * @returns {string[]}
 */
function collect(target, name) {
  if (!fs.existsSync(target)) {
    throw new Error(`No such file or directory: ${target}`)
  }
  return fs.statSync(target).isFile() ? [target] : find(target, name)
}

/** One expected story set per theme, as every shard of that theme recorded it.
 * @param {string} target
 * @returns {Map<string, any>} theme to its expected story set
 */
function loadExpected(target) {
  const byTheme = new Map()
  for (const file of collect(target, EXPECTED_NAME)) {
    const expected = readJson(file)
    const themeStoryIds = expected.themeStoryIds ?? []
    if (!byTheme.has(expected.theme)) {
      byTheme.set(expected.theme, {
        theme: expected.theme,
        themeCount: expected.themeCount,
        shards: expected.shards,
        scope: expected.scope,
        reason: expected.reason,
        storyIds: themeStoryIds,
        byShard: new Map(),
      })
    }
    const entry = byTheme.get(expected.theme)
    // Each shard plans from its own Storybook build. Agreement on the theme's
    // whole story set is what proves they planned from the same index; their
    // own shares are expected to differ.
    const agrees =
      entry.shards === expected.shards &&
      entry.themeCount === expected.themeCount &&
      entry.scope === expected.scope &&
      JSON.stringify(entry.storyIds) === JSON.stringify(themeStoryIds)
    if (!agrees) {
      throw new Error(
        `Theme ${expected.theme} has two different expected story sets; its shards were built from different Storybook indexes`
      )
    }
    const parsed = parseShard(expected.shard)
    if (entry.byShard.has(parsed.index)) {
      throw new Error(
        `Theme ${expected.theme}: shard ${parsed.index} planned twice`
      )
    }
    entry.byShard.set(parsed.index, expected.storyIds ?? [])
  }
  return byTheme
}

/**
 * @param {string} target
 * @returns {Map<string, {dir: string, scanned: any}[]>} theme to its shards
 */
function loadScanned(target) {
  const byTheme = new Map()
  for (const file of collect(target, SCANNED_NAME)) {
    const scanned = readJson(file)
    const shards = byTheme.get(scanned.theme) ?? []
    shards.push({ dir: path.dirname(file), scanned })
    byTheme.set(scanned.theme, shards)
  }
  return byTheme
}

/**
 * @param {string} dir
 * @returns {{storyId: string, brand: string, mode: string, status: string}[]}
 */
function calibrationEntries(dir) {
  const file = path.join(dir, CALIBRATION_NAME)
  if (!fs.existsSync(file)) {
    return []
  }
  return fs
    .readFileSync(file, "utf8")
    .split(NEWLINE)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line))
}

/** Every declared shard reported exactly once.
 * @param {any} expected
 * @param {{dir: string, scanned: any}[]} shards
 * @returns {Map<number, {dir: string, scanned: any}>}
 */
function indexShards(expected, shards) {
  const byIndex = new Map()
  for (const shard of shards) {
    const parsed = parseShard(shard.scanned.shard)
    if (parsed.total !== expected.shards) {
      throw new Error(
        `${expected.theme}: shard ${shard.scanned.shard} is not part of a run of ${expected.shards} shards`
      )
    }
    if (byIndex.has(parsed.index)) {
      throw new Error(`${expected.theme}: shard ${parsed.index} reported twice`)
    }
    byIndex.set(parsed.index, shard)
  }
  for (let index = 1; index <= expected.shards; index += 1) {
    if (!byIndex.has(index)) {
      throw new Error(
        `${expected.theme}: shard ${index} of ${expected.shards} never reported`
      )
    }
  }
  return byIndex
}

/** Disjoint shards whose union is the expected story set.
 * @param {any} expected
 * @param {Map<number, {dir: string, scanned: any}>} byIndex
 */
function assertCoverage(expected, byIndex) {
  const owner = new Map()
  for (const [index, shard] of byIndex) {
    for (const id of shard.scanned.storyIds ?? []) {
      const previous = owner.get(id)
      if (previous !== undefined) {
        throw new Error(
          `${expected.theme}: ${id} was scanned by shard ${previous} and shard ${index}`
        )
      }
      owner.set(id, index)
    }
  }
  const expectedIds = new Set(expected.storyIds)
  const missing = expected.storyIds.filter((id) => !owner.has(id))
  if (missing.length > 0) {
    throw new Error(
      `${expected.theme}: ${missing.length} expected stories were never scanned: ${examples(missing)}`
    )
  }
  const extra = [...owner.keys()].filter((id) => !expectedIds.has(id))
  if (extra.length > 0) {
    throw new Error(
      `${expected.theme}: ${extra.length} scanned stories are not in the expected set: ${examples(extra)}`
    )
  }
}

/** Every shard scanned exactly the stories planned for it. Together with the
 * coverage assertion below this is what makes a drifting partition a failure:
 * a shard that silently ran someone else's suites fails here even when the
 * theme's union still happens to add up.
 * @param {any} expected
 * @param {Map<number, {dir: string, scanned: any}>} byIndex
 */
function assertShardsRanTheirPlan(expected, byIndex) {
  for (const [index, shard] of byIndex) {
    const planned = expected.byShard.get(index)
    if (!planned) {
      throw new Error(
        `${expected.theme}: shard ${index} reported without a plan`
      )
    }
    const plannedIds = new Set(planned)
    const scanned = new Set(shard.scanned.storyIds ?? [])
    const missing = planned.filter((id) => !scanned.has(id))
    if (missing.length > 0) {
      throw new Error(
        `${expected.theme} shard ${index}: ${missing.length} planned stories were never scanned: ${examples(missing)}`
      )
    }
    const extra = [...scanned].filter((id) => !plannedIds.has(id))
    if (extra.length > 0) {
      throw new Error(
        `${expected.theme} shard ${index}: scanned ${extra.length} stories it was not planned to run: ${examples(extra)}`
      )
    }
  }
}

/** The calibration contract, aggregated: the plan hands the calibration suite
 * to exactly one shard, so only the theme as a whole can assert it.
 * @param {any} expected
 * @param {{dir: string}[]} shards
 * @param {string[]} [requiredIds]
 */
function assertCalibrationCoverage(
  expected,
  shards,
  requiredIds = calibrationIds
) {
  const passes = new Map()
  for (const { dir } of shards) {
    for (const entry of calibrationEntries(dir)) {
      if (`${entry.brand}-${entry.mode}` !== expected.theme) {
        throw new Error(
          `${expected.theme}: calibration ${entry.storyId} was reported for ${entry.brand}-${entry.mode}`
        )
      }
      if (!calibrationIds.includes(entry.storyId)) {
        throw new Error(
          `${expected.theme}: unknown calibration story ${entry.storyId}`
        )
      }
      if (entry.status !== "passed") {
        throw new Error(
          `${expected.theme}: calibration ${entry.storyId} reported ${entry.status}`
        )
      }
      passes.set(entry.storyId, (passes.get(entry.storyId) ?? 0) + 1)
    }
  }
  for (const id of requiredIds) {
    const count = passes.get(id) ?? 0
    if (count !== 1) {
      throw new Error(
        `${expected.theme}: calibration ${id} passed ${count} time(s), expected exactly 1`
      )
    }
  }
}

/**
 * @param {any} expected
 * @param {{dir: string, scanned: any}[]} shards
 */
function verifyTheme(expected, shards) {
  const byIndex = indexShards(expected, shards)
  assertShardsRanTheirPlan(expected, byIndex)
  assertCoverage(expected, byIndex)
  assertCalibrationCoverage(expected, shards)
  for (const [index, { dir }] of byIndex) {
    assertScanEvidence(dir, expected.byShard.get(index))
  }
  process.stdout.write(
    `Verified ${expected.theme}: ${expected.shards} shards, ${expected.storyIds.length} stories scanned exactly once (${expected.scope} scope), ${calibrationIds.length} calibration stories passed\n`
  )
}

/** The matrix the plan job declared, which is what makes a theme or shard that
 * never ran a failure rather than silence. Each theme declares its own shard
 * count, so a long theme can be split while the others run whole.
 * @param {any} plan
 * @returns {{themes: string[], shards: Map<string, number>, total: number}}
 */
function declaredMatrix(plan) {
  const declared = plan?.a11y
  if (!(declared && Array.isArray(declared.themes))) {
    throw new Error("The declared matrix has no a11y.themes list")
  }
  const themes = declared.themes
  const counts = declared.shards
  if (!(counts && typeof counts === "object" && !Array.isArray(counts))) {
    throw new Error("The declared matrix has no a11y.shards count per theme")
  }
  const keys = Object.keys(counts).sort()
  if (JSON.stringify(keys) !== JSON.stringify([...themes].sort())) {
    throw new Error(
      `The declared a11y shard counts name ${keys.join(", ") || "no theme"}, the matrix declares ${themes.join(", ") || "no theme"}`
    )
  }
  const shards = new Map()
  for (const theme of themes) {
    const count = counts[theme]
    if (!(Number.isInteger(count) && count > 0)) {
      throw new Error(`Theme ${theme} declares an invalid shard count: ${count}`)
    }
    shards.set(theme, count)
  }
  const total = [...shards.values()].reduce((sum, count) => sum + count, 0)
  if (declared.total !== total) {
    throw new Error(
      `The declared a11y matrix is inconsistent: its theme shard counts add up to ${total}, not ${declared.total}`
    )
  }
  return { themes, shards, total }
}

/** @param {string[]} argv */
function verifyShards(argv) {
  const plan = readJson(requireArg(argv, "--expect"))
  const reports = requireArg(argv, "--reports")
  const declared = declaredMatrix(plan)
  const scannedByTheme = loadScanned(reports)
  if (declared.total === 0) {
    if (scannedByTheme.size > 0) {
      throw new Error(
        `The matrix declares no accessibility shard, but ${scannedByTheme.size} theme(s) reported`
      )
    }
    process.stdout.write("No accessibility shard was declared; none ran\n")
    return
  }
  const expectedByTheme = loadExpected(reports)
  for (const theme of scannedByTheme.keys()) {
    if (!declared.themes.includes(theme)) {
      throw new Error(`Shards reported theme ${theme}, which is not declared`)
    }
  }
  for (const theme of declared.themes) {
    const shards = scannedByTheme.get(theme)
    if (!shards) {
      throw new Error(`Theme ${theme} reported no shard`)
    }
    const expected = expectedByTheme.get(theme)
    if (!expected) {
      throw new Error(`Theme ${theme} reported no expected story set`)
    }
    if (expected.shards !== declared.shards.get(theme)) {
      throw new Error(
        `Theme ${theme} planned ${expected.shards} shards, the matrix declares ${declared.shards.get(theme)}`
      )
    }
    if (expected.themeCount !== declared.themes.length) {
      throw new Error(
        `Theme ${theme} planned for ${expected.themeCount} themes, the matrix declares ${declared.themes.length}`
      )
    }
    // A full gate that narrowed its own scan would still look green otherwise.
    if (
      (plan.scope === "full" || plan.scope === "all") &&
      expected.scope !== "full"
    ) {
      throw new Error(
        `Theme ${theme} narrowed a ${plan.scope} scan to its ${expected.scope} scope`
      )
    }
    verifyTheme(expected, shards)
  }
}

/** @param {string[]} argv */
async function main(argv) {
  if (argv.includes("--plan")) {
    await planShard(argv)
    return
  }
  if (argv.includes("--record")) {
    recordShard(argv)
    return
  }
  if (argv.includes("--expect")) {
    verifyShards(argv)
    return
  }
  throw new Error(
    "Usage: verify-a11y-shards.mjs --expect <declared matrix> --reports <directory>"
  )
}

if (import.meta.filename === path.resolve(process.argv[1] ?? "")) {
  await main(process.argv.slice(2))
}

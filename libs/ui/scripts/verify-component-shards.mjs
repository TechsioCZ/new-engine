// Asserts that the sharded CI component run covered every screenshot identity
// exactly once, that every shard the plan declared reported, and that every
// shard ran clean.
//   node scripts/verify-component-shards.mjs --expect <expected.json> --reports <dir>
// expected.json is the matrix the plan job declared and uploaded; `reports` is
// one folder per uploaded shard artifact, named ...-<group>-shard-<index>.
// A changed run (scope "ui") only asserts that every shard reported and ran
// clean. A shard with no changed stories leaves changed-none.json instead.
import fs from "node:fs"
import path from "node:path"
import {
  assertVisualCompletion,
  visualStories,
} from "../test/visual-completion.mjs"
import {
  createVisualMatrix,
  PLAYWRIGHT_GROUPS,
} from "../test/visual-projects.mjs"

const REPORT_NAME = "all.json"
const NONE_MARKER_NAME = "changed-none.json"
const USAGE =
  "Usage: verify-component-shards.mjs --expect <expected.json> --reports <directory>"
// One folder per uploaded shard artifact; its name carries group and index.
const SHARD_FOLDER = /-(?<group>[a-z]+)-shard-(?<shard>\d+)$/
// The plan's scope: a full release gate, the changed UI subset, or no work.
const SHARD_SCOPES = new Set(["full", "ui", "none"])

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

/** @param {string} file */
function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"))
}

/**
 * @typedef {object} ChangedShard
 * @property {string} name shard folder name
 * @property {object[]} reports parsed all.json files found under the folder
 * @property {object[]} markers parsed changed-none.json files found under the folder
 */

/**
 * Reads one shard folder per direct child of `root`.
 * @param {string} root
 * @returns {ChangedShard[]}
 */
export function loadChangedShards(root) {
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((entry) => {
      const folder = path.join(root, entry.name)
      return {
        name: entry.name,
        reports: find(folder, REPORT_NAME).map(readJson),
        markers: find(folder, NONE_MARKER_NAME).map(readJson),
      }
    })
}

/**
 * @param {string} name
 * @param {object} report
 */
function assertCleanReport(name, report) {
  const errors = report.errors?.length ?? 0
  assert(errors === 0, `Shard ${name} has ${errors} runner errors`)
  const unexpected = report.stats?.unexpected ?? 0
  assert(
    unexpected === 0,
    `Shard ${name} has ${unexpected} unexpected failures`
  )
  const flaky = report.stats?.flaky ?? 0
  assert(flaky === 0, `Shard ${name} has ${flaky} flaky tests`)
  forEachTest(report.suites, (test) => {
    assert(
      !test.annotations?.some((item) => item.type === "visual-canonical-retry"),
      `Shard ${name} recovered from a failed first render`
    )
  })
}

/**
 * @param {boolean} condition
 * @param {string} message
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

/**
 * A changed shard holds exactly one of: a clean all.json, or a none marker.
 * @param {ChangedShard} shard
 */
export function assertChangedShard({ name, reports, markers }) {
  const found = reports.length + markers.length
  assert(
    found === 1,
    `Shard ${name} must contain exactly one of ${REPORT_NAME} or ${NONE_MARKER_NAME}, found ${found}`
  )
  if (markers.length) {
    assert(
      markers[0].mode === "none",
      `Shard ${name} has a ${NONE_MARKER_NAME} with mode ${markers[0].mode}`
    )
    return
  }
  assertCleanReport(name, reports[0])
}

/**
 * Visits every test of a Playwright JSON report, including nested suites.
 * @param {object[] | undefined} suites
 * @param {(test: object) => void} visit
 */
function forEachTest(suites, visit) {
  for (const suite of suites ?? []) {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        visit(test)
      }
    }
    forEachTest(suite.suites, visit)
  }
}

/**
 * Counts what the changed shards actually ran, for the summary line.
 * @param {ChangedShard[]} shards
 * @returns {{ shards: number, markers: number, tests: number, stories: number }}
 */
export function summarizeChangedShards(shards) {
  const stories = new Set()
  let tests = 0
  for (const shard of shards) {
    for (const report of shard.reports) {
      forEachTest(report.suites, (test) => {
        if (!test.results?.length) {
          return
        }
        tests += 1
        const id = test.annotations?.find(
          (item) => item.type === "visual-story-id"
        )?.description
        if (id) {
          stories.add(id)
        }
      })
    }
  }
  return {
    shards: shards.length,
    markers: shards.filter((shard) => shard.markers.length > 0).length,
    tests,
    stories: stories.size,
  }
}

/**
 * @param {string} root
 * @param {number} expectedShards 0 disables the count check
 */
function verifyChangedShards(root, expectedShards) {
  const shards = loadChangedShards(root)
  assert(shards.length > 0, `No shard folders found under ${root}`)
  if (expectedShards) {
    assert(
      shards.length === expectedShards,
      `Expected ${expectedShards} shard folders, found ${shards.length}`
    )
  }
  for (const shard of shards) {
    assertChangedShard(shard)
  }
  const summary = summarizeChangedShards(shards)
  console.log(
    `Verified ${summary.shards} changed shards (${summary.markers} with no changed stories): ${summary.tests} tests run, ${summary.stories} stories covered`
  )
}

/**
 * @param {string} root
 * @param {number} expectedShards 0 disables the count check
 */
function verifyFullShards(root, expectedShards) {
  const reportFiles = find(root, REPORT_NAME)
  const indexFiles = find(root, "index.json")
  if (expectedShards && reportFiles.length !== expectedShards) {
    throw new Error(
      `Expected ${expectedShards} shard reports, found ${reportFiles.length}`
    )
  }
  if (!(reportFiles.length && indexFiles.length)) {
    throw new Error(`No shard reports or Storybook index found under ${root}`)
  }
  const indexes = indexFiles.map((file) => fs.readFileSync(file, "utf8"))
  if (new Set(indexes).size !== 1) {
    throw new Error("Shards were built from different Storybook indexes")
  }
  const stories = visualStories(JSON.parse(indexes[0]).entries)
  assertVisualCompletion(
    reportFiles.map((file) => readJson(file)),
    stories,
    createVisualMatrix().map((project) => project.name)
  )
  console.log(
    `Verified ${reportFiles.length} shards: ${stories.length} stories × ${createVisualMatrix().length} visual projects`
  )
}

/**
 * The component matrix the plan job declared for this commit.
 * @param {string} file
 * @returns {{scope: string, groups: Record<string, number>, total: number}}
 */
export function readExpectedComponents(file) {
  const declared = JSON.parse(fs.readFileSync(file, "utf8"))
  const scope = declared.scope
  assert(
    SHARD_SCOPES.has(scope),
    `${file} declares scope "${scope}"; expected one of ${[...SHARD_SCOPES].join(", ")}`
  )
  const groups = declared.components?.groups ?? {}
  const total = declared.components?.total ?? 0
  let sum = 0
  for (const [group, count] of Object.entries(groups)) {
    assert(
      PLAYWRIGHT_GROUPS.includes(group),
      `${file} declares unknown component group "${group}"; expected one of ${PLAYWRIGHT_GROUPS.join(", ")}`
    )
    assert(
      Number.isInteger(count) && count > 0,
      `${file} declares ${count} shards for group ${group}`
    )
    sum += count
  }
  assert(
    sum === total,
    `${file} declares components.total ${total} but its groups add up to ${sum}`
  )
  return { scope, groups, total }
}

/**
 * Asserts every declared shard of every group left an artifact folder. Without
 * this a shard that never ran passes as silence.
 * @param {string} root
 * @param {Record<string, number>} groups
 */
function assertDeclaredGroupsReported(root, groups) {
  /** @type {Map<string, string[]>} */
  const found = new Map()
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue
    }
    const group = SHARD_FOLDER.exec(entry.name)?.groups?.group
    assert(
      group !== undefined,
      `Shard artifact folder "${entry.name}" does not end in -<group>-shard-<index>`
    )
    found.set(group, [...(found.get(group) ?? []), entry.name])
  }
  for (const group of found.keys()) {
    assert(
      group in groups,
      `Group ${group} reported shards that the plan did not declare`
    )
  }
  for (const [group, count] of Object.entries(groups)) {
    const reported = found.get(group) ?? []
    assert(
      reported.length === count,
      `Group ${group} declared ${count} shards, found ${reported.length}${reported.length ? `: ${reported.join(", ")}` : ""}`
    )
  }
}

/**
 * @param {{expect: string, reports: string}} options
 */
export function verifyShards({ expect: expectFile, reports }) {
  assert(Boolean(expectFile && reports), USAGE)
  const { scope, groups, total } = readExpectedComponents(expectFile)
  assertDeclaredGroupsReported(reports, groups)
  if (scope === "none") {
    console.log("No component shards were declared for this commit")
    return
  }
  if (scope === "ui") {
    verifyChangedShards(reports, total)
    return
  }
  verifyFullShards(reports, total)
}

/**
 * @param {string[]} argv
 * @returns {{expect: string, reports: string}}
 */
export function parseShardArgs(argv) {
  /** @type {Record<string, string>} */
  const options = {}
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index]
    const value = argv[index + 1]
    assert(
      (flag === "--expect" || flag === "--reports") && Boolean(value),
      USAGE
    )
    options[flag.slice(2)] = value
  }
  assert(Boolean(options.expect && options.reports), USAGE)
  return { expect: options.expect, reports: options.reports }
}

if (import.meta.filename === path.resolve(process.argv[1] ?? "")) {
  verifyShards(parseShardArgs(process.argv.slice(2)))
}

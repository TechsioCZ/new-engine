// Asserts that the sharded CI release run covered every screenshot identity
// exactly once and that every shard ran clean.
//   node scripts/verify-component-shards.mjs <directory with one folder per shard>
// VISUAL_SHARD_MODE=changed only asserts that every shard reported and ran
// clean. A shard with no changed stories leaves changed-none.json instead.
import fs from "node:fs"
import path from "node:path"
import {
  assertVisualCompletion,
  visualStories,
} from "../test/visual-completion.mjs"
import { createVisualMatrix } from "../test/visual-projects.mjs"

const REPORT_NAME = "all.json"
const NONE_MARKER_NAME = "changed-none.json"
const SHARD_MODES = new Set(["full", "changed"])

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
 * @param {string | undefined} root
 * @param {NodeJS.ProcessEnv} env
 */
export function verifyShards(root, env) {
  if (!root) {
    throw new Error(
      "Usage: verify-component-shards.mjs <shard artifact directory>"
    )
  }
  const mode = env.VISUAL_SHARD_MODE ?? "full"
  if (!SHARD_MODES.has(mode)) {
    throw new Error(`VISUAL_SHARD_MODE must be full or changed, got ${mode}`)
  }
  const expectedShards = Number(env.PLAYWRIGHT_RELEASE_SHARDS ?? 0)
  if (mode === "changed") {
    verifyChangedShards(root, expectedShards)
    return
  }
  verifyFullShards(root, expectedShards)
}

if (import.meta.filename === path.resolve(process.argv[1] ?? "")) {
  verifyShards(process.argv[2], process.env)
}

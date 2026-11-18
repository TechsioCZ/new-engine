import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import {
  MOBILE_VIEWPORT_SPECS,
  shardVisualStories,
} from "../test/visual-projects.mjs"
import costs from "../test/visual-shard-costs.json" with { type: "json" }

/** Match the behavior projects in playwright.config.mts, including new specs. */
export function behaviorTestFiles(testRoot) {
  return fs
    .readdirSync(testRoot, { recursive: true })
    .filter(
      (file) =>
        (/\.spec\.ts$/.test(file) ||
          /(^|\/)visual-[^/]+\.spec\.mjs$/.test(file)) &&
        path.basename(file) !== "visual.spec.ts"
    )
    .sort()
}

/** Use the same measured file allocator as screenshots, reserving bundle 2's
 * accessibility work first. Project/files are indivisible; unmeasured files get
 * the measured median. Inventory comes from disk, never the timing history.
 * Visuals then reserve this exact allocation's costs in the generated JSON.
 */
export function behaviorShardPlan(
  group,
  shard,
  testRoot = path.resolve(import.meta.dirname, "../test"),
  weights = costs.behavior
) {
  const files = behaviorTestFiles(testRoot)
  const identities = [
    ...files.map((file) => `desktop/${file}`),
    ...files
      .filter((file) => MOBILE_VIEWPORT_SPECS.includes(path.basename(file)))
      .map((file) => `mobile/${file}`),
  ]
  const selected = shardVisualStories(identities, shard, {
    ...weights,
    storyCount: identities.length,
  })
  const testFiles = selected
    .filter((identity) => identity.startsWith(`${group}/`))
    .map((identity) => identity.slice(group.length + 1))
  return {
    testFiles,
    emptyAllocation: testFiles.length === 0,
    estimatedSeconds:
      testFiles.reduce(
        (sum, file) =>
          sum + (weights.files[`${group}/${file}`]?.cost ?? weights.medianCost),
        0
      ) / 4000,
  }
}

/** Every assigned file must have an actual result in its assigned project.
 * Intentional skips remain allowed, as before; failures and flaky results do
 * not. An empty report is valid only for an explicitly empty allocation.
 */
export function assertBehaviorCompletion(reports, group, testFiles) {
  const expected = new Set(testFiles)
  const seen = new Set()
  const visit = (suites) => {
    for (const suite of suites ?? []) {
      for (const spec of suite.specs ?? []) {
        const file = spec.file
          .replaceAll("\\", "/")
          .replace(/^(?:.*\/)?test\//, "")
        for (const test of spec.tests ?? []) {
          assert.equal(
            test.projectName,
            group,
            `Unexpected behavior project: ${test.projectName}`
          )
          assert.ok(
            expected.has(file),
            `Unexpected behavior file: ${group}/${file}`
          )
          assert.ok(
            test.results?.length > 0 &&
              test.results.every((result) =>
                ["passed", "skipped"].includes(result.status)
              ) &&
              ["expected", "skipped"].includes(test.status),
            `Behavior missing clean execution: ${group}/${file}`
          )
          seen.add(file)
        }
      }
      visit(suite.suites)
    }
  }
  for (const report of reports) {
    assert.equal(report.errors?.length ?? 0, 0, "Behavior runner errors")
    assert.equal(
      report.stats?.unexpected ?? 0,
      0,
      "Unexpected behavior failures"
    )
    assert.equal(report.stats?.flaky ?? 0, 0, "Flaky behavior tests")
    visit(report.suites)
  }
  assert.deepEqual(
    [...seen].sort(),
    [...expected].sort(),
    `Missing behavior files in ${group} allocation`
  )
}

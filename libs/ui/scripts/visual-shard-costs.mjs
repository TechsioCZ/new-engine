// Regenerate from downloaded component-report artifacts, never a local browser run:
// tmp="$(mktemp)"
// node libs/ui/scripts/visual-shard-costs.mjs <report-root> [<report-root> ...] > "$tmp" &&
//   mv "$tmp" libs/ui/test/visual-shard-costs.json
// Each report root must also contain the run's downloaded expected.json matrix.
// Never truncate the imported cost configuration before measurement succeeds.
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  assertVisualCompletion,
  visualStories,
} from "../test/visual-completion.mjs"
import { createVisualMatrix } from "../test/visual-projects.mjs"
import {
  assertBehaviorCompletion,
  behaviorShardPlan,
} from "./component-behavior-shards.mjs"

import { readExpectedComponents } from "./verify-component-shards.mjs"

function find(directory, name) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name)
    return entry.isDirectory()
      ? find(file, name)
      : entry.name === name
        ? [file]
        : []
  })
}

/** Convert actual clean browser work to per-story-file wall costs at four workers.
 * Keep the slower observation of each file, rather than sizing for the fast runner.
 * @param {string[]} roots
 */
export function measureFiles(roots) {
  const observations = []
  for (const root of roots) {
    const files = new Map()
    const identities = new Set()
    const reports = []
    let indexText
    for (const reportPath of find(root, "all.json").filter((file) =>
      /ui-visual-shard-\d+/.test(file)
    )) {
      const report = JSON.parse(fs.readFileSync(reportPath, "utf8"))
      const text = fs.readFileSync(
        path.join(path.dirname(reportPath), "index.json"),
        "utf8"
      )
      if (indexText !== undefined && text !== indexText)
        throw new Error("Screenshot indexes disagree")
      indexText = text
      const { entries } = JSON.parse(text)
      reports.push(report)
      if (
        report.errors.length ||
        report.stats.unexpected ||
        report.stats.flaky ||
        report.stats.skipped
      ) {
        throw new Error(`Not a clean complete screenshot report: ${reportPath}`)
      }
      const tests = []
      const visit = (suites) => {
        for (const suite of suites) {
          for (const spec of suite.specs ?? []) tests.push(...spec.tests)
          visit(suite.suites ?? [])
        }
      }
      visit(report.suites)
      const total = tests.reduce(
        (sum, test) => sum + test.results[0].duration,
        0
      )
      // Distribute browser startup and scheduling time too, not just test bodies.
      const scale = (4 * report.stats.duration) / total
      for (const test of tests) {
        const id = test.annotations?.find(
          (item) => item.type === "visual-story-id"
        )?.description
        const file = entries[id]?.importPath
        const identity = `${test.projectName}/${id}`
        if (
          !file ||
          identities.has(identity) ||
          test.results.length !== 1 ||
          test.results[0].status !== "passed" ||
          test.results[0].retry
        ) {
          throw new Error(
            `Missing, repeated or retried screenshot identity: ${identity}`
          )
        }
        identities.add(identity)
        const measured = files.get(file) ?? { cost: 0, stories: new Set() }
        measured.cost += test.results[0].duration * scale
        measured.stories.add(id)
        files.set(file, measured)
      }
    }
    if (!files.size) throw new Error(`No visual reports in ${root}`)
    assertVisualCompletion(
      reports,
      visualStories(JSON.parse(indexText).entries),
      createVisualMatrix().map((project) => project.name)
    )
    observations.push(files)
  }
  const result = {}
  for (const files of observations) {
    for (const [file, { cost, stories }] of files) {
      result[file] = {
        cost: Math.max(result[file]?.cost ?? 0, Math.ceil(cost)),
        storyCount: stories.size,
      }
    }
  }
  return Object.fromEntries(
    Object.entries(result).sort(([a], [b]) => a.localeCompare(b, "en"))
  )
}

/** Measure behavior on the same four-worker wall-time scale as screenshots.
 * Reports include browser startup/scheduling; intentional skips contribute zero.
 * Each root is one complete run, possibly already split across many bundles.
 */
export function measureBehaviorFiles(roots) {
  const result = {}
  for (const root of roots) {
    const manifests = find(root, "expected.json")
    if (manifests.length !== 1)
      throw new Error(`Expected exactly one expected.json matrix in ${root}`)
    const { scope, groups } = readExpectedComponents(manifests[0])
    if (scope !== "full" || !groups.desktop || !groups.mobile)
      throw new Error(`Expected a full desktop/mobile shard matrix in ${root}`)
    const missing = new Set(
      ["desktop", "mobile"].flatMap((group) =>
        Array.from(
          { length: groups[group] },
          (_, index) => `${group}/${index + 1}`
        )
      )
    )
    const observation = new Map()
    const owners = new Map()
    for (const reportPath of find(root, "all.json")) {
      const match = /(?:^|\/)[^/]*-(desktop|mobile)-shard-(\d+)\//.exec(
        reportPath.replaceAll("\\", "/")
      )
      if (!match) continue
      const [, group, index] = match
      const shard = `${group}/${Number(index)}`
      if (!missing.delete(shard))
        throw new Error(`Repeated or undeclared behavior shard: ${shard}`)
      const report = JSON.parse(fs.readFileSync(reportPath, "utf8"))
      const tests = []
      const visit = (suites) => {
        for (const suite of suites ?? []) {
          for (const spec of suite.specs ?? []) {
            for (const test of spec.tests ?? [])
              tests.push({ file: spec.file, test })
          }
          visit(suite.suites)
        }
      }
      visit(report.suites)
      const files = [...new Set(tests.map(({ file }) => file))]
      assertBehaviorCompletion([report], group, files)
      const total = tests.reduce(
        (sum, { test }) =>
          sum +
          test.results.reduce(
            (sum, item) => sum + (item.status === "passed" ? item.duration : 0),
            0
          ),
        0
      )
      const onlySkipped = tests.every(({ test }) =>
        test.results.every((item) => item.status === "skipped")
      )
      if (!total && files.length && !onlySkipped)
        throw new Error(`No measured behavior work in ${reportPath}`)
      const scale = total ? (4 * report.stats.duration) / total : 0
      for (const { file, test } of tests) {
        const identity = `${group}/${file}`
        if (owners.has(identity) && owners.get(identity) !== reportPath)
          throw new Error(`Repeated behavior file: ${identity}`)
        owners.set(identity, reportPath)
        const duration = test.results.reduce((sum, item) => {
          if (item.retry) throw new Error(`Retried behavior test: ${identity}`)
          return sum + (item.status === "passed" ? item.duration : 0)
        }, 0)
        observation.set(
          identity,
          (observation.get(identity) ?? 0) + duration * scale
        )
      }
    }
    if (missing.size)
      throw new Error(
        `Missing behavior shard reports: ${[...missing].join(", ")}`
      )
    for (const group of ["desktop", "mobile"]) {
      if (
        ![...observation.keys()].some((identity) =>
          identity.startsWith(`${group}/`)
        )
      )
        throw new Error(`No ${group} reports in ${root}`)
    }
    for (const [identity, cost] of observation) {
      result[identity] = {
        cost: Math.max(result[identity]?.cost ?? 0, Math.ceil(cost)),
        storyCount: 1,
      }
    }
  }
  return Object.fromEntries(
    Object.entries(result).sort(([a], [b]) => a.localeCompare(b, "en"))
  )
}

export function componentCosts(roots) {
  const files = measureFiles(roots)
  const behaviorFiles = measureBehaviorFiles(roots)
  const median = (values) =>
    Math.ceil(values.sort((a, b) => a - b)[Math.floor(values.length / 2)])
  const behavior = {
    storyCount: Object.keys(behaviorFiles).length,
    medianCost: median(Object.values(behaviorFiles).map(({ cost }) => cost)),
    // Keep bundle 2's existing accessibility/install/later-start allowance.
    cohostedCosts: [0, 225000 * 4, 0, 0, 0, 0],
    files: behaviorFiles,
  }
  // Behavior owns project/files; screenshots own stories from the live index.
  // Allocate behavior first, then reserve its real costs for the visual pass.
  const cohostedCosts = behavior.cohostedCosts.map((a11y, index) => {
    const shard = { index: index + 1, total: behavior.cohostedCosts.length }
    return (
      a11y +
      Math.round(
        4000 *
          ["desktop", "mobile"].reduce(
            (sum, group) =>
              sum +
              behaviorShardPlan(group, shard, undefined, behavior)
                .estimatedSeconds,
            0
          )
      )
    )
  })
  return {
    sources: roots.map((root) => path.basename(path.resolve(root))),
    measurement:
      "Four-worker milliseconds: distribute each clean Playwright report's wall duration across passing test durations; keep the slower observation per file. Behavior is allocated first; screenshots reserve that allocation plus bundle 2's existing accessibility allowance.",
    maxVisualCost: 354000 * 4,
    storyCount: Object.values(files).reduce(
      (sum, file) => sum + file.storyCount,
      0
    ),
    medianCost: median(
      Object.values(files).map((file) => file.cost / file.storyCount)
    ),
    cohostedCosts,
    behavior,
    files,
  }
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  const roots = process.argv.slice(2)
  if (!roots.length)
    throw new Error("Expected downloaded component-report directories")
  console.log(JSON.stringify(componentCosts(roots), null, 2))
}

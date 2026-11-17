// Regenerate from downloaded component-report artifacts, never a local browser run:
// tmp="$(mktemp)"
// node libs/ui/scripts/visual-shard-costs.mjs <report-root> [<report-root> ...] > "$tmp" &&
//   mv "$tmp" libs/ui/test/visual-shard-costs.json
// Never truncate the imported cost configuration before measurement succeeds.
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  assertVisualCompletion,
  visualStories,
} from "../test/visual-completion.mjs"
import { createVisualMatrix } from "../test/visual-projects.mjs"

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
      /ui-visual-shard-\d+/.test(file),
    )) {
      const report = JSON.parse(fs.readFileSync(reportPath, "utf8"))
      const text = fs.readFileSync(
        path.join(path.dirname(reportPath), "index.json"),
        "utf8",
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
        0,
      )
      // Distribute browser startup and scheduling time too, not just test bodies.
      const scale = (4 * report.stats.duration) / total
      for (const test of tests) {
        const id = test.annotations?.find(
          (item) => item.type === "visual-story-id",
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
            `Missing, repeated or retried screenshot identity: ${identity}`,
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
      createVisualMatrix().map((project) => project.name),
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
    Object.entries(result).sort(([a], [b]) => a.localeCompare(b, "en")),
  )
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  const roots = process.argv.slice(2)
  if (!roots.length)
    throw new Error("Expected downloaded component-report directories")
  const files = measureFiles(roots)
  const storyCount = Object.values(files).reduce(
    (sum, file) => sum + file.storyCount,
    0,
  )
  const perStory = Object.values(files)
    .map((file) => file.cost / file.storyCount)
    .sort((a, b) => a - b)
  console.log(
    JSON.stringify(
      {
        // Costs are four-worker milliseconds, like the summed Playwright durations.
        maxVisualCost: 354000 * 4,
        storyCount,
        medianCost: Math.ceil(perStory[Math.floor(perStory.length / 2)]),
        // Bundle 1 runs the desktop and mobile behavior suites (271-285 s
        // on the visual cost scale, measured on three hosts); bundle 2 its
        // host install, n1-light and half of akros-light (ci-ui-plan.mjs;
        // 122-134 s plus 72-73 s of scans and a 15-17 s later start).
        cohostedCosts: [280000 * 4, 225000 * 4, 0, 0, 0, 0],
        files,
      },
      null,
      2,
    ),
  )
}

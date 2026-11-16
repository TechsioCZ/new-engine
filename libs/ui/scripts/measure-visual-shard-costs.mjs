// Download a successful full run's ui-component-report-* artifacts, then:
// node libs/ui/scripts/measure-visual-shard-costs.mjs <reports-directory> <run-url>
// Redirect stdout to libs/ui/test/visual-shard-costs.json.
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { assertVisualCompletion, visualStories } from "../test/visual-completion.mjs"
import { createVisualMatrix } from "../test/visual-projects.mjs"

const [directory, sourceRun] = process.argv.slice(2)
assert.ok(directory && sourceRun, "Expected reports directory and source run URL")

function files(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(root, entry.name)
    return entry.isDirectory() ? files(full) : entry.name === "all.json" ? [full] : []
  })
}

function tests(suites) {
  return suites.flatMap((suite) => [
    ...(suite.specs ?? []).flatMap((spec) => spec.tests),
    ...tests(suite.suites ?? []),
  ])
}

const reports = files(directory).map((file) => ({
  file, report: JSON.parse(fs.readFileSync(file, "utf8")),
}))
for (const { file, report } of reports) {
  assert.equal(report.errors.length, 0, file)
  assert.equal(report.stats.unexpected, 0, file)
  assert.equal(report.stats.flaky, 0, file)
}
const visuals = reports.filter(({ file }) => /ui-visual-shard-\d+[/\\]all.json$/.test(file))
assert.ok(visuals.length, "No visual shard reports")
const index = JSON.parse(fs.readFileSync(path.join(path.dirname(visuals[0].file), "index.json"), "utf8"))
assertVisualCompletion(
  visuals.map(({ report }) => report),
  visualStories(index.entries),
  createVisualMatrix().map(({ name }) => name)
)
const costs = new Map()
for (const { report } of visuals) {
  for (const item of tests(report.suites)) {
    const story = item.annotations.find((annotation) => annotation.type === "visual-story-id").description
    for (const result of item.results) {
      assert.equal(result.status, "passed", story)
      costs.set(story, (costs.get(story) ?? 0) + result.duration)
    }
  }
}
const desktop = Array(visuals.length)
for (const { file, report } of reports) {
  const match = /ui-desktop-shard-(\d+)[/\\]all.json$/.exec(file)
  if (match) {
    assert.equal(desktop[Number(match[1]) - 1], undefined, "Duplicate desktop shard")
    desktop[Number(match[1]) - 1] = Math.round(report.stats.duration * 4)
  }
}
assert.equal(desktop.filter(Number.isFinite).length, visuals.length, "Missing desktop shard")
const mobile = reports.filter(({ file }) => /ui-mobile-shard-1[/\\]all.json$/.test(file))
assert.equal(mobile.length, 1, "Expected one mobile behavior report")
const values = [...costs.values()].sort((a, b) => a - b)
const minimumDesktop = Math.min(...desktop)
console.log(JSON.stringify({
  sourceRun,
  storyCount: costs.size,
  medianCost: values[Math.floor(values.length / 2)],
  desktopCosts: desktop.map((cost) => cost - minimumDesktop),
  mobileCost: Math.round(mobile[0].report.stats.duration * 4),
  stories: Object.fromEntries([...costs].sort(([a], [b]) => a.localeCompare(b, "en"))),
}, null, 2))

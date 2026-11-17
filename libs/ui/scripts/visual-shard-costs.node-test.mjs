import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { createVisualMatrix } from "../test/visual-projects.mjs"
import { measureFiles } from "./visual-shard-costs.mjs"

function fixture(t, duration = 4000) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "visual-costs-"))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const directory = path.join(root, "ui-visual-shard-1")
  fs.mkdirSync(directory)
  const entries = Object.fromEntries(
    ["a", "b"].map((id) => [
      id,
      { id, type: "story", importPath: `./${id}.stories.tsx` },
    ]),
  )
  fs.writeFileSync(
    path.join(directory, "index.json"),
    JSON.stringify({ entries }),
  )
  const report = {
    errors: [],
    stats: { duration, unexpected: 0, flaky: 0, skipped: 0 },
    suites: [
      {
        specs: createVisualMatrix().flatMap((project) =>
          Object.keys(entries).map((id) => ({
            file: "visual.spec.ts",
            tests: [
              {
                projectName: project.name,
                status: "expected",
                annotations: [{ type: "visual-story-id", description: id }],
                results: [
                  {
                    duration: id === "a" ? 100 : 300,
                    status: "passed",
                    retry: 0,
                  },
                ],
              },
            ],
          })),
        ),
      },
    ],
  }
  const file = path.join(directory, "all.json")
  fs.writeFileSync(file, JSON.stringify(report))
  return {
    root,
    report,
    save: () => fs.writeFileSync(file, JSON.stringify(report)),
  }
}

test("costs conserve actual four-worker wall time and keep the slower file observation", (t) => {
  const a = fixture(t, 4000)
  const b = fixture(t, 8000)
  assert.deepEqual(measureFiles([a.root]), {
    "./a.stories.tsx": { cost: 4000, storyCount: 1 },
    "./b.stories.tsx": { cost: 12000, storyCount: 1 },
  })
  const costs = measureFiles([a.root, b.root])
  assert.equal(
    Object.values(costs).reduce((sum, item) => sum + item.cost, 0) / 4,
    8000,
  )
})

test("a fast but missing or retried screenshot cannot become a balancing weight", (t) => {
  const f = fixture(t)
  f.report.suites[0].specs.pop()
  f.save()
  assert.throws(() => measureFiles([f.root]), /Missing screenshot identities/)
  const retry = fixture(t)
  retry.report.suites[0].specs[0].tests[0].results[0].retry = 1
  retry.save()
  assert.throws(() => measureFiles([retry.root]), /retried screenshot/)
})

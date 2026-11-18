import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"
import {
  createVisualMatrix,
  shardVisualStories,
} from "../test/visual-projects.mjs"
import { behaviorShardPlan } from "./component-behavior-shards.mjs"
import {
  componentCosts,
  measureBehaviorFiles,
  measureFiles,
} from "./visual-shard-costs.mjs"

function fixture(t, duration = 4000) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "visual-costs-"))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  fs.writeFileSync(
    path.join(root, "expected.json"),
    JSON.stringify({
      scope: "full",
      components: { groups: { visual: 1, desktop: 1, mobile: 1 }, total: 3 },
    })
  )
  const directory = path.join(root, "ui-visual-shard-1")
  fs.mkdirSync(directory)
  const entries = Object.fromEntries(
    ["a", "b"].map((id) => [
      id,
      { id, type: "story", importPath: `./${id}.stories.tsx` },
    ])
  )
  fs.writeFileSync(
    path.join(directory, "index.json"),
    JSON.stringify({ entries })
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
          }))
        ),
      },
    ],
  }
  const file = path.join(directory, "all.json")
  fs.writeFileSync(file, JSON.stringify(report))
  for (const group of ["desktop", "mobile"]) {
    const directory = path.join(root, `ui-${group}-shard-1`)
    fs.mkdirSync(directory)
    fs.writeFileSync(
      path.join(directory, "all.json"),
      JSON.stringify({
        errors: [],
        stats: { duration: 1000, unexpected: 0, flaky: 0 },
        suites: [
          {
            specs: [
              {
                file: "player.spec.ts",
                tests: [
                  {
                    projectName: group,
                    status: "expected",
                    results: [{ status: "passed", duration: 100, retry: 0 }],
                  },
                ],
              },
            ],
          },
        ],
      })
    )
  }
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
    8000
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

test("the generator CLI emits the file schema consumed by screenshot sharding", (t) => {
  const f = fixture(t)
  const result = spawnSync(
    process.execPath,
    [
      fileURLToPath(new URL("./visual-shard-costs.mjs", import.meta.url)),
      f.root,
    ],
    { encoding: "utf8" }
  )
  assert.equal(result.status, 0, result.stderr)
  const weights = JSON.parse(result.stdout)
  const stories = ["a", "b"].map((id) => ({
    id,
    importPath: `./${id}.stories.tsx`,
  }))
  const selected = Array.from({ length: 6 }, (_, index) =>
    shardVisualStories(stories, { index: index + 1, total: 6 }, weights)
  ).flat()
  assert.deepEqual(selected.map(({ id }) => id).sort(), ["a", "b"])
  assert.equal(weights.storyCount, stories.length)
})

test("behavior and screenshots reserve the same generated per-bundle costs", (t) => {
  const f = fixture(t)
  const weights = componentCosts([f.root])
  assert.deepEqual(measureBehaviorFiles([f.root]), {
    "desktop/player.spec.ts": { cost: 4000, storyCount: 1 },
    "mobile/player.spec.ts": { cost: 4000, storyCount: 1 },
  })
  for (let index = 1; index <= 6; index++) {
    const shard = { index, total: 6 }
    const seconds = ["desktop", "mobile"].reduce(
      (sum, group) =>
        sum +
        behaviorShardPlan(group, shard, undefined, weights.behavior)
          .estimatedSeconds,
      0
    )
    assert.equal(
      weights.cohostedCosts[index - 1],
      weights.behavior.cohostedCosts[index - 1] + Math.round(seconds * 4000)
    )
  }
})

test("behavior measurements reject missing groups, failures and duplicate file owners", (t) => {
  const f = fixture(t)
  fs.rmSync(path.join(f.root, "ui-mobile-shard-1"), { recursive: true })
  assert.throws(
    () => measureBehaviorFiles([f.root]),
    /Missing behavior shard reports: mobile\/1/
  )
  const bad = fixture(t)
  const file = path.join(bad.root, "ui-mobile-shard-1/all.json")
  const report = JSON.parse(fs.readFileSync(file))
  report.stats.unexpected = 1
  fs.writeFileSync(file, JSON.stringify(report))
  assert.throws(
    () => measureBehaviorFiles([bad.root]),
    /Unexpected behavior failures/
  )
  const duplicate = fixture(t)
  const manifest = path.join(duplicate.root, "expected.json")
  const expected = JSON.parse(fs.readFileSync(manifest))
  expected.components.groups.desktop = 2
  expected.components.total = 4
  fs.writeFileSync(manifest, JSON.stringify(expected))
  fs.cpSync(
    path.join(duplicate.root, "ui-desktop-shard-1"),
    path.join(duplicate.root, "ui-desktop-shard-2"),
    { recursive: true }
  )
  assert.throws(
    () => measureBehaviorFiles([duplicate.root]),
    /Repeated behavior file/
  )
})

test("intentional skip-only shards receive zero cost, not missing timing errors", (t) => {
  const f = fixture(t)
  const file = path.join(f.root, "ui-mobile-shard-1/all.json")
  const report = JSON.parse(fs.readFileSync(file))
  const entry = report.suites[0].specs[0].tests[0]
  entry.status = "skipped"
  entry.results = [{ status: "skipped", duration: 0, retry: 0 }]
  report.stats.skipped = 1
  fs.writeFileSync(file, JSON.stringify(report))
  assert.deepEqual(measureBehaviorFiles([f.root])["mobile/player.spec.ts"], {
    cost: 0,
    storyCount: 1,
  })
  entry.status = "expected"
  entry.results = [{ status: "passed", duration: 0, retry: 0 }]
  report.stats.skipped = 0
  fs.writeFileSync(file, JSON.stringify(report))
  assert.throws(
    () => measureBehaviorFiles([f.root]),
    /No measured behavior work/
  )
  delete entry.results[0].duration
  fs.writeFileSync(file, JSON.stringify(report))
  assert.throws(
    () => measureBehaviorFiles([f.root]),
    /No measured behavior work/
  )
})

test("a timed passing result does not vouch for an untimed one in the same report", (t) => {
  for (const duration of [0, undefined]) {
    const f = fixture(t)
    const file = path.join(f.root, "ui-mobile-shard-1/all.json")
    const report = JSON.parse(fs.readFileSync(file))
    report.suites[0].specs.push({
      file: "tour.spec.ts",
      tests: [
        {
          projectName: "mobile",
          status: "expected",
          results: [{ status: "passed", duration, retry: 0 }],
        },
      ],
    })
    fs.writeFileSync(file, JSON.stringify(report))
    assert.throws(
      () => measureBehaviorFiles([f.root]),
      /Unmeasured passing behavior test: mobile\/tour\.spec\.ts/
    )
  }
})

test("behavior measurements require the declared complete shard set", (t) => {
  for (const group of ["desktop", "mobile"]) {
    const f = fixture(t)
    const manifest = path.join(f.root, "expected.json")
    const expected = JSON.parse(fs.readFileSync(manifest))
    expected.components.groups[group] = 2
    expected.components.total = 4
    fs.writeFileSync(manifest, JSON.stringify(expected))
    assert.throws(
      () => measureBehaviorFiles([f.root]),
      /Missing behavior shard/
    )
    const directory = path.join(f.root, `ui-${group}-shard-2`)
    fs.mkdirSync(directory)
    fs.writeFileSync(
      path.join(directory, "all.json"),
      JSON.stringify({ errors: [], stats: { duration: 0 }, suites: [] })
    )
    assert.doesNotThrow(() => measureBehaviorFiles([f.root]))
    fs.rmSync(manifest)
    assert.throws(
      () => measureBehaviorFiles([f.root]),
      /exactly one expected.json/
    )
  }
})

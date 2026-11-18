import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import {
  assertBehaviorCompletion,
  behaviorShardPlan,
} from "./component-behavior-shards.mjs"

import costs from "../test/visual-shard-costs.json" with { type: "json" }
import { shardVisualStories } from "../test/visual-projects.mjs"

const runner = path.join(import.meta.dirname, "run-component-tests.mjs")
const root = path.resolve(import.meta.dirname, "../test")

function plan(group, shard, release = true) {
  const result = spawnSync(process.execPath, [runner, "--print-plan"], {
    encoding: "utf8",
    env: {
      ...process.env,
      PLAYWRIGHT_GROUP: group,
      VISUAL_RELEASE_READINESS: release ? "1" : "",
      PLAYWRIGHT_RELEASE_SHARD: release ? shard : "",
      PLAYWRIGHT_SHARD: release ? "" : shard,
    },
  })
  assert.equal(result.status, 0, result.stderr)
  return JSON.parse(result.stdout)
}

test("six release and changed shards preserve the full behavior file multiset", () => {
  // This inventory independently mirrors the unchanged Playwright config:
  // desktop's *.spec.ts + visual-*.spec.mjs except screenshots; four mobile specs.
  const desktop = fs
    .readdirSync(root)
    .filter(
      (file) =>
        file.endsWith(".spec.ts") ||
        (file.startsWith("visual-") && file.endsWith(".spec.mjs"))
    )
    .filter((file) => file !== "visual.spec.ts")
    .sort()
  const mobile = [
    "cascade-select.behavior.spec.ts",
    "drawer.behavior.spec.ts",
    "player.spec.ts",
    "search-suggestions.spec.ts",
  ]
  for (const release of [true, false]) {
    for (const [group, expected] of [
      ["desktop", desktop],
      ["mobile", mobile],
    ]) {
      assert.deepEqual(plan(group, "1/1", release).testFiles.sort(), expected)
      const selected = []
      for (let index = 1; index <= 6; index++) {
        const p = plan(group, `${index}/6`, release)
        assert.deepEqual(p.projects, [group])
        assert.ok(!p.testArgs.some((arg) => arg.startsWith("--shard")))
        if (!p.testFiles.length) {
          assert.equal(p.emptyAllocation, true)
          assert.deepEqual(p.testArgs, ["$^", "--pass-with-no-tests"])
        } else {
          assert.equal(p.testArgs.length, p.testFiles.length)
          for (const file of desktop) {
            assert.equal(
              p.testArgs.some((arg) =>
                new RegExp(arg).test(`/app/test/${file}`)
              ),
              p.testFiles.includes(file),
              `${group} shard ${index}: ${file}`
            )
          }
        }
        selected.push(...p.testFiles)
      }
      assert.deepEqual(selected.sort(), expected)
      assert.equal(new Set(selected).size, selected.length)
    }
  }
})

test("an unmeasured nested behavior spec runs exactly once instead of disappearing", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "behavior-shard-"))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  fs.mkdirSync(path.join(root, "new"))
  for (const file of [
    "new/unmeasured.spec.ts",
    "visual-extra.spec.mjs",
    "visual.spec.ts",
  ]) {
    fs.writeFileSync(path.join(root, file), "")
  }
  const selected = Array.from(
    { length: 6 },
    (_, index) =>
      behaviorShardPlan("desktop", { index: index + 1, total: 6 }, root)
        .testFiles
  ).flat()
  assert.deepEqual(selected.sort(), [
    "new/unmeasured.spec.ts",
    "visual-extra.spec.mjs",
  ])
  assert.deepEqual(behaviorShardPlan("mobile", undefined, root).testFiles, [])
})

function report(file, projectName = "mobile") {
  return {
    errors: [],
    stats: { unexpected: 0, flaky: 0 },
    suites: [
      {
        specs: [
          {
            file,
            tests: [
              {
                projectName,
                status: "expected",
                results: [{ status: "passed" }],
              },
            ],
          },
        ],
      },
    ],
  }
}

test("an empty report cannot hide an assigned file, even with pass-with-no-tests", () => {
  const empty = { errors: [], stats: { unexpected: 0, flaky: 0 }, suites: [] }
  assert.doesNotThrow(() => assertBehaviorCompletion([empty], "mobile", []))
  assert.throws(
    () => assertBehaviorCompletion([empty], "mobile", ["player.spec.ts"]),
    /Missing behavior files/
  )
  assert.throws(
    () =>
      assertBehaviorCompletion(
        [{ ...empty, errors: ["runner failed"] }],
        "mobile",
        []
      ),
    /runner errors/
  )
  assert.throws(
    () => assertBehaviorCompletion([report("player.spec.ts")], "mobile", []),
    /Unexpected behavior file/
  )
})

test("completion checks every assigned file and its actual project and result", () => {
  assert.doesNotThrow(() =>
    assertBehaviorCompletion([report("test/player.spec.ts")], "mobile", [
      "player.spec.ts",
    ])
  )
  assert.throws(
    () =>
      assertBehaviorCompletion([report("player.spec.ts")], "mobile", [
        "player.spec.ts",
        "drawer.behavior.spec.ts",
      ]),
    /Missing behavior files/
  )
  assert.throws(
    () =>
      assertBehaviorCompletion(
        [report("player.spec.ts", "desktop")],
        "mobile",
        ["player.spec.ts"]
      ),
    /Unexpected behavior project/
  )
  const missing = report("player.spec.ts")
  missing.suites[0].specs[0].tests[0].results = []
  assert.throws(
    () => assertBehaviorCompletion([missing], "mobile", ["player.spec.ts"]),
    /missing clean execution/
  )
})

test("generated visual reservations match behavior assignments and balance the complete bundles", () => {
  const stories = Object.entries(costs.files).flatMap(
    ([importPath, { storyCount }]) =>
      Array.from({ length: storyCount }, (_, index) => ({
        id: `${importPath}/${index}`,
        importPath,
      }))
  )
  const loads = []
  for (let index = 1; index <= 6; index++) {
    const shard = { index, total: 6 }
    const behavior = ["desktop", "mobile"].reduce(
      (sum, group) => sum + behaviorShardPlan(group, shard).estimatedSeconds,
      0
    )
    const a11y = costs.behavior.cohostedCosts[index - 1] / 4000
    assert.equal(
      costs.cohostedCosts[index - 1],
      Math.round(4000 * (behavior + a11y))
    )
    const visual =
      shardVisualStories(stories, shard).reduce(
        (sum, story) =>
          sum +
          costs.files[story.importPath].cost /
            costs.files[story.importPath].storyCount,
        0
      ) / 4000
    loads.push(visual + behavior + a11y)
  }
  assert.ok(Math.max(...loads) - Math.min(...loads) < 2, JSON.stringify(loads))
})

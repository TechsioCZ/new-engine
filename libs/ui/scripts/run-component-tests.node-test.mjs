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

function plan(args = [], release = false, shard = "1/1") {
  const result = spawnSync(
    process.execPath,
    [
      new URL("./run-component-tests.mjs", import.meta.url).pathname,
      "--print-plan",
      ...args,
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        PLAYWRIGHT_GROUP: "desktop",
        PLAYWRIGHT_SHARD: release ? "" : shard,
        PLAYWRIGHT_RELEASE_SHARD: release ? shard : "",
        VISUAL_RELEASE_READINESS: release ? "1" : "",
      },
    }
  )
  assert.equal(result.status, 0, result.stderr)
  return JSON.parse(result.stdout)
}

// Playwright's forceRegExp treats bare CLI filters as case-insensitive;
// slash-delimited filters use only their explicit flags.
function fileMatcher(arg) {
  const match = arg.match(/^\/(.*)\/([gi]*)$/)
  return match ? new RegExp(match[1], match[2]) : new RegExp(arg, "gi")
}

test("focused positional runs retain only the user's filter and native sharding", () => {
  for (const shard of ["1/1", "4/6"]) {
    assert.deepEqual(plan(["player.spec.ts"], false, shard).testArgs, [
      `--shard=${shard}`,
      "--pass-with-no-tests",
      "player.spec.ts",
    ])
  }
})

test("a focused non-release grep can cleanly select no tests", () => {
  const value = plan(["--grep", "title-that-does-not-exist"])
  assert.ok(value.testArgs.includes("--pass-with-no-tests"))
  assert.deepEqual(value.testArgs.slice(-2), [
    "--grep",
    "title-that-does-not-exist",
  ])
})

test("allocated filters match only their exact case-sensitive container paths", () => {
  for (const release of [true, false]) {
    const value = plan([], release)
    const arg = value.testArgs.find((arg) =>
      fileMatcher(arg).test("/app/test/player.spec.ts")
    )
    assert.ok(arg)
    for (const file of [
      "/app/test/integration-test/player.spec.ts",
      "/app/test/Player.spec.ts",
      "/other/test/player.spec.ts",
    ]) {
      assert.equal(fileMatcher(arg).test(file), false, file)
    }
    assert.ok(!value.testArgs.some((arg) => arg.startsWith("--shard=")))
  }
})

test("an explicitly empty behavior allocation reports coverage without starting Docker", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "empty-behavior-"))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const storybook = path.join(root, "storybook")
  fs.mkdirSync(storybook)
  fs.writeFileSync(path.join(storybook, "iframe.html"), "")
  const index = JSON.stringify({ entries: {} })
  fs.writeFileSync(path.join(storybook, "index.json"), index)
  // No executable is on PATH. Even probing Docker would fail this test.
  const shard = Array.from({ length: 10 }, (_, i) => i + 1).find((index) =>
    behaviorShardPlan("mobile", { index, total: 10 }).emptyAllocation
  )
  assert.ok(shard)
  const inherited = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) => !/^(VISUAL_|PLAYWRIGHT_|TEST_)/.test(key)
    )
  )
  const result = spawnSync(
    process.execPath,
    [new URL("./run-component-tests.mjs", import.meta.url).pathname],
    {
      encoding: "utf8",
      env: {
        ...inherited,
        PATH: root,
        PLAYWRIGHT_GROUP: "mobile",
        PLAYWRIGHT_SHARD: `${shard}/10`,
        PLAYWRIGHT_OUTPUT_DIR: root,
        VISUAL_STORYBOOK_STATIC_DIR: storybook,
      },
    }
  )
  assert.equal(result.status, 0, result.stderr)
  const reports = path.join(root, "test-results/visual-reports")
  const report = JSON.parse(fs.readFileSync(path.join(reports, "all.json")))
  assertBehaviorCompletion([report], "mobile", [])
  assert.equal(report.stats.duration, 0)
  assert.equal(fs.readFileSync(path.join(reports, "index.json"), "utf8"), index)
})

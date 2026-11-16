import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { a11yBrand, assertA11yBrand, calibrationIds } from "../.storybook/a11y-policy.mjs"

const script = new URL("./verify-a11y-shards.mjs", import.meta.url).pathname

function fixture(t, { locked = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "a11y-shards-"))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const ids = [...calibrationIds, "atoms-button--primary", "atoms-input--basic"]
  const entries = Object.fromEntries(ids.map((id) => [id, {
    id, type: "story", title: id.split("--")[0], name: id.split("--")[1],
  }]))
  if (locked) {
    const id = "pages-akros--locked"
    ids.push(id)
    entries[id] = { id, type: "story", title: "pages-akros", name: "locked", tags: ["a11y-brand:akros"] }
  }
  const index = path.join(root, "index.json")
  const served = path.join(root, "served.json")
  fs.writeFileSync(index, JSON.stringify({ entries }))
  function run(args) {
    const result = spawnSync(process.execPath, [script, ...args], { encoding: "utf8" })
    return { status: result.status, output: result.stdout + result.stderr }
  }
  function plan(shard, theme = "business-light") {
    const out = path.join(root, theme, shard.replace("/", "-"))
    const result = run(["--plan", "--index", index, "--out", out,
      "--theme", theme, "--theme-count", "1", "--shard", shard,
      "--scope", "full", "--write-index", served])
    assert.equal(result.status, 0, result.output)
    const planned = JSON.parse(fs.readFileSync(path.join(out, "expected-stories.json")))
    const actual = Object.keys(JSON.parse(fs.readFileSync(served)).entries).sort()
    assert.deepEqual(actual, planned.storyIds)
    return { out, planned }
  }
  function record({ out, planned }, { omit, omitCalibration = false, omitReport } = {}) {
    const output = path.join(out, "jest.json")
    fs.writeFileSync(output, JSON.stringify({ testResults: [{
      assertionResults: planned.storyIds.filter((id) => id !== omit).map((id) => ({
        status: "passed", ancestorTitles: [entries[id].title, entries[id].name],
      })),
    }] }))
    if (!omitCalibration) {
      fs.writeFileSync(path.join(out, "calibration.ndjson"),
        planned.storyIds.filter((id) => calibrationIds.includes(id)).map((storyId) =>
          JSON.stringify({ storyId, brand: "business", mode: "light", status: "passed" })
        ).join("\n"))
    }
    fs.writeFileSync(path.join(out, "report.ndjson"),
      planned.storyIds.filter((id) => !calibrationIds.includes(id) && id !== omitReport)
        .map((storyId) => JSON.stringify({ storyId, results: { violations: [] } })).join("\n"))
    return run(["--record", "--index", index, "--out", out,
      "--theme", "business-light", "--shard", planned.shard, "--jest-output", output])
  }
  return { root, ids, plan, record, run }
}

test("standalone shards prove exactly their planned stories and calibration", (t) => {
  const f = fixture(t)
  const all = []
  for (const shard of ["1/2", "2/2"]) {
    const plan = f.plan(shard)
    all.push(...plan.planned.storyIds)
    const recorded = f.record(plan)
    assert.equal(recorded.status, 0, recorded.output)
  }
  assert.deepEqual(all.sort(), f.ids.sort())
  const expected = path.join(f.root, "expected.json")
  fs.writeFileSync(expected, JSON.stringify({
    scope: "full", a11y: { themes: ["business-light"], shards_per_theme: 2, total: 2 },
  }))
  const verified = f.run(["--expect", expected, "--reports", f.root])
  assert.equal(verified.status, 0, verified.output)
  assert.match(verified.output, /stories scanned exactly once/)
})

test("a standalone scan fails when Jest silently omits a planned story", (t) => {
  const f = fixture(t)
  const plan = f.plan("1/1")
  const result = f.record(plan, { omit: "atoms-button--primary" })
  assert.notEqual(result.status, 0)
  assert.match(result.output, /planned stories were never scanned/)
})

test("a standalone scan fails when calibration did not run", (t) => {
  const f = fixture(t)
  const result = f.record(f.plan("1/1"), { omitCalibration: true })
  assert.notEqual(result.status, 0)
  assert.match(result.output, /passed 0 time/)
})

test("theme-locked stories run only in their actual brand; other themes retain calibration", (t) => {
  const f = fixture(t, { locked: true })
  const business = f.plan("1/1", "business-light").planned.storyIds
  const akros = f.plan("1/1", "akros-light").planned.storyIds
  assert.ok(!business.includes("pages-akros--locked"))
  assert.ok(akros.includes("pages-akros--locked"))
  for (const id of calibrationIds) assert.ok(business.includes(id) && akros.includes(id))
})

test("Jest passing without an actual accessibility result cannot satisfy coverage", (t) => {
  const f = fixture(t)
  const result = f.record(f.plan("1/1"), { omitReport: "atoms-button--primary" })
  assert.notEqual(result.status, 0)
  assert.match(result.output, /No accessibility scan recorded/)
})


test("accessibility scope metadata cannot hide an unlocked or differently locked story", () => {
  assert.equal(a11yBrand(["autodocs", "a11y-brand:akros"]), "akros")
  assert.doesNotThrow(() => assertA11yBrand(["a11y-brand:akros"], "akros"))
  assert.doesNotThrow(() => assertA11yBrand(["autodocs"], undefined))
  assert.throws(() => assertA11yBrand([], "akros"), /must match/)
  assert.throws(() => assertA11yBrand(["a11y-brand:akros"], undefined), /must match/)
  assert.throws(() => assertA11yBrand(["a11y-brand:akros"], "business"), /must match/)
  assert.throws(() => a11yBrand(["a11y-brand:akros", "a11y-brand:n1"]), /multiple/)
  assert.throws(() => a11yBrand(["a11y-brand:unknown"]), /Unknown brand/)
})

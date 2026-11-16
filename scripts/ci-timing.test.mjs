import assert from "node:assert/strict"
import test from "node:test"
import { measure } from "./ci-timing.mjs"

test("dependency execution is not counted as runner queue", () => {
  const at = (seconds) => new Date(seconds * 1000).toISOString()
  const job = (name, created, started, completed) => ({
    name, status: "completed", conclusion: "success",
    created_at: at(created), started_at: at(started), completed_at: at(completed),
  })
  const result = measure({ status: "completed", created_at: at(0) }, [
    job("main", 1, 3, 18),
    job("ui-quality / plan", 1, 2, 6),
    job("ui-quality / components (visual, 1, 1)", 6, 10, 30),
    job("quality-gate", 30, 35, 36),
  ])
  assert.deepEqual(result.critical, [
    "ui-quality / plan", "ui-quality / components (visual, 1, 1)", "quality-gate",
  ])
  assert.equal(result.jobs[2].queue, 4000)
  assert.equal(result.elapsed, 36000)
  assert.equal(result.execution, 25000)
  assert.equal(result.waiting, 11000)
  assert.throws(() => measure({ status: "queued" }, []), /no completed measurement/)
})

test("the pre-change component fan-in retains the heavy work on the baseline path", () => {
  const at = (seconds) => new Date(seconds * 1000).toISOString()
  const job = (name, created, started, completed) => ({
    name, status: "completed", conclusion: "success",
    created_at: at(created), started_at: at(started), completed_at: at(completed),
  })
  const result = measure({ status: "completed", created_at: at(0) }, [
    job("ui-quality / plan", 1, 2, 6),
    job("ui-quality / components (1)", 6, 10, 30),
    job("ui-quality / components-complete", 30, 31, 32),
    job("quality-gate", 32, 35, 36),
  ])
  assert.equal(result.execution, 26000)
  assert.equal(result.waiting, 10000)
  assert.equal(result.critical.length, 4)
})

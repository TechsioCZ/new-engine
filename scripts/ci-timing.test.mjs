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

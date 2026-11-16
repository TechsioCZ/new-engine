import assert from "node:assert/strict"
import test from "node:test"
import { assertVisualCompletion } from "../test/visual-completion.mjs"
import { assertChangedShard } from "./verify-component-shards.mjs"

test("a successful fallback cannot disguise a failed first screenshot render", () => {
  const screenshot = {
    projectName: "business-desktop-light",
    annotations: [
      { type: "visual-story-id", description: "atoms-button--primary" },
    ],
    status: "expected",
    results: [{ status: "passed" }],
  }
  const report = {
    errors: [],
    stats: { unexpected: 0, flaky: 0 },
    suites: [{ specs: [{ file: "visual.spec.ts", tests: [screenshot] }] }],
  }
  const verify = () => assertVisualCompletion(
    [report], [{ id: "atoms-button--primary" }], ["business-desktop-light"]
  )
  verify()
  screenshot.annotations.push({
    type: "visual-canonical-retry",
    description: "First render failed; fresh-context render passed",
  })
  assert.throws(verify, /recovered from a failed first render/)
  assert.throws(
    () => assertChangedShard({ name: "changed", reports: [report], markers: [] }),
    /recovered from a failed first render/
  )
})

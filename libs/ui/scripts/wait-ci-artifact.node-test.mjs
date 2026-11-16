import assert from "node:assert/strict"
import test from "node:test"
import { readyArtifact } from "./wait-ci-artifact.mjs"

const dependency = { name: "storybook-current-sha", producer: "main" }

test("consumers can use a published build before its producer finishes testing", () => {
  assert.equal(readyArtifact({
    ...dependency,
    artifacts: [{ name: dependency.name, id: 123, expired: false, size_in_bytes: 10 }],
    jobs: [{ name: "main", status: "in_progress", conclusion: null }],
  }), 123)
})

test("an unfinished producer is pending, but other revisions and expired builds are not ready", () => {
  assert.equal(readyArtifact({
    ...dependency,
    artifacts: [
      { name: dependency.name, id: 789, expired: false, size_in_bytes: 0 },
      { name: "storybook-old-sha", id: 123, expired: false, size_in_bytes: 10 },
      { name: dependency.name, id: 456, expired: true, size_in_bytes: 10 },
    ],
    jobs: [{ name: "main", status: "in_progress", conclusion: null }],
  }), undefined)
})

test("a finished producer without the declared build fails its consumers", () => {
  for (const conclusion of ["failure", "cancelled", "success"]) {
    assert.throws(() => readyArtifact({
      ...dependency, artifacts: [],
      jobs: [{ name: "main", status: "completed", conclusion }],
    }), /without artifact storybook-current-sha/)
  }
})

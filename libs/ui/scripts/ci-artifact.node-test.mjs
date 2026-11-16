import assert from "node:assert/strict"
import test from "node:test"
import { readyArtifact, rateLimitDelay } from "./ci-artifact.mjs"

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

test("rate limits respect the server's delay without retrying permission failures", () => {
  assert.equal(rateLimitDelay({
    status: 429, headers: new Headers({ "retry-after": "12" }), now: 100_000,
  }), 12_000)
  assert.equal(rateLimitDelay({
    status: 403, headers: new Headers({
      "x-ratelimit-remaining": "0", "x-ratelimit-reset": "130",
    }), now: 100_000,
  }), 30_000)
  assert.equal(rateLimitDelay({
    status: 403, headers: new Headers(), message: "secondary rate limit", now: 100_000,
  }), 60_000)
  assert.equal(rateLimitDelay({
    status: 403, headers: new Headers(), message: "Resource not accessible", now: 100_000,
  }), undefined)
})

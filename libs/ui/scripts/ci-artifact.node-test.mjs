import assert from "node:assert/strict"
import test from "node:test"
import { pollPlan, readyArtifact, rateLimitDelay } from "./ci-artifact.mjs"

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

test("the wait reads artifacts every 5 s for two minutes, and producer state at most every 15 s", () => {
  const schedule = Array.from({ length: 24 }, (_, poll) => pollPlan(poll * 5_000, poll))
  assert.ok(schedule.every(({ interval }) => interval === 5_000))
  assert.deepEqual(
    schedule.map(({ readJobs }, poll) => readJobs ? poll : -1).filter((poll) => poll >= 0),
    [0, 3, 6, 9, 12, 15, 18, 21],
  )
  assert.deepEqual(pollPlan(120_000, 24), { readJobs: true, interval: 15_000 })
  assert.deepEqual(pollPlan(299_000, 31), { readJobs: true, interval: 15_000 })
})

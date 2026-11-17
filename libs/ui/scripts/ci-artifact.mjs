import path from "node:path"
import { setTimeout } from "node:timers/promises"
import { fileURLToPath } from "node:url"

/**
 * An artifact is a step-level dependency, not a dependency on all later tests
 * in its producing job. Never use a stale artifact or wait past producer failure.
 * @param {{artifacts: {name: string, expired: boolean, size_in_bytes: number, id: number}[], jobs: {name: string, status: string, conclusion: string | null}[], name: string, producer: string}} input
 */
export function readyArtifact({ artifacts, jobs, name, producer }) {
  const artifact = artifacts.find((item) => item.name === name && !item.expired && item.size_in_bytes > 0)
  if (artifact) return artifact.id
  const job = jobs.find((item) => item.name === producer)
  if (job?.status === "completed") {
    throw new Error(`${producer} finished (${job.conclusion}) without artifact ${name}`)
  }
}

/** The wait's read schedule. The shared build usually lands within two
 * minutes of a consumer starting to wait, so artifacts are read every 5 s
 * then and every 15 s after. Producer state is read at most every 15 s, always
 * before that iteration's artifact read, so a failed producer is still seen
 * within 15 s. Six consumers make at most 336 calls over the five-minute
 * budget (32 in the first two minutes each, then 24), against 240 at a flat
 * 15 s; a normal wait of under 30 s is a dozen calls.
 * @param {number} elapsed milliseconds since the wait started
 * @param {number} poll zero-based iteration
 */
export function pollPlan(elapsed, poll) {
  const fast = elapsed < 120_000
  return { readJobs: !fast || poll % 3 === 0, interval: fast ? 5_000 : 15_000 }
}

/** Respect GitHub's primary and secondary rate-limit responses, not permission errors.
 * @param {{status: number, headers: Headers, message?: string, now: number}} response
 */
export function rateLimitDelay({ status, headers, message = "", now }) {
  if (status !== 403 && status !== 429) return
  const retry = headers.get("retry-after")
  if (retry !== null) {
    const seconds = Number(retry)
    const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retry) - now
    if (!Number.isFinite(delay)) throw new Error("Invalid GitHub Retry-After header")
    return Math.max(1000, delay)
  }
  const reset = headers.get("x-ratelimit-reset")
  if (headers.get("x-ratelimit-remaining") === "0" && reset !== null) {
    const timestamp = Number(reset)
    if (!Number.isFinite(timestamp)) throw new Error("Invalid GitHub rate-limit reset")
    return Math.max(1000, timestamp * 1000 - now)
  }
  if (status === 429 || /secondary rate limit|API rate limit exceeded/i.test(message)) {
    return 60_000
  }
}

async function read(endpoint, deadline) {
  if (!process.env.GH_TOKEN) throw new Error("GH_TOKEN is required for CI artifacts")
  while (Date.now() < deadline) {
    const response = await fetch(`https://api.github.com/${endpoint}`, {
      headers: {
        Authorization: `Bearer ${process.env.GH_TOKEN}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())),
    })
    const body = await response.json()
    if (response.ok) return body
    const delay = rateLimitDelay({
      status: response.status, headers: response.headers,
      message: body.message, now: Date.now(),
    })
    if (delay === undefined) throw new Error(`GitHub artifact API: HTTP ${response.status}`)
    if (Date.now() + delay >= deadline) {
      throw new Error("GitHub API rate limit exceeds the remaining artifact wait budget")
    }
    console.error(`GitHub API throttled; waiting ${Math.ceil(delay / 1000)}s`)
    await setTimeout(delay)
  }
  throw new Error("Timed out reading the GitHub artifact API")
}

async function main() {
  const [command, name, producer] = process.argv.slice(2)
  if (!name || !["exists", "wait"].includes(command) || (command === "wait" && !producer)) {
    throw new Error("Expected: ci-artifact.mjs exists <name> | wait <name> <producer>")
  }
  const root = `repos/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
  const start = Date.now()
  const deadline = start + 300_000
  if (command === "exists") {
    const { artifacts } = await read(`${root}/artifacts?per_page=100`, deadline)
    console.log(Boolean(readyArtifact({ artifacts, jobs: [], name, producer: "" })))
    return
  }
  for (let poll = 0; ; poll += 1) {
    const { readJobs, interval } = pollPlan(Date.now() - start, poll)
    // Observe terminal producer state before reading its artifacts, so an
    // upload that finishes between API calls cannot look like a missing build.
    const { jobs } = readJobs ? await read(`${root}/jobs?per_page=100`, deadline) : { jobs: [] }
    const { artifacts } = await read(`${root}/artifacts?per_page=100`, deadline)
    const id = readyArtifact({ artifacts, jobs, name, producer })
    if (id) {
      console.log(`Artifact ${name} ready after ${((Date.now() - start) / 1000).toFixed(1)}s`)
      return
    }
    if (Date.now() + interval >= deadline) throw new Error(`Timed out waiting for ${producer} artifact ${name}`)
    await setTimeout(interval)
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await main()
}

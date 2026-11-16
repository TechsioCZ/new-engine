import { execFileSync } from "node:child_process"
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

async function main() {
  const [name, producer] = process.argv.slice(2)
  if (!name || !producer) throw new Error("Expected artifact name and producing job name")
  const root = `repos/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
  const read = (endpoint) => JSON.parse(execFileSync("gh", ["api", endpoint], {
    encoding: "utf8", stdio: ["ignore", "pipe", "inherit"],
  }))
  const start = Date.now()
  while (true) {
    // Observe terminal producer state before reading its artifacts, so an
    // upload that finishes between API calls cannot look like a missing build.
    const { jobs } = read(`${root}/jobs?per_page=100`)
    const { artifacts } = read(`${root}/artifacts?per_page=100`)
    const id = readyArtifact({ artifacts, jobs, name, producer })
    if (id) {
      console.log(`Artifact ${name} ready after ${((Date.now() - start) / 1000).toFixed(1)}s`)
      return
    }
    if (Date.now() - start >= 300_000) throw new Error(`Timed out waiting for ${producer} artifact ${name}`)
    await setTimeout(5000)
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await main()
}

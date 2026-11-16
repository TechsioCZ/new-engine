#!/usr/bin/env node
import { execFileSync } from "node:child_process"
import path from "node:path"
import { pathToFileURL } from "node:url"

const milliseconds = (timestamp) => {
  const value = Date.parse(timestamp)
  if (!Number.isFinite(value)) {
    throw new Error(`Missing or invalid Actions timestamp: ${timestamp}`)
  }
  return value
}
const minutes = (duration) => (duration / 60_000).toFixed(2)

/**
 * CI's plan releases its heavy matrices; quality-gate waits for all CI jobs.
 * Other workflows here have independent root jobs. Queue is created→started,
 * never trigger→started (which would incorrectly count prerequisite execution).
 */
export function measure(run, jobs) {
  if (run.status !== "completed") {
    throw new Error(`Run ${run.id} is ${run.status}; no completed measurement`)
  }
  const executed = jobs.filter((job) => job.conclusion !== "skipped")
  if (!executed.length || executed.some((job) => job.status !== "completed")) {
    throw new Error("No completed job inventory")
  }
  const plan = executed.find((job) => job.name === "ui-quality / plan")
  const gate = executed.find((job) => job.name === "quality-gate")
  const end = gate ?? executed.reduce((last, job) =>
    milliseconds(job.completed_at) > milliseconds(last.completed_at) ? job : last
  )
  function prerequisites(job) {
    if (job === gate) {
      return executed.filter((candidate) => candidate !== gate)
    }
    if (plan && (
      job.name.startsWith("ui-quality / components (") ||
      job.name.startsWith("ui-quality / accessibility /")
    )) {
      return [plan]
    }
    return []
  }
  function pathTo(job) {
    const needs = prerequisites(job)
    const previous = needs.reduce((last, candidate) =>
      !last || milliseconds(candidate.completed_at) > milliseconds(last.completed_at)
        ? candidate : last, undefined)
    return [...(previous ? pathTo(previous) : []), job]
  }
  const critical = pathTo(end)
  const elapsed = milliseconds(end.completed_at) - milliseconds(run.created_at)
  const execution = critical.reduce((sum, job) =>
    sum + milliseconds(job.completed_at) - milliseconds(job.started_at), 0)
  return {
    elapsed, execution, waiting: elapsed - execution,
    critical: critical.map(({ name }) => name),
    jobs: executed.map((job) => ({
      name: job.name,
      conclusion: job.conclusion,
      queue: milliseconds(job.started_at) - milliseconds(job.created_at),
      execution: milliseconds(job.completed_at) - milliseconds(job.started_at),
    })),
  }
}

function main([repository, id]) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? "") || !/^\d+$/.test(id ?? "")) {
    throw new Error("Usage: node scripts/ci-timing.mjs OWNER/REPO RUN_ID")
  }
  const api = (endpoint, args = []) => JSON.parse(execFileSync(
    "gh", ["api", endpoint, ...args], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }
  ))
  const endpoint = `repos/${repository}/actions/runs/${id}`
  const run = api(endpoint)
  const jobs = api(`${endpoint}/jobs?per_page=100`, ["--paginate", "--slurp"])
    .flatMap((page) => page.jobs)
  const result = measure(run, jobs)
  console.log(`${run.html_url} ${run.event} ${run.head_sha} ${run.conclusion}`)
  console.log("job\tqueue minutes\trun minutes\tconclusion")
  for (const job of result.jobs) {
    console.log(`${job.name}\t${minutes(job.queue)}\t${minutes(job.execution)}\t${job.conclusion}`)
  }
  console.log(`Critical path: ${result.critical.join(" → ")}`)
  console.log(`Trigger → last check: ${minutes(result.elapsed)}m = ${minutes(result.waiting)}m waiting + ${minutes(result.execution)}m executing`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv.slice(2))
}

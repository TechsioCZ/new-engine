import { appendFileSync, mkdirSync } from "node:fs"
import path from "node:path"

/**
 * Persist one scan without reading or rewriting another worker's results.
 * The summary is generated once, after all workers have exited.
 * @param {string} output
 * @param {{storyId: string, title: string, name: string, url: string, parameters: unknown, results: unknown}} entry
 */
export function recordA11yResult(output, entry) {
  mkdirSync(output, { recursive: true })
  appendFileSync(
    path.join(output, "report.ndjson"),
    Buffer.from(`${JSON.stringify(entry)}\n`)
  )
}

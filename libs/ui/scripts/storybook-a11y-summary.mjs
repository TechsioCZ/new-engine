#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"

/**
 * Read a CLI argument value following the given flag.
 * @param {string} name
 * @returns {string | null}
 */
function readArg(name) {
  const direct = process.argv.find((arg) => arg.startsWith(`${name}=`))
  if (direct) {
    return direct.slice(name.length + 1)
  }
  const index = process.argv.indexOf(name)
  if (index === -1 || index + 1 >= process.argv.length) return null
  return process.argv[index + 1]
}

const inputPath = readArg("--input")
const outputPath = readArg("--output")
const baselinePath = readArg("--baseline")
const baselineLabel = readArg("--baseline-label") ?? "baseline"

if (!inputPath || !outputPath) {
  console.error(
    "Usage: storybook-a11y-summary.mjs --input <report.json> --output <summary.md> [--baseline <report.json>] [--baseline-label <label>]"
  )
  process.exit(1)
}

/**
 * Load and validate a report file.
 * @param {string} path
 * @param {string} label
 * @returns {any[]}
 */
function loadNdjson(path, label) {
  let raw
  try {
    raw = fs.readFileSync(path, "utf8")
  } catch (err) {
    throw new Error(`Failed to read ${label} file: ${path}`, { cause: err })
  }

  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0)
  return lines.map((line, index) => {
    try {
      return JSON.parse(line)
    } catch (err) {
      throw new Error(
        `Failed to parse NDJSON line ${index + 1} from ${label} file: ${path}`,
        {
          cause: err,
        }
      )
    }
  })
}

function loadReport(path, label) {
  if (path.toLowerCase().endsWith(".ndjson")) {
    return loadNdjson(path, label)
  }

  let raw
  try {
    raw = fs.readFileSync(path, "utf8")
  } catch (err) {
    throw new Error(`Failed to read ${label} file: ${path}`, { cause: err })
  }

  let data
  try {
    data = JSON.parse(raw)
  } catch (err) {
    const ndjsonPath = path.replace(/\.json$/i, ".ndjson")
    if (ndjsonPath !== path && fs.existsSync(ndjsonPath)) {
      console.warn(
        `JSON parse failed for ${label}; falling back to ${ndjsonPath}.`
      )
      return loadNdjson(ndjsonPath, label)
    }
    throw new Error(`Failed to parse JSON from ${label} file: ${path}`, {
      cause: err,
    })
  }

  if (!Array.isArray(data)) {
    const ndjsonPath = path.replace(/\.json$/i, ".ndjson")
    if (ndjsonPath !== path && fs.existsSync(ndjsonPath)) {
      console.warn(
        `Unexpected JSON shape for ${label}; falling back to ${ndjsonPath}.`
      )
      return loadNdjson(ndjsonPath, label)
    }
    throw new Error(`Expected ${label} report.json to be an array of stories.`)
  }

  return data
}

let data
try {
  data = loadReport(inputPath, "input")
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
}

let baselineData = null
let baselineError = null
if (baselinePath) {
  try {
    baselineData = loadReport(baselinePath, `baseline (${baselineLabel})`)
  } catch (err) {
    baselineError = err instanceof Error ? err.message : String(err)
    baselineData = null
  }
}

/**
 * Identify APCA-related violations by id or tags.
 * @param {{id?: string, tags?: string[]}} violation
 * @returns {boolean}
 */
function isApcaViolation(violation) {
  const id = String(violation?.id ?? "").toLowerCase()
  const tags = Array.isArray(violation?.tags)
    ? violation.tags.map((tag) => String(tag).toLowerCase())
    : []
  return id.includes("apca") || tags.some((tag) => tag.includes("apca"))
}

/**
 * Escape pipe characters for Markdown tables.
 * @param {string} value
 * @returns {string}
 */
function escapePipes(value) {
  return String(value)
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\|/g, "\\|")
    .trim()
}

const KEY_SEPARATOR = "\x00"

/**
 * Summarize a report for full output.
 * @param {any[]} report
 */
function summarizeReport(report) {
  const groupStats = new Map()
  const storyRows = []

  let totalStories = report.length
  let storiesWithViolations = 0
  let totalViolations = 0
  let apcaViolations = 0

  for (const story of report) {
    const title = story?.title ?? "Unknown"
    const name = story?.name ?? story?.storyId ?? "Unknown"
    const violations = story?.results?.violations ?? []
    const violationCount = violations.length
    const apcaCount = violations.filter(isApcaViolation).length

    totalViolations += violationCount
    apcaViolations += apcaCount
    if (violationCount > 0) {
      storiesWithViolations += 1
    }

    const groupName = String(title).split("/")[0]?.trim() || "Other"
    const group = groupStats.get(groupName) ?? {
      stories: 0,
      storiesWithViolations: 0,
      violations: 0,
      apca: 0,
    }
    group.stories += 1
    group.violations += violationCount
    group.apca += apcaCount
    if (violationCount > 0) {
      group.storiesWithViolations += 1
    }
    groupStats.set(groupName, group)

    storyRows.push({
      story: `${title} / ${name}`,
      violations: violationCount,
      apca: apcaCount,
    })
  }

  return {
    totalStories,
    storiesWithViolations,
    totalViolations,
    apcaViolations,
    groupStats,
    storyRows,
  }
}

/**
 * Collect violation instances for diffing.
 * @param {any[]} report
 */
function collectViolations(report) {
  const entries = []

  for (const story of report) {
    const title = story?.title ?? "Unknown"
    const name = story?.name ?? story?.storyId ?? "Unknown"
    const storyKey = `${title} / ${name}`
    const group = String(title).split("/")[0]?.trim() || "Other"
    const violations = story?.results?.violations ?? []

    for (const violation of violations) {
      const id = violation?.id ?? "unknown"
      const impact = violation?.impact ?? "unknown"
      const apca = isApcaViolation(violation)
      const key = `${storyKey}${KEY_SEPARATOR}${id}`
      entries.push({ key, story: storyKey, group, id, impact, apca })
    }
  }

  return entries
}

/**
 * Build the full summary output.
 * @param {ReturnType<typeof summarizeReport>} summary
 * @param {string | null} notice
 */
function buildFullSummaryLines(summary, notice) {
  const lines = []
  lines.push("# Storybook A11y Report")
  lines.push("")
  if (notice) {
    lines.push(`> ${notice}`)
    lines.push("")
  }
  lines.push(`- Total stories: ${summary.totalStories}`)
  lines.push(`- Stories with violations: ${summary.storiesWithViolations}`)
  lines.push(`- Total violations: ${summary.totalViolations}`)
  lines.push(`- APCA violations: ${summary.apcaViolations}`)
  lines.push("")
  lines.push("## By group")
  lines.push("")
  lines.push("| Group | Stories | Stories w/ violations | Violations | APCA |")
  lines.push("| --- | --- | --- | --- | --- |")

  const sortedGroups = Array.from(summary.groupStats.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  )
  for (const [groupName, stats] of sortedGroups) {
    lines.push(
      `| ${escapePipes(groupName)} | ${stats.stories} | ${stats.storiesWithViolations} | ${stats.violations} | ${stats.apca} |`
    )
  }

  const violatingRows = summary.storyRows
    .filter((row) => row.violations > 0)
    .sort((a, b) => {
      if (b.violations !== a.violations) return b.violations - a.violations
      if (b.apca !== a.apca) return b.apca - a.apca
      return a.story.localeCompare(b.story)
    })

  lines.push("")

  if (violatingRows.length === 0) {
    lines.push("No violations found.")
  } else {
    lines.push("<details>")
    lines.push("<summary>Stories with violations</summary>")
    lines.push("")
    lines.push("| Story | Violations | APCA |")
    lines.push("| --- | --- | --- |")
    for (const row of violatingRows) {
      lines.push(
        `| ${escapePipes(row.story)} | ${row.violations} | ${row.apca} |`
      )
    }
    lines.push("")
    lines.push("</details>")
  }

  return lines
}

/**
 * Build the delta summary output.
 * @param {any[]} currentReport
 * @param {any[]} baselineReport
 * @param {string} label
 */
function buildDeltaLines(currentReport, baselineReport, label) {
  const currentEntries = collectViolations(currentReport)
  const baselineEntries = collectViolations(baselineReport)

  const baselineMap = new Map(
    baselineEntries.map((entry) => [entry.key, entry])
  )
  const currentMap = new Map(currentEntries.map((entry) => [entry.key, entry]))

  const newEntries = currentEntries.filter(
    (entry) => !baselineMap.has(entry.key)
  )
  const resolvedEntries = baselineEntries.filter(
    (entry) => !currentMap.has(entry.key)
  )

  const newApca = newEntries.filter((entry) => entry.apca).length
  const resolvedApca = resolvedEntries.filter((entry) => entry.apca).length

  const groupStats = new Map()
  const addGroupStats = (entry, type) => {
    const group = groupStats.get(entry.group) ?? {
      newCount: 0,
      newApca: 0,
      resolvedCount: 0,
      resolvedApca: 0,
    }
    if (type === "new") {
      group.newCount += 1
      if (entry.apca) group.newApca += 1
    } else {
      group.resolvedCount += 1
      if (entry.apca) group.resolvedApca += 1
    }
    groupStats.set(entry.group, group)
  }

  for (const entry of newEntries) addGroupStats(entry, "new")
  for (const entry of resolvedEntries) addGroupStats(entry, "resolved")

  const buildStoryRows = (entries) => {
    const map = new Map()
    for (const entry of entries) {
      const stats = map.get(entry.story) ?? {
        story: entry.story,
        violations: 0,
        apca: 0,
      }
      stats.violations += 1
      if (entry.apca) stats.apca += 1
      map.set(entry.story, stats)
    }
    return Array.from(map.values()).sort((a, b) => {
      if (b.violations !== a.violations) return b.violations - a.violations
      if (b.apca !== a.apca) return b.apca - a.apca
      return a.story.localeCompare(b.story)
    })
  }

  const newStoryRows = buildStoryRows(newEntries)
  const resolvedStoryRows = buildStoryRows(resolvedEntries)

  const lines = []
  lines.push(`# Storybook A11y Report (Delta vs ${label})`)
  lines.push("")
  lines.push(`- New violations: ${newEntries.length} (APCA: ${newApca})`)
  lines.push(
    `- Resolved violations: ${resolvedEntries.length} (APCA: ${resolvedApca})`
  )
  lines.push(
    `- Net change: ${newEntries.length - resolvedEntries.length} (APCA: ${newApca - resolvedApca})`
  )
  lines.push("")

  if (groupStats.size === 0) {
    lines.push("No changes detected against baseline.")
    return lines
  }

  lines.push("## By group")
  lines.push("")
  lines.push("| Group | New | New APCA | Resolved | Resolved APCA |")
  lines.push("| --- | --- | --- | --- | --- |")

  const sortedGroups = Array.from(groupStats.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  )
  for (const [groupName, stats] of sortedGroups) {
    lines.push(
      `| ${escapePipes(groupName)} | ${stats.newCount} | ${stats.newApca} | ${stats.resolvedCount} | ${stats.resolvedApca} |`
    )
  }

  lines.push("")

  if (newStoryRows.length > 0) {
    lines.push("<details>")
    lines.push(`<summary>New violations (${newEntries.length})</summary>`)
    lines.push("")
    lines.push("| Story | Violations | APCA |")
    lines.push("| --- | --- | --- |")
    for (const row of newStoryRows) {
      lines.push(
        `| ${escapePipes(row.story)} | ${row.violations} | ${row.apca} |`
      )
    }
    lines.push("")
    lines.push("</details>")
    lines.push("")
  }

  if (resolvedStoryRows.length > 0) {
    lines.push("<details>")
    lines.push(
      `<summary>Resolved violations (${resolvedEntries.length})</summary>`
    )
    lines.push("")
    lines.push("| Story | Violations | APCA |")
    lines.push("| --- | --- | --- |")
    for (const row of resolvedStoryRows) {
      lines.push(
        `| ${escapePipes(row.story)} | ${row.violations} | ${row.apca} |`
      )
    }
    lines.push("")
    lines.push("</details>")
  }

  return lines
}

const summary = summarizeReport(data)
if (baselineError) {
  console.error(baselineError)
}
const notice =
  baselinePath && !baselineData
    ? "Baseline report not available; showing full report."
    : null
const lines = baselineData
  ? buildDeltaLines(data, baselineData, baselineLabel)
  : buildFullSummaryLines(summary, notice)

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8")

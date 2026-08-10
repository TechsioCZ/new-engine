#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"

import { getRecordValue, isRecord } from "@techsio/std/object"

interface Violation {
  apca: boolean
  id: string
  impact: string
}

interface ReportStory {
  group: string
  story: string
  violations: Violation[]
}

interface GroupStats {
  apca: number
  stories: number
  storiesWithViolations: number
  violations: number
}

interface StoryRow {
  apca: number
  story: string
  violations: number
}

interface ReportSummary {
  apcaViolations: number
  groupStats: Map<string, GroupStats>
  storiesWithViolations: number
  storyRows: StoryRow[]
  totalStories: number
  totalViolations: number
}

interface ViolationEntry extends Violation {
  group: string
  key: string
  story: string
}

interface DeltaGroupStats {
  newApca: number
  newCount: number
  resolvedApca: number
  resolvedCount: number
}

const KEY_SEPARATOR = "\u0000"
const UNKNOWN_LABEL = "Unknown"
const OTHER_GROUP = "Other"
const DETAILS_CLOSE = "</details>"
const STORY_TABLE_HEADER = "| Story | Violations | APCA |"
const STORY_TABLE_SEPARATOR = "| --- | --- | --- |"

const readArg = (name: string): string | null => {
  const direct = process.argv.find((argument) =>
    argument.startsWith(`${name}=`),
  )
  if (direct !== undefined) {
    return direct.slice(name.length + 1)
  }
  const index = process.argv.indexOf(name)
  if (index === -1 || index + 1 >= process.argv.length) {
    return null
  }
  return process.argv[index + 1] ?? null
}

const inputPath = readArg("--input")
const outputPath = readArg("--output")
const baselinePath = readArg("--baseline")
const baselineLabel = readArg("--baseline-label") ?? "baseline"

if (inputPath === null || outputPath === null) {
  console.error(
    "Usage: storybook-a11y-summary.mts --input <report.json> --output <summary.md> [--baseline <report.json>] [--baseline-label <label>]",
  )
  process.exit(1)
}

const displayString = (value: unknown, fallback: string): string => {
  if (value === null || value === undefined) {
    return fallback
  }
  if (typeof value === "string") {
    return value
  }
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value)
  }
  return JSON.stringify(value) ?? fallback
}

const displayStrings = (values: unknown[]): string[] =>
  values.map((value) => displayString(value, ""))

const isApcaViolation = (id: string, tags: string[]): boolean =>
  id.toLowerCase().includes("apca") ||
  tags.some((tag) => tag.toLowerCase().includes("apca"))

const normalizeViolation = (value: unknown): Violation => {
  const violation = isRecord(value) ? value : {}
  const id = displayString(getRecordValue(violation, "id"), "unknown")
  const tagsValue = getRecordValue(violation, "tags")
  const tags = Array.isArray(tagsValue) ? displayStrings(tagsValue) : []

  return {
    apca: isApcaViolation(id, tags),
    id,
    impact: displayString(getRecordValue(violation, "impact"), "unknown"),
  }
}

const normalizeStory = (value: unknown): ReportStory => {
  const story = isRecord(value) ? value : {}
  const title = displayString(getRecordValue(story, "title"), UNKNOWN_LABEL)
  const name = displayString(
    getRecordValue(story, "name") ?? getRecordValue(story, "storyId"),
    UNKNOWN_LABEL,
  )
  const resultsValue = getRecordValue(story, "results")
  const results = isRecord(resultsValue) ? resultsValue : {}
  const violationValues = getRecordValue(results, "violations") ?? []

  if (!Array.isArray(violationValues)) {
    throw new TypeError(
      `Expected violations for ${title} / ${name} to be an array.`,
    )
  }

  const group = title.split("/")[0]?.trim()

  return {
    group: group === undefined || group.length === 0 ? OTHER_GROUP : group,
    story: `${title} / ${name}`,
    violations: violationValues.map(normalizeViolation),
  }
}

const normalizeReport = (value: unknown, label: string): ReportStory[] => {
  if (!Array.isArray(value)) {
    throw new TypeError(
      `Expected ${label} report.json to be an array of stories.`,
    )
  }

  return value.map(normalizeStory)
}

const parseJson = (raw: string): unknown => JSON.parse(raw)

const loadNdjson = (filePath: string, label: string): ReportStory[] => {
  let raw: string
  try {
    raw = fs.readFileSync(filePath, "utf-8")
  } catch (error) {
    throw new Error(`Failed to read ${label} file: ${filePath}`, {
      cause: error,
    })
  }

  const lines = raw.split(/\r?\n/u).filter((line) => line.trim().length > 0)
  const stories = lines.map((line, index) => {
    try {
      return parseJson(line)
    } catch (error) {
      throw new Error(
        `Failed to parse NDJSON line ${index + 1} from ${label} file: ${filePath}`,
        { cause: error },
      )
    }
  })

  return stories.map(normalizeStory)
}

const loadReport = (filePath: string, label: string): ReportStory[] => {
  if (filePath.toLowerCase().endsWith(".ndjson")) {
    return loadNdjson(filePath, label)
  }

  let raw: string
  try {
    raw = fs.readFileSync(filePath, "utf-8")
  } catch (error) {
    throw new Error(`Failed to read ${label} file: ${filePath}`, {
      cause: error,
    })
  }

  let data: unknown
  try {
    data = parseJson(raw)
  } catch (error) {
    const ndjsonPath = filePath.replace(/\.json$/iu, ".ndjson")
    if (ndjsonPath !== filePath && fs.existsSync(ndjsonPath)) {
      console.warn(
        `JSON parse failed for ${label}; falling back to ${ndjsonPath}.`,
      )
      return loadNdjson(ndjsonPath, label)
    }
    throw new Error(`Failed to parse JSON from ${label} file: ${filePath}`, {
      cause: error,
    })
  }

  if (!Array.isArray(data)) {
    const ndjsonPath = filePath.replace(/\.json$/iu, ".ndjson")
    if (ndjsonPath !== filePath && fs.existsSync(ndjsonPath)) {
      console.warn(
        `Unexpected JSON shape for ${label}; falling back to ${ndjsonPath}.`,
      )
      return loadNdjson(ndjsonPath, label)
    }
  }

  return normalizeReport(data, label)
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

let data: ReportStory[]
try {
  data = loadReport(inputPath, "input")
} catch (error) {
  console.error(errorMessage(error))
  process.exit(1)
}

let baselineData: ReportStory[] | null = null
let baselineError: string | null = null
if (baselinePath !== null) {
  try {
    baselineData = loadReport(baselinePath, `baseline (${baselineLabel})`)
  } catch (error) {
    baselineError = errorMessage(error)
  }
}

const escapePipes = (value: string): string =>
  value
    .replaceAll(/\r?\n/gu, " ")
    .replaceAll(/\s+/gu, " ")
    .replaceAll("|", "\\|")
    .trim()

const summarizeReport = (report: ReportStory[]): ReportSummary => {
  const groupStats = new Map<string, GroupStats>()
  const storyRows: StoryRow[] = []

  let storiesWithViolations = 0
  let totalViolations = 0
  let apcaViolations = 0

  for (const story of report) {
    const violationCount = story.violations.length
    const apcaCount = story.violations.filter(
      (violation) => violation.apca,
    ).length

    totalViolations += violationCount
    apcaViolations += apcaCount
    if (violationCount > 0) {
      storiesWithViolations += 1
    }

    const group = groupStats.get(story.group) ?? {
      apca: 0,
      stories: 0,
      storiesWithViolations: 0,
      violations: 0,
    }
    group.stories += 1
    group.violations += violationCount
    group.apca += apcaCount
    if (violationCount > 0) {
      group.storiesWithViolations += 1
    }
    groupStats.set(story.group, group)

    storyRows.push({
      apca: apcaCount,
      story: story.story,
      violations: violationCount,
    })
  }

  return {
    apcaViolations,
    groupStats,
    storiesWithViolations,
    storyRows,
    totalStories: report.length,
    totalViolations,
  }
}

const collectViolations = (report: ReportStory[]): ViolationEntry[] => {
  const entries: ViolationEntry[] = []

  for (const story of report) {
    for (const violation of story.violations) {
      entries.push({
        ...violation,
        group: story.group,
        key: `${story.story}${KEY_SEPARATOR}${violation.id}`,
        story: story.story,
      })
    }
  }

  return entries
}

const compareStoryRows = (left: StoryRow, right: StoryRow): number => {
  if (right.violations !== left.violations) {
    return right.violations - left.violations
  }
  if (right.apca !== left.apca) {
    return right.apca - left.apca
  }
  return left.story.localeCompare(right.story)
}

const buildStoryRows = (entries: ViolationEntry[]): StoryRow[] => {
  const map = new Map<string, StoryRow>()
  for (const entry of entries) {
    const stats = map.get(entry.story) ?? {
      apca: 0,
      story: entry.story,
      violations: 0,
    }
    stats.violations += 1
    if (entry.apca) {
      stats.apca += 1
    }
    map.set(entry.story, stats)
  }
  return [...map.values()].toSorted(compareStoryRows)
}

const appendStoryDetails = (
  lines: string[],
  summary: string,
  rows: StoryRow[],
): void => {
  lines.push(
    "<details>",
    `<summary>${summary}</summary>`,
    "",
    STORY_TABLE_HEADER,
    STORY_TABLE_SEPARATOR,
  )
  for (const row of rows) {
    lines.push(
      `| ${escapePipes(row.story)} | ${row.violations} | ${row.apca} |`,
    )
  }
  lines.push("", DETAILS_CLOSE)
}

const buildFullSummaryLines = (
  summary: ReportSummary,
  notice: string | null,
): string[] => {
  const lines = ["# Storybook A11y Report", ""]
  if (notice !== null) {
    lines.push(`> ${notice}`, "")
  }
  lines.push(
    `- Total stories: ${summary.totalStories}`,
    `- Stories with violations: ${summary.storiesWithViolations}`,
    `- Total violations: ${summary.totalViolations}`,
    `- APCA violations: ${summary.apcaViolations}`,
    "",
    "## By group",
    "",
    "| Group | Stories | Stories w/ violations | Violations | APCA |",
    "| --- | --- | --- | --- | --- |",
  )

  const sortedGroups = [...summary.groupStats.entries()].toSorted(
    (left, right) => left[0].localeCompare(right[0]),
  )
  for (const [groupName, stats] of sortedGroups) {
    lines.push(
      `| ${escapePipes(groupName)} | ${stats.stories} | ${stats.storiesWithViolations} | ${stats.violations} | ${stats.apca} |`,
    )
  }

  const violatingRows = summary.storyRows
    .filter((row) => row.violations > 0)
    .toSorted(compareStoryRows)

  lines.push("")

  if (violatingRows.length === 0) {
    lines.push("No violations found.")
  } else {
    appendStoryDetails(lines, "Stories with violations", violatingRows)
  }

  return lines
}

const addGroupStats = (
  groupStats: Map<string, DeltaGroupStats>,
  entry: ViolationEntry,
  type: "new" | "resolved",
): void => {
  const group = groupStats.get(entry.group) ?? {
    newApca: 0,
    newCount: 0,
    resolvedApca: 0,
    resolvedCount: 0,
  }
  if (type === "new") {
    group.newCount += 1
    if (entry.apca) {
      group.newApca += 1
    }
  } else {
    group.resolvedCount += 1
    if (entry.apca) {
      group.resolvedApca += 1
    }
  }
  groupStats.set(entry.group, group)
}

const buildDeltaLines = (
  currentReport: ReportStory[],
  baselineReport: ReportStory[],
  label: string,
): string[] => {
  const currentEntries = collectViolations(currentReport)
  const baselineEntries = collectViolations(baselineReport)

  const baselineMap = new Map(
    baselineEntries.map((entry) => [entry.key, entry]),
  )
  const currentMap = new Map(currentEntries.map((entry) => [entry.key, entry]))

  const newEntries = currentEntries.filter(
    (entry) => !baselineMap.has(entry.key),
  )
  const resolvedEntries = baselineEntries.filter(
    (entry) => !currentMap.has(entry.key),
  )

  const newApca = newEntries.filter((entry) => entry.apca).length
  const resolvedApca = resolvedEntries.filter((entry) => entry.apca).length

  const groupStats = new Map<string, DeltaGroupStats>()
  for (const entry of newEntries) {
    addGroupStats(groupStats, entry, "new")
  }
  for (const entry of resolvedEntries) {
    addGroupStats(groupStats, entry, "resolved")
  }

  const newStoryRows = buildStoryRows(newEntries)
  const resolvedStoryRows = buildStoryRows(resolvedEntries)

  const lines = [
    `# Storybook A11y Report (Delta vs ${label})`,
    "",
    `- New violations: ${newEntries.length} (APCA: ${newApca})`,
    `- Resolved violations: ${resolvedEntries.length} (APCA: ${resolvedApca})`,
    `- Net change: ${newEntries.length - resolvedEntries.length} (APCA: ${newApca - resolvedApca})`,
    "",
  ]

  if (groupStats.size === 0) {
    lines.push("No changes detected against baseline.")
    return lines
  }

  lines.push(
    "## By group",
    "",
    "| Group | New | New APCA | Resolved | Resolved APCA |",
    "| --- | --- | --- | --- | --- |",
  )

  const sortedGroups = [...groupStats.entries()].toSorted((left, right) =>
    left[0].localeCompare(right[0]),
  )
  for (const [groupName, stats] of sortedGroups) {
    lines.push(
      `| ${escapePipes(groupName)} | ${stats.newCount} | ${stats.newApca} | ${stats.resolvedCount} | ${stats.resolvedApca} |`,
    )
  }

  lines.push("")

  if (newStoryRows.length > 0) {
    appendStoryDetails(
      lines,
      `New violations (${newEntries.length})`,
      newStoryRows,
    )
    lines.push("")
  }

  if (resolvedStoryRows.length > 0) {
    appendStoryDetails(
      lines,
      `Resolved violations (${resolvedEntries.length})`,
      resolvedStoryRows,
    )
  }

  return lines
}

const summary = summarizeReport(data)
if (baselineError !== null) {
  console.error(baselineError)
}
const notice =
  baselinePath !== null && baselineData === null
    ? "Baseline report not available; showing full report."
    : null
const lines =
  baselineData === null
    ? buildFullSummaryLines(summary, notice)
    : buildDeltaLines(data, baselineData, baselineLabel)

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf-8")

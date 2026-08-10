#!/usr/bin/env node

import fs from "node:fs"
import process from "node:process"

import { getRecordValue, isRecord } from "@techsio/std/object"

/** @typedef {"light" | "dark"} Theme */
/** @typedef {{ dark: ThemeData, light: ThemeData }} Themes */
/** @type {Theme[]} */
const THEMES = ["light", "dark"]
const KEY_SEPARATOR = "\u0000"
const FALLBACK_TARGET = "__violation__"

/**
 * @typedef {object} Entry
 * @property {number} count - Number of matching violation nodes.
 * @property {string} id - Accessibility rule identifier.
 * @property {string} story - Human-readable story name.
 * @property {string} storyId - Stable Storybook story identifier.
 * @property {string} target - Serialized violation target.
 */

/**
 * @typedef {object} ThemeData
 * @property {Entry[]} entries - Normalized violation entries.
 * @property {number} stories - Number of covered stories.
 * @property {string[]} storyIds - Stable covered story identifiers.
 * @property {number} violations - Total violation node count.
 */

/**
 * @typedef {object} ThemeResult
 * @property {number} baselineStories - Baseline story count.
 * @property {number} baselineViolations - Baseline violation node count.
 * @property {number} currentStories - Current story count.
 * @property {number} currentViolations - Current violation node count.
 * @property {string[]} missingStoryIds - Baseline stories absent from the report.
 * @property {Entry[]} newEntries - Violation entries added since the baseline.
 * @property {number} newViolations - Added violation node count.
 * @property {Entry[]} resolvedEntries - Violation entries removed since the baseline.
 * @property {number} resolvedViolations - Removed violation node count.
 * @property {string} theme - Compared theme name.
 */

/**
 * @param {unknown} value - External value to convert.
 * @param {string} fallback - Text used for unsupported values.
 * @returns {string} A stable string representation.
 */
const toText = (value, fallback) => {
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
  return fallback
}

/**
 * @returns {string[]} Validated command-line arguments.
 */
const getArguments = () => process.argv

/**
 * @param {number} code - Process exit code.
 * @returns {never} This function does not return.
 */
const exitProcess = (code) => {
  process.exit(code)
}

/**
 * @param {string} content - Content to write.
 */
const writeStandardOutput = (content) => {
  process.stdout.write(content)
}

/**
 * @returns {string | undefined} GitHub Actions step-summary path, when configured.
 */
const getStepSummaryPath = () => process.env.GITHUB_STEP_SUMMARY

/**
 * @param {string} filePath - File to read.
 * @returns {string} UTF-8 file contents.
 */
const readTextFile = (filePath) => fs.readFileSync(filePath, "utf-8")

/**
 * @param {string} filePath - File to write.
 * @param {string} content - Complete file contents.
 */
const writeTextFile = (filePath, content) => {
  fs.writeFileSync(filePath, content)
}

/**
 * @param {string} filePath - File to append.
 * @param {string} content - Content to append.
 */
const appendTextFile = (filePath, content) => {
  fs.appendFileSync(filePath, content)
}

/**
 * @param {string} directory - Directory to inspect.
 * @returns {import("node:fs").Dirent[]} Directory entries.
 */
const readDirectory = (directory) =>
  fs.readdirSync(directory, { withFileTypes: true })

/**
 * @param {string} name - Command-line argument name.
 * @returns {string | null} Argument value, when present.
 */
const readArg = (name) => {
  const commandArguments = getArguments()
  const direct = commandArguments.find((argument) =>
    argument.startsWith(`${name}=`),
  )
  if (direct !== undefined) {
    return direct.slice(name.length + 1)
  }
  const index = commandArguments.indexOf(name)
  return index === -1 ? null : (commandArguments[index + 1] ?? null)
}

/**
 * @param {string} name - Command-line flag name.
 * @returns {boolean} Whether the flag is present.
 */
const hasFlag = (name) => getArguments().includes(name)

/**
 * @param {string} filePath - JSON file to load.
 * @param {string} label - Human-readable data label.
 * @returns {unknown} Parsed JSON data.
 */
const loadJson = (filePath, label) => {
  try {
    /** @type {unknown} */
    const parsed = JSON.parse(readTextFile(filePath))
    return parsed
  } catch (error) {
    throw new Error(`Failed to load ${label}: ${filePath}`, { cause: error })
  }
}

/**
 * @param {string} root - Report search root.
 * @param {string} theme - Theme directory name.
 * @returns {string} Unique matching report path.
 */
const findThemeReport = (root, theme) => {
  /** @type {string[]} */
  const matches = []

  /**
   * @param {string} directory - Directory to visit.
   */
  const visit = (directory) => {
    const entries = readDirectory(directory)
    entries.sort((left, right) => left.name.localeCompare(right.name))
    for (const entry of entries) {
      const { name } = entry
      const entryPath = `${directory}/${name}`
      if (entry.isDirectory() && name !== "baseline") {
        visit(entryPath)
      } else if (
        name === "report.json" &&
        entryPath.split("/").at(-2) === theme
      ) {
        matches.push(entryPath)
      }
    }
  }

  visit(root)
  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one ${theme}/report.json below ${root}; found ${matches.length}.`,
    )
  }
  const [match] = matches
  if (match === undefined) {
    throw new Error(`Unable to resolve the ${theme} report below ${root}.`)
  }
  return match
}

/**
 * @param {unknown} target - Violation target value.
 * @returns {string} Stable target fingerprint.
 */
const normalizeTarget = (target) =>
  Array.isArray(target) ? JSON.stringify(target) : FALLBACK_TARGET

/**
 * @param {unknown} value - Raw story value.
 * @param {string} theme - Theme being processed.
 * @returns {{ storyId: string, storyName: string, violations: unknown[] }} Validated story details.
 */
const parseStory = (value, theme) => {
  const story = isRecord(value) ? value : {}
  const title = toText(getRecordValue(story, "title"), "Unknown")
  const name = toText(
    getRecordValue(story, "name") ?? getRecordValue(story, "storyId"),
    "Unknown",
  )
  const storyName = `${title} / ${name}`
  const storyId = toText(getRecordValue(story, "storyId"), storyName)
  const rawResults = getRecordValue(story, "results")
  const results = isRecord(rawResults) ? rawResults : {}
  const violations = getRecordValue(results, "violations") ?? []
  if (!Array.isArray(violations)) {
    throw new TypeError(
      `${theme} report contains invalid violations for ${storyName}.`,
    )
  }
  return { storyId, storyName, violations }
}

/**
 * @param {unknown} value - Raw violation value.
 * @returns {{ id: string, targets: string[] }} Validated violation details.
 */
const parseViolation = (value) => {
  const violation = isRecord(value) ? value : {}
  const id = toText(getRecordValue(violation, "id"), "unknown")
  const rawNodes = getRecordValue(violation, "nodes")
  const nodes = Array.isArray(rawNodes) ? rawNodes : []
  if (nodes.length === 0) {
    return { id, targets: [FALLBACK_TARGET] }
  }
  const targets = nodes.map((node) => {
    const nodeRecord = isRecord(node) ? node : {}
    return normalizeTarget(getRecordValue(nodeRecord, "target"))
  })
  return { id, targets }
}

/**
 * @param {Entry} left - Left entry.
 * @param {Entry} right - Right entry.
 * @returns {number} Sort comparison result.
 */
const compareEntries = (left, right) => {
  const storyComparison = left.story.localeCompare(right.story)
  if (storyComparison !== 0) {
    return storyComparison
  }
  const idComparison = left.id.localeCompare(right.id)
  return idComparison === 0
    ? left.target.localeCompare(right.target)
    : idComparison
}

/**
 * @param {unknown} report - Raw theme report.
 * @param {string} theme - Theme name.
 * @returns {ThemeData} Normalized theme data.
 */
const collectTheme = (report, theme) => {
  if (!Array.isArray(report)) {
    throw new TypeError(`${theme} report must be an array of stories.`)
  }

  /** @type {Map<string, Entry>} */
  const counts = new Map()
  /** @type {Set<string>} */
  const storyIds = new Set()
  let violations = 0

  for (const storyValue of report) {
    const {
      storyId,
      storyName,
      violations: storyViolations,
    } = parseStory(storyValue, theme)
    storyIds.add(storyId)

    for (const violationValue of storyViolations) {
      const { id, targets } = parseViolation(violationValue)
      violations += targets.length
      for (const target of targets) {
        const key = [storyId, id, target].join(KEY_SEPARATOR)
        const current = counts.get(key)
        counts.set(key, {
          count: (current?.count ?? 0) + 1,
          id,
          story: storyName,
          storyId,
          target,
        })
      }
    }
  }

  /** @type {Entry[]} */
  const entries = []
  for (const entry of counts.values()) {
    entries.push(entry)
  }
  /** @type {string[]} */
  const sortedStoryIds = []
  for (const storyId of storyIds) {
    sortedStoryIds.push(storyId)
  }

  entries.sort(compareEntries)
  sortedStoryIds.sort((left, right) => left.localeCompare(right))

  return {
    entries,
    stories: storyIds.size,
    storyIds: sortedStoryIds,
    violations,
  }
}

/**
 * @param {string} reportRoot - Report search root.
 * @returns {Themes} Theme data keyed by theme.
 */
const loadReports = (reportRoot) => ({
  dark: collectTheme(
    loadJson(findThemeReport(reportRoot, "dark"), "dark report"),
    "dark",
  ),
  light: collectTheme(
    loadJson(findThemeReport(reportRoot, "light"), "light report"),
    "light",
  ),
})

/**
 * @param {string} baselinePath - Baseline output path.
 * @param {Themes} themes - Normalized theme data.
 */
const writeBaseline = (baselinePath, themes) => {
  const baseline = {
    description:
      "Known Storybook accessibility violation nodes. CI rejects new node fingerprints and lost story coverage while reporting this debt.",
    themes,
    version: 2,
  }
  // Compact on purpose: the committed baseline holds ~13k violation entries
  // and pretty-printing turns it into ~90k diff lines on every regeneration.
  writeTextFile(baselinePath, `${JSON.stringify(baseline)}\n`)
}

/**
 * @param {Entry} entry - Normalized entry.
 * @returns {string} Stable entry key.
 */
const entryKey = (entry) =>
  [entry.storyId, entry.id, entry.target].join(KEY_SEPARATOR)

/**
 * @param {unknown} value - Numeric value candidate.
 * @param {string} label - Human-readable value label.
 * @returns {number} Validated finite number.
 */
const parseNumber = (value, label) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    throw new TypeError(`${label} must be a finite number.`)
  }
  return parsed
}

/**
 * @param {unknown} value - Raw baseline entry.
 * @param {string} label - Human-readable entry label.
 * @returns {Entry} Validated baseline entry.
 */
const parseEntry = (value, label) => {
  if (!isRecord(value)) {
    throw new TypeError(`${label} must be an object.`)
  }
  return {
    count: parseNumber(getRecordValue(value, "count"), `${label} count`),
    id: toText(getRecordValue(value, "id"), "undefined"),
    story: toText(getRecordValue(value, "story"), "undefined"),
    storyId: toText(getRecordValue(value, "storyId"), "undefined"),
    target: toText(getRecordValue(value, "target"), "undefined"),
  }
}

/**
 * @param {unknown} value - Raw baseline theme.
 * @param {string} theme - Theme name.
 * @returns {ThemeData} Validated baseline theme.
 */
const parseBaselineTheme = (value, theme) => {
  if (!isRecord(value)) {
    throw new TypeError(`Baseline is missing valid ${theme} data.`)
  }
  const entries = getRecordValue(value, "entries")
  const storyIds = getRecordValue(value, "storyIds")
  if (!Array.isArray(entries) || !Array.isArray(storyIds)) {
    throw new TypeError(
      `Baseline is missing valid ${theme} entries or story IDs.`,
    )
  }
  return {
    entries: entries.map((entry, index) =>
      parseEntry(entry, `${theme} baseline entry ${index}`),
    ),
    stories: parseNumber(
      getRecordValue(value, "stories"),
      `${theme} baseline stories`,
    ),
    storyIds: storyIds.map(String),
    violations: parseNumber(
      getRecordValue(value, "violations"),
      `${theme} baseline violations`,
    ),
  }
}

/**
 * @param {unknown} value - Raw baseline document.
 * @returns {Themes} Validated themes keyed by name.
 */
const parseBaseline = (value) => {
  if (!isRecord(value) || getRecordValue(value, "version") !== 2) {
    throw new TypeError("Accessibility baseline must use version 2.")
  }
  const themes = getRecordValue(value, "themes")
  if (!isRecord(themes)) {
    throw new TypeError("Accessibility baseline must define themes.")
  }
  return {
    dark: parseBaselineTheme(getRecordValue(themes, "dark"), "dark"),
    light: parseBaselineTheme(getRecordValue(themes, "light"), "light"),
  }
}

/**
 * @param {Entry[]} entries - Entries to total.
 * @returns {number} Combined entry count.
 */
const countEntries = (entries) =>
  entries.reduce((total, entry) => total + entry.count, 0)

/**
 * @param {ThemeData} current - Current theme data.
 * @param {ThemeData} baseline - Baseline theme data.
 * @param {string} theme - Theme name.
 * @returns {ThemeResult} Theme comparison result.
 */
const compareTheme = (current, baseline, theme) => {
  const baselineCounts = new Map(
    baseline.entries.map((entry) => [entryKey(entry), entry.count]),
  )
  const currentEntries = new Map(
    current.entries.map((entry) => [entryKey(entry), entry]),
  )
  const baselineEntries = new Map(
    baseline.entries.map((entry) => [entryKey(entry), entry]),
  )
  const keys = new Set([...baselineCounts.keys(), ...currentEntries.keys()])
  /** @type {Entry[]} */
  const newEntries = []
  /** @type {Entry[]} */
  const resolvedEntries = []

  for (const key of keys) {
    const baselineCount = baselineCounts.get(key) ?? 0
    const currentEntry = currentEntries.get(key)
    const currentCount = currentEntry?.count ?? 0
    const displayEntry = currentEntry ?? baselineEntries.get(key)
    if (displayEntry === undefined) {
      throw new Error(`Missing accessibility entry for key: ${key}`)
    }
    if (currentCount > baselineCount) {
      newEntries.push({
        ...displayEntry,
        count: currentCount - baselineCount,
      })
    } else if (baselineCount > currentCount) {
      resolvedEntries.push({
        ...displayEntry,
        count: baselineCount - currentCount,
      })
    }
  }

  const currentStoryIds = new Set(current.storyIds)
  const missingStoryIds = baseline.storyIds.filter(
    (storyId) => !currentStoryIds.has(storyId),
  )

  return {
    baselineStories: baseline.stories,
    baselineViolations: baseline.violations,
    currentStories: current.stories,
    currentViolations: current.violations,
    missingStoryIds,
    newEntries,
    newViolations: countEntries(newEntries),
    resolvedEntries,
    resolvedViolations: countEntries(resolvedEntries),
    theme,
  }
}

/**
 * @param {Entry[]} entries - Entries to format.
 * @returns {string[]} Markdown detail lines.
 */
const formatDetails = (entries) => {
  const details = []
  entries.sort(compareEntries)
  for (const entry of entries) {
    const countSuffix = entry.count > 1 ? ` x${entry.count}` : ""
    details.push(
      `  - ${entry.story}: ${entry.id} at ${entry.target}${countSuffix}`,
    )
  }
  return details
}

/**
 * @param {ThemeResult[]} results - Theme comparison results.
 * @returns {string} Markdown summary.
 */
const buildSummary = (results) => {
  const lines = ["## Storybook accessibility regression gate", ""]
  for (const result of results) {
    lines.push(
      `### ${result.theme[0]?.toUpperCase() ?? ""}${result.theme.slice(1)}`,
      `- Current stories: ${result.currentStories}`,
      `- Current violation nodes: ${result.currentViolations} (committed baseline: ${result.baselineViolations})`,
      `- New violation nodes: ${result.newViolations}`,
      `- Resolved violation nodes: ${result.resolvedViolations}`,
      `- Missing baseline stories: ${result.missingStoryIds.length}`,
    )
    if (result.newEntries.length > 0) {
      lines.push(
        "- New violation node fingerprints:",
        ...formatDetails(result.newEntries),
      )
    }
    if (result.missingStoryIds.length > 0) {
      lines.push(
        "- Missing story IDs:",
        ...result.missingStoryIds.map((storyId) => `  - ${storyId}`),
      )
    }
    lines.push("")
  }
  return `${lines.join("\n")}\n`
}

const reportRoot = readArg("--report-root")
const baselinePath = readArg("--baseline")
const updateBaseline = hasFlag("--update-baseline")
const failOnNew = hasFlag("--fail-on-new")

if (reportRoot === null || baselinePath === null) {
  console.error(
    "Usage: storybook-a11y-regression.mjs --report-root <dir> --baseline <file> [--update-baseline | --fail-on-new]",
  )
  exitProcess(1)
  throw new Error("Missing required command-line arguments.")
}

try {
  const themes = loadReports(reportRoot)
  if (updateBaseline) {
    writeBaseline(baselinePath, themes)
    console.log(`Updated accessibility baseline: ${baselinePath}`)
    exitProcess(0)
  }

  const baseline = parseBaseline(
    loadJson(baselinePath, "accessibility baseline"),
  )
  const results = THEMES.map((theme) =>
    compareTheme(themes[theme], baseline[theme], theme),
  )
  const summary = buildSummary(results)
  writeStandardOutput(summary)

  const stepSummaryPath = getStepSummaryPath()
  if (stepSummaryPath !== undefined) {
    appendTextFile(stepSummaryPath, summary)
  }

  if (
    failOnNew &&
    results.some(
      (result) => result.newViolations > 0 || result.missingStoryIds.length > 0,
    )
  ) {
    exitProcess(1)
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  exitProcess(1)
}

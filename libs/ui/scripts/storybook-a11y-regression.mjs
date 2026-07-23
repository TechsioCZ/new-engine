#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"

const THEMES = ["light", "dark"]
const KEY_SEPARATOR = "\x00"
const FALLBACK_TARGET = "__violation__"

function readArg(name) {
  const direct = process.argv.find((arg) => arg.startsWith(`${name}=`))
  if (direct) return direct.slice(name.length + 1)
  const index = process.argv.indexOf(name)
  return index >= 0 ? (process.argv[index + 1] ?? null) : null
}

function hasFlag(name) {
  return process.argv.includes(name)
}

function loadJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"))
  } catch (error) {
    throw new Error(`Failed to load ${label}: ${filePath}`, { cause: error })
  }
}

function findThemeReport(root, theme) {
  const matches = []

  function visit(directory) {
    for (const entry of fs
      .readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name))) {
      const entryPath = path.join(directory, entry.name)
      if (entry.isDirectory() && entry.name !== "baseline") {
        visit(entryPath)
      } else if (
        entry.name === "report.json" &&
        path.basename(path.dirname(entryPath)) === theme
      ) {
        matches.push(entryPath)
      }
    }
  }

  visit(root)
  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one ${theme}/report.json below ${root}; found ${matches.length}.`
    )
  }
  return matches[0]
}

function normalizeTarget(target) {
  if (!Array.isArray(target)) {
    return FALLBACK_TARGET
  }
  return JSON.stringify(target)
}

function collectTheme(report, theme) {
  if (!Array.isArray(report)) {
    throw new Error(`${theme} report must be an array of stories.`)
  }

  const counts = new Map()
  const storyIds = new Set()
  let violations = 0

  for (const story of report) {
    const title = String(story?.title ?? "Unknown")
    const name = String(story?.name ?? story?.storyId ?? "Unknown")
    const storyName = `${title} / ${name}`
    const storyId = String(story?.storyId ?? storyName)
    const storyViolations = story?.results?.violations ?? []
    if (!Array.isArray(storyViolations)) {
      throw new Error(
        `${theme} report contains invalid violations for ${storyName}.`
      )
    }

    storyIds.add(storyId)
    for (const violation of storyViolations) {
      const id = String(violation?.id ?? "unknown")
      const nodes = Array.isArray(violation?.nodes) ? violation.nodes : []
      const targets =
        nodes.length > 0
          ? nodes.map((node) => normalizeTarget(node?.target))
          : [FALLBACK_TARGET]

      violations += targets.length
      for (const target of targets) {
        const key = [storyId, id, target].join(KEY_SEPARATOR)
        const current = counts.get(key)
        counts.set(key, {
          story: storyName,
          storyId,
          id,
          target,
          count: (current?.count ?? 0) + 1,
        })
      }
    }
  }

  const entries = [...counts.values()].sort((left, right) =>
    left.story === right.story
      ? left.id === right.id
        ? left.target.localeCompare(right.target)
        : left.id.localeCompare(right.id)
      : left.story.localeCompare(right.story)
  )

  return {
    stories: storyIds.size,
    storyIds: [...storyIds].sort((left, right) => left.localeCompare(right)),
    violations,
    entries,
  }
}

function loadReports(reportRoot) {
  return Object.fromEntries(
    THEMES.map((theme) => {
      const reportPath = findThemeReport(reportRoot, theme)
      return [
        theme,
        collectTheme(loadJson(reportPath, `${theme} report`), theme),
      ]
    })
  )
}

function writeBaseline(baselinePath, themes) {
  const baseline = {
    version: 2,
    description:
      "Known Storybook accessibility violation nodes. CI rejects new node fingerprints and lost story coverage while reporting this debt.",
    themes,
  }
  fs.writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`)
}

function entryKey(entry) {
  return [String(entry.storyId), String(entry.id), String(entry.target)].join(
    KEY_SEPARATOR
  )
}

function compareTheme(current, baseline, theme) {
  if (
    !baseline ||
    !Array.isArray(baseline.entries) ||
    !Array.isArray(baseline.storyIds)
  ) {
    throw new Error(`Baseline is missing valid ${theme} entries or story IDs.`)
  }

  const baselineCounts = new Map(
    baseline.entries.map((entry) => [entryKey(entry), Number(entry.count)])
  )
  const currentEntries = new Map(
    current.entries.map((entry) => [entryKey(entry), entry])
  )
  const baselineEntries = new Map(
    baseline.entries.map((entry) => [entryKey(entry), entry])
  )
  const keys = new Set([...baselineCounts.keys(), ...currentEntries.keys()])
  const newEntries = []
  const resolvedEntries = []

  for (const key of keys) {
    const baselineCount = baselineCounts.get(key) ?? 0
    const currentEntry = currentEntries.get(key)
    const currentCount = currentEntry?.count ?? 0
    const displayEntry = currentEntry ?? baselineEntries.get(key)
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
    (storyId) => !currentStoryIds.has(String(storyId))
  )
  const countEntries = (entries) =>
    entries.reduce((total, entry) => total + entry.count, 0)

  return {
    theme,
    currentStories: current.stories,
    currentViolations: current.violations,
    baselineStories: Number(baseline.stories),
    baselineViolations: Number(baseline.violations),
    missingStoryIds,
    newEntries,
    resolvedEntries,
    newViolations: countEntries(newEntries),
    resolvedViolations: countEntries(resolvedEntries),
  }
}

function formatDetails(entries) {
  return entries
    .sort((left, right) =>
      left.story === right.story
        ? left.id === right.id
          ? left.target.localeCompare(right.target)
          : left.id.localeCompare(right.id)
        : left.story.localeCompare(right.story)
    )
    .map(
      (entry) =>
        `  - ${entry.story}: ${entry.id} at ${entry.target}${entry.count > 1 ? ` x${entry.count}` : ""}`
    )
}

function buildSummary(results) {
  const lines = ["## Storybook accessibility regression gate", ""]
  for (const result of results) {
    lines.push(`### ${result.theme[0].toUpperCase()}${result.theme.slice(1)}`)
    lines.push(`- Current stories: ${result.currentStories}`)
    lines.push(
      `- Current violation nodes: ${result.currentViolations} (committed baseline: ${result.baselineViolations})`
    )
    lines.push(`- New violation nodes: ${result.newViolations}`)
    lines.push(`- Resolved violation nodes: ${result.resolvedViolations}`)
    lines.push(`- Missing baseline stories: ${result.missingStoryIds.length}`)
    if (result.newEntries.length > 0) {
      lines.push("- New violation node fingerprints:")
      lines.push(...formatDetails(result.newEntries))
    }
    if (result.missingStoryIds.length > 0) {
      lines.push("- Missing story IDs:")
      lines.push(...result.missingStoryIds.map((storyId) => `  - ${storyId}`))
    }
    lines.push("")
  }
  return `${lines.join("\n")}\n`
}

const reportRoot = readArg("--report-root")
const baselinePath = readArg("--baseline")
const updateBaseline = hasFlag("--update-baseline")
const failOnNew = hasFlag("--fail-on-new")

if (!reportRoot || !baselinePath) {
  console.error(
    "Usage: storybook-a11y-regression.mjs --report-root <dir> --baseline <file> [--update-baseline | --fail-on-new]"
  )
  process.exit(1)
}

try {
  const themes = loadReports(reportRoot)
  if (updateBaseline) {
    writeBaseline(baselinePath, themes)
    console.log(`Updated accessibility baseline: ${baselinePath}`)
    process.exit(0)
  }

  const baseline = loadJson(baselinePath, "accessibility baseline")
  if (baseline?.version !== 2 || !baseline.themes) {
    throw new Error("Accessibility baseline must use version 2.")
  }

  const results = THEMES.map((theme) =>
    compareTheme(themes[theme], baseline.themes[theme], theme)
  )
  const summary = buildSummary(results)
  process.stdout.write(summary)

  const stepSummaryPath = process.env.GITHUB_STEP_SUMMARY
  if (stepSummaryPath) {
    fs.appendFileSync(stepSummaryPath, summary)
  }

  if (
    failOnNew &&
    results.some(
      (result) => result.newViolations > 0 || result.missingStoryIds.length > 0
    )
  ) {
    process.exit(1)
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}

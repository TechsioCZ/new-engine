#!/usr/bin/env node
import { createHash } from "node:crypto"
import fs from "node:fs"
import path from "node:path"

function readArg(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? (process.argv[index + 1] ?? null) : null
}

function loadJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"))
  } catch (error) {
    throw new Error(`Failed to load ${label}: ${filePath}`, { cause: error })
  }
}

function writeAtomic(filePath, contents) {
  const temporaryPath = `${filePath}.tmp-${process.pid}`
  fs.writeFileSync(temporaryPath, contents, "utf8")
  fs.renameSync(temporaryPath, filePath)
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function formatJUnit(entries) {
  const cases = entries.map((entry) => {
    const violationCount = entry.results.violations.length
    const storyName = `${entry.title} / ${entry.name}`
    if (violationCount === 0) {
      return `  <testcase classname="${escapeXml(entry.title)}" name="${escapeXml(storyName)}" />`
    }
    return `  <testcase classname="${escapeXml(entry.title)}" name="${escapeXml(storyName)}">\n    <failure message="${violationCount} accessibility violation(s)" />\n  </testcase>`
  })
  const failures = entries.filter(
    (entry) => entry.results.violations.length > 0
  ).length
  return `${[
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<testsuite name="storybook-a11y" tests="${entries.length}" failures="${failures}">`,
    ...cases,
    "</testsuite>",
  ].join("\n")}\n`
}

const indexPath = readArg("--index")
const reportDir = readArg("--report-dir")
const theme = readArg("--theme")

if (!indexPath || !reportDir || !["light", "dark"].includes(theme ?? "")) {
  console.error(
    "Usage: storybook-a11y-finalize.mjs --index <index.json> --report-dir <dir> --theme <light|dark>"
  )
  process.exit(1)
}

try {
  const index = loadJson(indexPath, "Storybook index")
  const expectedEntries = Object.values(index?.entries ?? {})
    .filter(
      (entry) =>
        entry?.type === "story" &&
        Array.isArray(entry.tags) &&
        entry.tags.includes("test")
    )
    .sort((left, right) => String(left.id).localeCompare(String(right.id)))
  const expectedIds = new Set(expectedEntries.map((entry) => String(entry.id)))
  const entriesDir = path.join(reportDir, "entries")
  const entryFiles = fs.existsSync(entriesDir)
    ? fs
        .readdirSync(entriesDir)
        .filter((name) => name.endsWith(".json"))
        .sort((left, right) => left.localeCompare(right))
    : []
  const byId = new Map()

  for (const entryFile of entryFiles) {
    const entry = loadJson(
      path.join(entriesDir, entryFile),
      `${theme} accessibility entry`
    )
    const storyId = String(entry?.storyId ?? "")
    if (!expectedIds.has(storyId)) {
      throw new Error(`${theme} report contains unexpected story: ${storyId}`)
    }
    if (byId.has(storyId)) {
      throw new Error(`${theme} report contains duplicate story: ${storyId}`)
    }
    if (!entry?.results || !Array.isArray(entry.results.violations)) {
      throw new Error(
        `${theme} report has no completed results for: ${storyId}`
      )
    }

    const entryUrl = new URL(String(entry.url))
    const globals = entryUrl.searchParams.get("globals") ?? ""
    const selectedMode = globals
      .split(/[;,]/)
      .find((value) => value.startsWith("mode:"))
      ?.slice("mode:".length)
    if (selectedMode !== theme) {
      throw new Error(
        `${theme} report captured ${storyId} without the expected mode global.`
      )
    }
    byId.set(storyId, entry)
  }

  const missingIds = expectedEntries
    .map((entry) => String(entry.id))
    .filter((storyId) => !byId.has(storyId))
  if (missingIds.length > 0) {
    throw new Error(
      `${theme} report is incomplete: expected ${expectedEntries.length}, found ${byId.size}; missing ${missingIds.slice(0, 5).join(", ")}${missingIds.length > 5 ? ", ..." : ""}`
    )
  }

  const sortedReport = expectedEntries.map((entry) =>
    byId.get(String(entry.id))
  )
  const fingerprints = sortedReport.flatMap((entry) =>
    entry.results.violations
      .map((violation) => ({
        id: String(violation?.id ?? "unknown"),
        story: `${String(entry.title)} / ${String(entry.name)}`,
      }))
      .sort((left, right) => left.id.localeCompare(right.id))
  )
  const canonicalFingerprint = JSON.stringify({
    stories: sortedReport.map((entry) => String(entry.storyId)),
    violations: fingerprints,
  })
  const fingerprint = {
    version: 1,
    theme,
    stories: sortedReport.length,
    violations: fingerprints.length,
    sha256: createHash("sha256").update(canonicalFingerprint).digest("hex"),
  }

  writeAtomic(
    path.join(reportDir, "report.json"),
    `${JSON.stringify(sortedReport, null, 2)}\n`
  )
  writeAtomic(
    path.join(reportDir, "report.ndjson"),
    `${sortedReport.map((entry) => JSON.stringify(entry)).join("\n")}\n`
  )
  writeAtomic(path.join(reportDir, "junit.xml"), formatJUnit(sortedReport))
  writeAtomic(
    path.join(reportDir, "fingerprint.json"),
    `${JSON.stringify(fingerprint, null, 2)}\n`
  )
  fs.rmSync(entriesDir, { recursive: true, force: true })
  console.log(
    `${theme}: ${fingerprint.stories} stories, ${fingerprint.violations} violations, ${fingerprint.sha256}`
  )
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}

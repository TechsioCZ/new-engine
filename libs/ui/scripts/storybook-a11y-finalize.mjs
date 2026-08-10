#!/usr/bin/env node
/// <reference types="node" />
import { createHash } from "node:crypto"
import fs from "node:fs"
import path from "node:path"

import { getRecordValue, isRecord } from "@techsio/std/object"

/** @typedef {{ id: string }} Violation */
/**
 * @typedef {object} ReportEntry
 * @property {string} name - Story name.
 * @property {unknown} source - Original report entry.
 * @property {string} storyId - Story identifier.
 * @property {string} title - Story title.
 * @property {string} url - Captured story URL.
 * @property {Violation[]} violations - Normalized violations.
 */

/** @type {(name: string) => string | null} */
const readArg = (name) => {
  const index = process.argv.indexOf(name)
  return index === -1 ? null : (process.argv[index + 1] ?? null)
}

/** @type {(filePath: string, label: string) => unknown} */
const loadJson = (filePath, label) => {
  try {
    /** @type {unknown} */
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"))
    return parsed
  } catch (error) {
    throw new Error(`Failed to load ${label}: ${filePath}`, { cause: error })
  }
}

/** @type {(filePath: string, contents: string) => void} */
const writeAtomic = (filePath, contents) => {
  const temporaryPath = `${filePath}.tmp-${process.pid}`
  fs.writeFileSync(temporaryPath, contents, "utf-8")
  fs.renameSync(temporaryPath, filePath)
}

/** @type {(value: string) => string} */
const escapeXml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")

/** @type {(value: unknown, fallback?: string) => string} */
const stringifyScalar = (value, fallback = "") => {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "bigint" ||
    typeof value === "boolean"
  ) {
    return String(value)
  }
  return fallback
}

/** @type {(entries: ReportEntry[]) => string} */
const formatJUnit = (entries) => {
  const cases = entries.map((entry) => {
    const violationCount = entry.violations.length
    const storyName = `${entry.title} / ${entry.name}`
    if (violationCount === 0) {
      return `  <testcase classname="${escapeXml(entry.title)}" name="${escapeXml(storyName)}" />`
    }
    return `  <testcase classname="${escapeXml(entry.title)}" name="${escapeXml(storyName)}">\n    <failure message="${violationCount} accessibility violation(s)" />\n  </testcase>`
  })
  const failures = entries.filter((entry) => entry.violations.length > 0).length
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

if (
  indexPath === null ||
  reportDir === null ||
  (theme !== "light" && theme !== "dark")
) {
  console.error(
    "Usage: storybook-a11y-finalize.mjs --index <index.json> --report-dir <dir> --theme <light|dark>",
  )
  process.exit(1)
}

try {
  const index = loadJson(indexPath, "Storybook index")
  if (!isRecord(index)) {
    throw new Error("Storybook index has no entries object.")
  }
  const indexEntries = getRecordValue(index, "entries")
  if (!isRecord(indexEntries)) {
    throw new Error("Storybook index has no entries object.")
  }

  /** @type {{ id: string }[]} */
  const expectedEntries = []
  for (const entry of Object.values(indexEntries)) {
    if (!isRecord(entry)) {
      continue
    }
    const tags = getRecordValue(entry, "tags")
    if (
      getRecordValue(entry, "type") === "story" &&
      Array.isArray(tags) &&
      tags.includes("test")
    ) {
      expectedEntries.push({ id: stringifyScalar(getRecordValue(entry, "id")) })
    }
  }
  /** @type {{ id: string }[]} */
  const sortedExpectedEntries = []
  for (const entry of expectedEntries) {
    const insertionIndex = sortedExpectedEntries.findIndex(
      (candidate) => entry.id.localeCompare(candidate.id) < 0,
    )
    if (insertionIndex === -1) {
      sortedExpectedEntries.push(entry)
    } else {
      sortedExpectedEntries.splice(insertionIndex, 0, entry)
    }
  }
  /** @type {Set<string>} */
  const expectedIds = new Set(sortedExpectedEntries.map((entry) => entry.id))
  const entriesDir = path.join(reportDir, "entries")
  /** @type {string[]} */
  const entryFiles = []
  if (fs.existsSync(entriesDir)) {
    const unsortedEntryFiles = fs
      .readdirSync(entriesDir)
      .filter((name) => name.endsWith(".json"))
    for (const entryFile of unsortedEntryFiles) {
      const insertionIndex = entryFiles.findIndex(
        (candidate) => entryFile.localeCompare(candidate) < 0,
      )
      if (insertionIndex === -1) {
        entryFiles.push(entryFile)
      } else {
        entryFiles.splice(insertionIndex, 0, entryFile)
      }
    }
  }
  /** @type {Map<string, ReportEntry>} */
  const byId = new Map()

  for (const entryFile of entryFiles) {
    const rawEntry = loadJson(
      path.join(entriesDir, entryFile),
      `${theme} accessibility entry`,
    )
    const storyId = isRecord(rawEntry)
      ? stringifyScalar(getRecordValue(rawEntry, "storyId"))
      : ""
    if (!expectedIds.has(storyId)) {
      throw new Error(`${theme} report contains unexpected story: ${storyId}`)
    }
    if (byId.has(storyId)) {
      throw new Error(`${theme} report contains duplicate story: ${storyId}`)
    }
    if (!isRecord(rawEntry)) {
      throw new Error(
        `${theme} report has no completed results for: ${storyId}`,
      )
    }
    const results = getRecordValue(rawEntry, "results")
    const rawViolations = isRecord(results)
      ? getRecordValue(results, "violations")
      : undefined
    if (!Array.isArray(rawViolations)) {
      throw new TypeError(
        `${theme} report has no completed results for: ${storyId}`,
      )
    }

    const entryUrl = new URL(stringifyScalar(getRecordValue(rawEntry, "url")))
    const globals = entryUrl.searchParams.get("globals") ?? ""
    const selectedMode = globals
      .split(/[;,]/u)
      .find((value) => value.startsWith("mode:"))
      ?.slice("mode:".length)
    if (selectedMode !== theme) {
      throw new Error(
        `${theme} report captured ${storyId} without the expected mode global.`,
      )
    }

    /** @type {Violation[]} */
    const violations = []
    for (const violation of rawViolations) {
      violations.push({
        id: isRecord(violation)
          ? stringifyScalar(getRecordValue(violation, "id"), "unknown")
          : "unknown",
      })
    }
    byId.set(storyId, {
      name: stringifyScalar(getRecordValue(rawEntry, "name")),
      source: rawEntry,
      storyId,
      title: stringifyScalar(getRecordValue(rawEntry, "title")),
      url: stringifyScalar(getRecordValue(rawEntry, "url")),
      violations,
    })
  }

  /** @type {string[]} */
  const missingIds = sortedExpectedEntries
    .map((entry) => entry.id)
    .filter((storyId) => !byId.has(storyId))
  if (missingIds.length > 0) {
    throw new Error(
      `${theme} report is incomplete: expected ${sortedExpectedEntries.length}, found ${byId.size}; missing ${missingIds.slice(0, 5).join(", ")}${missingIds.length > 5 ? ", ..." : ""}`,
    )
  }

  /** @type {ReportEntry[]} */
  const sortedReport = sortedExpectedEntries.map((entry) => {
    const reportEntry = byId.get(entry.id)
    if (reportEntry === undefined) {
      throw new Error(`${theme} report is missing story: ${entry.id}`)
    }
    return reportEntry
  })
  /** @type {{ id: string, story: string }[]} */
  const fingerprints = []
  for (const entry of sortedReport) {
    /** @type {{ id: string, story: string }[]} */
    const entryFingerprints = []
    for (const violation of entry.violations) {
      const fingerprint = {
        id: violation.id,
        story: `${entry.title} / ${entry.name}`,
      }
      const insertionIndex = entryFingerprints.findIndex(
        (candidate) => fingerprint.id.localeCompare(candidate.id) < 0,
      )
      if (insertionIndex === -1) {
        entryFingerprints.push(fingerprint)
      } else {
        entryFingerprints.splice(insertionIndex, 0, fingerprint)
      }
    }
    fingerprints.push(...entryFingerprints)
  }
  const canonicalFingerprint = JSON.stringify({
    stories: sortedReport.map((entry) => entry.storyId),
    violations: fingerprints,
  })
  const fingerprint = {
    sha256: createHash("sha256").update(canonicalFingerprint).digest("hex"),
    stories: sortedReport.length,
    theme,
    version: 1,
    violations: fingerprints.length,
  }
  /** @type {unknown[]} */
  const reportSources = sortedReport.map((entry) => entry.source)

  writeAtomic(
    path.join(reportDir, "report.json"),
    `${JSON.stringify(reportSources, null, 2)}\n`,
  )
  writeAtomic(
    path.join(reportDir, "report.ndjson"),
    `${reportSources.map((entry) => JSON.stringify(entry)).join("\n")}\n`,
  )
  writeAtomic(path.join(reportDir, "junit.xml"), formatJUnit(sortedReport))
  writeAtomic(
    path.join(reportDir, "fingerprint.json"),
    `${JSON.stringify(fingerprint, null, 2)}\n`,
  )
  fs.rmSync(entriesDir, { force: true, recursive: true })
  console.log(
    `${theme}: ${fingerprint.stories} stories, ${fingerprint.violations} violations, ${fingerprint.sha256}`,
  )
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}

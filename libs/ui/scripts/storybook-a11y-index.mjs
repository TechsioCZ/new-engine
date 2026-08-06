#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"

const MAX_INDEX_BYTES = 50 * 1024 * 1024
const MAX_STORY_ENTRIES = 100_000

/**
 * @param {unknown} value - Candidate JSON value.
 * @returns {value is Record<string, unknown>} Whether the value is a record.
 */
const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/** @param {string} name - CLI option name. */
const readArg = (name) => {
  const index = process.argv.indexOf(name)
  return index === -1 ? null : (process.argv[index + 1] ?? null)
}

/**
 * @param {unknown} entry - Candidate Storybook entry.
 * @param {string} fallback - Entry map key used when no id is present.
 * @returns {string} Stable story id.
 */
const storyId = (entry, fallback) =>
  isRecord(entry) && typeof entry.id === "string" ? entry.id : fallback

/** @param {string | null} value - Candidate filesystem CLI argument. */
const isInvalidPathArgument = (value) =>
  value === null || value === "" || value.includes("\0")

/**
 * @param {unknown} value - Value crossing the JSON.parse boundary.
 * @returns {unknown} The same value, deliberately widened for validation.
 */
const toUnknown = (value) => value

const inputPath = readArg("--input")
const outputPath = readArg("--output")

if (isInvalidPathArgument(inputPath) || isInvalidPathArgument(outputPath)) {
  console.error(
    "Usage: storybook-a11y-index.mjs --input <index.json> --output <index.json>",
  )
  process.exit(1)
}

try {
  if (fs.statSync(inputPath).size > MAX_INDEX_BYTES) {
    throw new Error(`Storybook index exceeds ${MAX_INDEX_BYTES} bytes.`)
  }
  const parsed = toUnknown(JSON.parse(fs.readFileSync(inputPath, "utf-8")))
  if (!isRecord(parsed) || !isRecord(parsed.entries)) {
    throw new Error("Storybook index has no entries object.")
  }

  const entryPairs = Object.entries(parsed.entries)
  if (entryPairs.length > MAX_STORY_ENTRIES) {
    throw new Error(`Storybook index exceeds ${MAX_STORY_ENTRIES} entries.`)
  }
  const entries = Object.fromEntries(
    entryPairs.toSorted(([leftKey, left], [rightKey, right]) => {
      const leftId = storyId(left, leftKey)
      const rightId = storyId(right, rightKey)
      return leftId === rightId
        ? leftKey.localeCompare(rightKey)
        : leftId.localeCompare(rightId)
    }),
  )
  const canonicalIndex = { ...parsed, entries }
  const serialized = JSON.stringify(canonicalIndex)
  if (serialized === undefined) {
    throw new Error("Canonical Storybook index could not be serialized.")
  }
  const serializedIndex = `${serialized}\n`
  if (Buffer.byteLength(serializedIndex, "utf-8") > MAX_INDEX_BYTES) {
    throw new Error(
      `Canonical Storybook index exceeds ${MAX_INDEX_BYTES} bytes.`,
    )
  }
  const temporaryPath = `${outputPath}.${process.pid}.tmp`

  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(temporaryPath, serializedIndex, "utf-8")
  fs.renameSync(temporaryPath, outputPath)

  const storyCount = Object.values(entries).filter(
    (entry) =>
      isRecord(entry) &&
      entry.type === "story" &&
      Array.isArray(entry.tags) &&
      entry.tags.includes("test"),
  ).length
  console.log(`Canonical Storybook index: ${storyCount} test stories.`)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}

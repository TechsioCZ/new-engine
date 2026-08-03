#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"

function readArg(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? (process.argv[index + 1] ?? null) : null
}

const inputPath = readArg("--input")
const outputPath = readArg("--output")

if (!inputPath || !outputPath) {
  console.error(
    "Usage: storybook-a11y-index.mjs --input <index.json> --output <index.json>"
  )
  process.exit(1)
}

try {
  const index = JSON.parse(fs.readFileSync(inputPath, "utf8"))
  if (!index || typeof index !== "object" || !index.entries) {
    throw new Error("Storybook index has no entries object.")
  }

  const entries = Object.fromEntries(
    Object.entries(index.entries).sort(([leftKey, left], [rightKey, right]) => {
      const leftId = String(left?.id ?? leftKey)
      const rightId = String(right?.id ?? rightKey)
      return leftId === rightId
        ? leftKey.localeCompare(rightKey)
        : leftId.localeCompare(rightId)
    })
  )
  const canonicalIndex = { ...index, entries }
  const temporaryPath = `${outputPath}.${process.pid}.tmp`

  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(temporaryPath, `${JSON.stringify(canonicalIndex)}\n`, "utf8")
  fs.renameSync(temporaryPath, outputPath)

  const storyCount = Object.values(entries).filter(
    (entry) =>
      entry?.type === "story" &&
      Array.isArray(entry.tags) &&
      entry.tags.includes("test")
  ).length
  console.log(`Canonical Storybook index: ${storyCount} test stories.`)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}

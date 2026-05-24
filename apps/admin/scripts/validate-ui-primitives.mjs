#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(SCRIPT_DIR, "..")
const SRC_DIR = path.join(ROOT, "src")
const FILE_EXTENSIONS = new Set([".ts", ".tsx"])
const IGNORED_FILE_SUFFIXES = [".test.ts", ".test.tsx", ".spec.ts", ".spec.tsx"]
const RAW_PRIMITIVE_PATTERN =
  /<\s*(button|input|select|textarea|table|thead|tbody|tr|td|th|svg|img)\b/g
const ALLOW_MARKER = "admin-allow-native-primitive"

function walkFiles(dir) {
  const files = []

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolutePath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      files.push(...walkFiles(absolutePath))
      continue
    }

    if (!entry.isFile()) {
      continue
    }

    if (!FILE_EXTENSIONS.has(path.extname(entry.name))) {
      continue
    }

    if (IGNORED_FILE_SUFFIXES.some((suffix) => entry.name.endsWith(suffix))) {
      continue
    }

    files.push(absolutePath)
  }

  return files
}

function toRelative(filePath) {
  return path.relative(ROOT, filePath).replaceAll(path.sep, "/")
}

function lineNumberForIndex(content, index) {
  return content.slice(0, index).split("\n").length
}

function hasAllowMarker(lines, lineNumber) {
  const currentLine = lines[lineNumber - 1] ?? ""
  const previousLine = lines[lineNumber - 2] ?? ""

  return (
    currentLine.includes(ALLOW_MARKER) || previousLine.includes(ALLOW_MARKER)
  )
}

function validateUiPrimitives() {
  const findings = []

  for (const file of walkFiles(SRC_DIR)) {
    const content = fs.readFileSync(file, "utf8")
    const lines = content.split("\n")

    for (const match of content.matchAll(RAW_PRIMITIVE_PATTERN)) {
      const line = lineNumberForIndex(content, match.index ?? 0)

      if (hasAllowMarker(lines, line)) {
        continue
      }

      findings.push({
        file: toRelative(file),
        line,
        primitive: match[1].toLowerCase(),
      })
    }
  }

  if (findings.length === 0) {
    console.log("Admin UI primitive validation passed.")
    return true
  }

  console.error("Admin UI primitive validation failed.")
  console.error(
    `Use @techsio/ui-kit components first, or add ${ALLOW_MARKER} for a documented gap.`
  )

  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line} raw <${finding.primitive}>`)
  }

  return false
}

process.exit(validateUiPrimitives() ? 0 : 1)

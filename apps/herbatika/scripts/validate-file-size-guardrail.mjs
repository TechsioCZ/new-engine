#!/usr/bin/env node
/// <reference types="node" />

import fs from "node:fs"
import path from "node:path"

const DEFAULT_CONFIG_PATH = "scripts/file-size-guardrail.config.json"

/** @typedef {{ error: number, warning: number }} Thresholds */
/** @typedef {{ exclude: string[], fileExtensions: string[], scanDirectories: string[], thresholds: Thresholds }} GuardrailConfig */
/** @typedef {"error" | "warning"} Severity */
/** @typedef {{ file: string, lineCount: number, severity: Severity, threshold: number }} Finding */
/** @typedef {{ errors: number, warnings: number }} FindingCounts */
/** @typedef {{ counts: FindingCounts, findings: Finding[], scannedFiles: number, thresholds: Thresholds }} Report */

/** @type {(value: string) => string} */
const normalizePath = (value) => value.replaceAll(path.sep, "/")

/** @type {(globPattern: string) => RegExp} */
const globToRegExp = (globPattern) => {
  const normalized = normalizePath(globPattern)
  const withMarkers = normalized
    .replaceAll("**", "__DOUBLE_STAR__")
    .replaceAll("*", "__SINGLE_STAR__")
  const escaped = withMarkers
    .replaceAll(/[.+^${}()|[\]\\]/gu, "\\$&")
    .replaceAll("__DOUBLE_STAR__", ".*")
    .replaceAll("__SINGLE_STAR__", "[^/]*")

  return new RegExp(`^${escaped}$`, "u")
}

/** @type {(patterns: string[]) => RegExp[]} */
const buildMatchers = (patterns) => patterns.map(globToRegExp)

/** @type {(value: string, matchers: RegExp[]) => boolean} */
const matchesAny = (value, matchers) =>
  matchers.some((matcher) => matcher.test(value))

/** @type {(value: unknown) => value is string} */
const isNonEmptyString = (value) =>
  typeof value === "string" && value.length > 0

/** @type {(value: unknown, label: string) => asserts value is string[]} */
const assertArrayOfStrings = (value, label) => {
  if (!Array.isArray(value) || value.some((item) => !isNonEmptyString(item))) {
    throw new Error(`${label} must be an array of non-empty strings.`)
  }
}

/** @type {(value: unknown, label: string) => number} */
const parseThreshold = (value, label) => {
  if (typeof value !== "number" || Number.isNaN(value) || value < 1) {
    throw new Error(`${label} must be a positive number.`)
  }

  return Math.trunc(value)
}

/** @type {(value: unknown) => value is Record<string, unknown>} */
const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/** @type {(configPath: string) => GuardrailConfig} */
const loadConfig = (configPath) => {
  const configContent = fs.readFileSync(configPath, "utf-8")
  /** @type {unknown} */
  const config = JSON.parse(configContent)

  if (!isRecord(config)) {
    throw new Error("Invalid config format.")
  }

  const { exclude = [], fileExtensions, scanDirectories, thresholds } = config

  assertArrayOfStrings(scanDirectories, "scanDirectories")
  assertArrayOfStrings(fileExtensions, "fileExtensions")
  assertArrayOfStrings(exclude, "exclude")

  if (!isRecord(thresholds)) {
    throw new Error("thresholds must be an object.")
  }

  const warningThreshold = parseThreshold(
    thresholds.warning,
    "thresholds.warning",
  )
  const errorThreshold = parseThreshold(thresholds.error, "thresholds.error")

  if (warningThreshold >= errorThreshold) {
    throw new Error("thresholds.warning must be lower than thresholds.error")
  }

  return {
    exclude,
    fileExtensions,
    scanDirectories,
    thresholds: {
      error: errorThreshold,
      warning: warningThreshold,
    },
  }
}

/** @type {(options: { cwd: string, directory: string, fileExtensions: string[], excludeMatchers: RegExp[], output: string[] }) => void} */
const collectFiles = ({
  cwd,
  directory,
  fileExtensions,
  excludeMatchers,
  output,
}) => {
  if (!(fs.existsSync(directory) && fs.statSync(directory).isDirectory())) {
    return
  }

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      collectFiles({
        cwd,
        directory: absolutePath,
        excludeMatchers,
        fileExtensions,
        output,
      })
    } else if (
      entry.isFile() &&
      fileExtensions.some((extension) => entry.name.endsWith(extension))
    ) {
      const relativePath = normalizePath(path.relative(cwd, absolutePath))
      if (!matchesAny(relativePath, excludeMatchers)) {
        output.push(relativePath)
      }
    }
  }
}

/** @type {(content: string) => number} */
const resolveLineCount = (content) => {
  if (content.length === 0) {
    return 0
  }

  let newlineCount = 0
  for (const character of content) {
    if (character === "\n") {
      newlineCount += 1
    }
  }

  return content.endsWith("\n") ? newlineCount : newlineCount + 1
}

/** @type {(lineCount: number, thresholds: Thresholds) => Severity | null} */
const resolveSeverity = (lineCount, thresholds) => {
  if (lineCount >= thresholds.error) {
    return "error"
  }

  if (lineCount >= thresholds.warning) {
    return "warning"
  }

  return null
}

/** @type {(options: { cwd: string, files: string[], thresholds: Thresholds }) => Report} */
const buildReport = ({ cwd, files, thresholds }) => {
  /** @type {Finding[]} */
  const findings = []

  for (const file of files) {
    const absolutePath = path.resolve(cwd, file)
    const content = fs.readFileSync(absolutePath, "utf-8")
    const lineCount = resolveLineCount(content)
    const severity = resolveSeverity(lineCount, thresholds)

    if (severity) {
      findings.push({
        file,
        lineCount,
        severity,
        threshold: severity === "error" ? thresholds.error : thresholds.warning,
      })
    }
  }

  findings.sort((left, right) => {
    if (right.lineCount !== left.lineCount) {
      return right.lineCount - left.lineCount
    }

    return left.file.localeCompare(right.file)
  })

  const counts = {
    errors: findings.filter((item) => item.severity === "error").length,
    warnings: findings.filter((item) => item.severity === "warning").length,
  }

  const summary = {
    counts,
    scannedFiles: files.length,
    thresholds,
  }

  return {
    ...summary,
    findings,
  }
}

/** @type {(title: string, findings: Finding[]) => void} */
const printSection = (title, findings) => {
  if (findings.length === 0) {
    return
  }

  console.log(`\n${title}`)
  for (const finding of findings) {
    console.log(
      `  - ${finding.file} (${finding.lineCount} lines, threshold >= ${finding.threshold})`,
    )
  }
}

/** @type {(report: Report) => void} */
const printHumanReadable = (report) => {
  console.log("File size guardrail report")
  console.log(`Scanned files: ${report.scannedFiles}`)
  console.log(
    `Thresholds: warning >= ${report.thresholds.warning}, error >= ${report.thresholds.error}`,
  )
  console.log(
    `Counts: errors=${report.counts.errors}, warnings=${report.counts.warnings}`,
  )

  if (report.findings.length === 0) {
    console.log("\nNo violations found.")
    return
  }

  printSection(
    "Errors",
    report.findings.filter((item) => item.severity === "error"),
  )
  printSection(
    "Warnings",
    report.findings.filter((item) => item.severity === "warning"),
  )
}

/** @type {(argv: string[]) => { configPath: string, json: boolean }} */
const parseArgs = (argv) => {
  const args = { configPath: DEFAULT_CONFIG_PATH, json: false }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === "--json") {
      args.json = true
    } else if (arg === "--config") {
      const nextValue = argv[index + 1]
      if (nextValue) {
        args.configPath = nextValue
        index += 1
      }
    } else if (arg?.startsWith("--config=")) {
      args.configPath = arg.slice("--config=".length)
    }
  }

  return args
}

const main = () => {
  const args = parseArgs(process.argv.slice(2))
  const cwd = process.cwd()
  const configPath = path.resolve(cwd, args.configPath)

  if (!fs.existsSync(configPath)) {
    console.error(
      `Config file not found: ${normalizePath(path.relative(cwd, configPath))}`,
    )
    process.exit(1)
  }

  let config
  try {
    config = loadConfig(configPath)
  } catch (error) {
    console.error(
      `Failed to parse config (${normalizePath(path.relative(cwd, configPath))}): ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
    process.exit(1)
  }

  const excludeMatchers = buildMatchers(config.exclude)
  /** @type {string[]} */
  const files = []

  for (const scanDirectory of config.scanDirectories) {
    collectFiles({
      cwd,
      directory: path.resolve(cwd, scanDirectory),
      excludeMatchers,
      fileExtensions: config.fileExtensions,
      output: files,
    })
  }

  files.sort((left, right) => left.localeCompare(right))

  const report = buildReport({
    cwd,
    files,
    thresholds: config.thresholds,
  })

  if (args.json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    printHumanReadable(report)
  }

  if (report.counts.errors > 0) {
    process.exitCode = 1
  }
}

main()

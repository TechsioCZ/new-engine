#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"

const DEFAULT_CONFIG_PATH = "scripts/file-size-guardrail.config.json"

function parseArgs(argv) {
  const args = {
    configPath: DEFAULT_CONFIG_PATH,
    json: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === "--json") {
      args.json = true
      continue
    }

    if (arg === "--config") {
      const nextValue = argv[index + 1]
      if (nextValue) {
        args.configPath = nextValue
        index += 1
      }
      continue
    }

    if (arg.startsWith("--config=")) {
      args.configPath = arg.slice("--config=".length)
    }
  }

  return args
}

function normalizePath(value) {
  return value.replaceAll(path.sep, "/")
}

function globToRegExp(globPattern) {
  const normalized = normalizePath(globPattern)
  const withMarkers = normalized
    .replaceAll("**", "__DOUBLE_STAR__")
    .replaceAll("*", "__SINGLE_STAR__")

  const escaped = withMarkers
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replaceAll("__DOUBLE_STAR__", ".*")
    .replaceAll("__SINGLE_STAR__", "[^/]*")

  return new RegExp(`^${escaped}$`)
}

function buildMatchers(patterns) {
  return patterns.map((pattern) => globToRegExp(pattern))
}

function matchesAny(value, matchers) {
  return matchers.some((matcher) => matcher.test(value))
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.length > 0
}

function assertArrayOfStrings(value, label) {
  if (!Array.isArray(value) || value.some((item) => !isNonEmptyString(item))) {
    throw new Error(`${label} must be an array of non-empty strings.`)
  }
}

function parseThreshold(value, label) {
  if (typeof value !== "number" || Number.isNaN(value) || value < 1) {
    throw new Error(`${label} must be a positive number.`)
  }

  return Math.trunc(value)
}

function loadConfig(configPath) {
  const configContent = fs.readFileSync(configPath, "utf8")
  const config = JSON.parse(configContent)

  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("Invalid config format.")
  }

  const {
    scanDirectories,
    fileExtensions,
    exclude = [],
    allowlist = [],
    thresholds,
  } = config

  assertArrayOfStrings(scanDirectories, "scanDirectories")
  assertArrayOfStrings(fileExtensions, "fileExtensions")
  assertArrayOfStrings(exclude, "exclude")
  assertArrayOfStrings(allowlist, "allowlist")

  if (!thresholds || typeof thresholds !== "object" || Array.isArray(thresholds)) {
    throw new Error("thresholds must be an object.")
  }

  const warningThreshold = parseThreshold(thresholds.warning, "thresholds.warning")
  const errorThreshold = parseThreshold(thresholds.error, "thresholds.error")

  if (warningThreshold >= errorThreshold) {
    throw new Error("thresholds.warning must be lower than thresholds.error")
  }

  return {
    scanDirectories,
    fileExtensions,
    exclude,
    allowlist,
    thresholds: {
      warning: warningThreshold,
      error: errorThreshold,
    },
  }
}

function collectFiles({
  cwd,
  directory,
  fileExtensions,
  excludeMatchers,
  output,
}) {
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    return
  }

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      collectFiles({
        cwd,
        directory: absolutePath,
        fileExtensions,
        excludeMatchers,
        output,
      })
      continue
    }

    if (!entry.isFile()) {
      continue
    }

    if (!fileExtensions.some((extension) => entry.name.endsWith(extension))) {
      continue
    }

    const relativePath = normalizePath(path.relative(cwd, absolutePath))
    if (matchesAny(relativePath, excludeMatchers)) {
      continue
    }

    output.push(relativePath)
  }
}

function resolveLineCount(content) {
  if (content.length === 0) {
    return 0
  }

  let newlineCount = 0
  for (let index = 0; index < content.length; index += 1) {
    if (content[index] === "\n") {
      newlineCount += 1
    }
  }

  if (content.endsWith("\n")) {
    return newlineCount
  }

  return newlineCount + 1
}

function resolveSeverity(lineCount, thresholds) {
  if (lineCount >= thresholds.error) {
    return "error"
  }

  if (lineCount >= thresholds.warning) {
    return "warning"
  }

  return null
}

function buildReport({ cwd, files, allowlistMatchers, thresholds }) {
  const findings = []

  for (const file of files) {
    const absolutePath = path.resolve(cwd, file)
    const content = fs.readFileSync(absolutePath, "utf8")
    const lineCount = resolveLineCount(content)
    const sourceSeverity = resolveSeverity(lineCount, thresholds)

    if (!sourceSeverity) {
      continue
    }

    const isAllowlisted = matchesAny(file, allowlistMatchers)
    const severity = isAllowlisted ? "allowlisted" : sourceSeverity

    findings.push({
      file,
      lineCount,
      severity,
      sourceSeverity,
      threshold:
        sourceSeverity === "error" ? thresholds.error : thresholds.warning,
    })
  }

  findings.sort((left, right) => {
    if (right.lineCount !== left.lineCount) {
      return right.lineCount - left.lineCount
    }

    return left.file.localeCompare(right.file)
  })

  const summary = {
    scannedFiles: files.length,
    thresholds,
    counts: {
      errors: findings.filter((item) => item.severity === "error").length,
      warnings: findings.filter((item) => item.severity === "warning").length,
      allowlisted: findings.filter((item) => item.severity === "allowlisted").length,
      allowlistedErrors: findings.filter(
        (item) => item.severity === "allowlisted" && item.sourceSeverity === "error",
      ).length,
      allowlistedWarnings: findings.filter(
        (item) => item.severity === "allowlisted" && item.sourceSeverity === "warning",
      ).length,
    },
  }

  return {
    ...summary,
    findings,
  }
}

function printSection(title, findings) {
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

function printHumanReadable(report) {
  console.log("File size guardrail report")
  console.log(`Scanned files: ${report.scannedFiles}`)
  console.log(
    `Thresholds: warning >= ${report.thresholds.warning}, error >= ${report.thresholds.error}`,
  )
  console.log(
    `Counts: errors=${report.counts.errors}, warnings=${report.counts.warnings}, allowlisted=${report.counts.allowlisted}`,
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
  printSection(
    "Allowlisted",
    report.findings.filter((item) => item.severity === "allowlisted"),
  )

  if (report.counts.allowlistedErrors > 0) {
    console.log(
      `\nAllowlisted errors: ${report.counts.allowlistedErrors} (baseline debt, does not fail guardrail).`,
    )
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const cwd = process.cwd()
  const configPath = path.resolve(cwd, args.configPath)

  if (!fs.existsSync(configPath)) {
    console.error(`Config file not found: ${normalizePath(path.relative(cwd, configPath))}`)
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
  const allowlistMatchers = buildMatchers(config.allowlist)
  const files = []

  for (const scanDirectory of config.scanDirectories) {
    collectFiles({
      cwd,
      directory: path.resolve(cwd, scanDirectory),
      fileExtensions: config.fileExtensions,
      excludeMatchers,
      output: files,
    })
  }

  files.sort((left, right) => left.localeCompare(right))

  const report = buildReport({
    cwd,
    files,
    allowlistMatchers,
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

#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"

const DEFAULT_CONFIG_PATH = "scripts/token-usage.config.mjs"
const BASE_EXCLUDE_PATTERNS = ["**/node_modules/**", "**/.next/**", "**/.git/**"]
const CLASS_TOKEN_SPLIT_REGEX = /\s+/
const VARIANT_PREFIX_REGEX =
  /^(?:[a-z0-9@_-]+:|[a-z0-9@_-]+-\[[^\]]+\]:|data-\[[^\]]+\]:|aria-\[[^\]]+\]:|\[[^\]]+\]:|\*:|!)/i

function parseArgs(argv) {
  const args = { configPath: DEFAULT_CONFIG_PATH, json: false }

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
      continue
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

function buildLineStarts(content) {
  const starts = [0]
  for (let index = 0; index < content.length; index += 1) {
    if (content[index] === "\n") {
      starts.push(index + 1)
    }
  }
  return starts
}

function lineFromIndex(lineStarts, index) {
  let low = 0
  let high = lineStarts.length - 1
  let line = 1

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const value = lineStarts[mid]

    if (value <= index) {
      line = mid + 1
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  return line
}

function sanitizeClassString(value) {
  return value
    .replaceAll(/\$\{[^}]*\}/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim()
}

function tokenizeClassString(value) {
  return sanitizeClassString(value)
    .split(CLASS_TOKEN_SPLIT_REGEX)
    .map((token) => token.trim())
    .filter(Boolean)
}

function isPlausibleClassToken(token) {
  if (!(token && token.length > 1)) {
    return false
  }

  if (token.startsWith("//")) {
    return false
  }

  return /[a-z]/i.test(token)
}

function extractClassEntries(content) {
  const entries = []
  const seen = new Set()
  const lineStarts = buildLineStarts(content)

  const addClassString = (classString, absoluteIndex) => {
    const line = lineFromIndex(lineStarts, absoluteIndex)
    for (const className of tokenizeClassString(classString)) {
      if (!isPlausibleClassToken(className)) {
        continue
      }

      const key = `${line}:${className}`
      if (seen.has(key)) {
        continue
      }
      seen.add(key)
      entries.push({ className, line })
    }
  }

  const classNameRegexes = [
    /className\s*=\s*"([^"]+)"/g,
    /className\s*=\s*'([^']+)'/g,
    /className\s*=\s*`([\s\S]*?)`/g,
    /className\s*=\s*\{\s*"([^"]+)"\s*\}/g,
    /className\s*=\s*\{\s*'([^']+)'\s*\}/g,
    /className\s*=\s*\{\s*`([\s\S]*?)`\s*\}/g,
    /\bclassName\s*:\s*"([^"]+)"/g,
    /\bclassName\s*:\s*'([^']+)'/g,
    /\bclassName\s*:\s*`([\s\S]*?)`/g,
  ]

  for (const regex of classNameRegexes) {
    for (const match of content.matchAll(regex)) {
      const classString = match[1]
      if (!classString) {
        continue
      }
      const absoluteIndex = match.index + match[0].indexOf(classString)
      addClassString(classString, absoluteIndex)
    }
  }

  const utilityCallRegex = /\b(?:cn|clsx)\s*\(([\s\S]*?)\)/g
  const stringLiteralRegex = /(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g
  for (const match of content.matchAll(utilityCallRegex)) {
    const argsBlock = match[1]
    if (!argsBlock) {
      continue
    }

    const callStart = match.index + match[0].indexOf(argsBlock)
    for (const stringMatch of argsBlock.matchAll(stringLiteralRegex)) {
      const classString = stringMatch[2]
      if (!classString) {
        continue
      }

      const literalStart = callStart + stringMatch.index + stringMatch[0].indexOf(classString)
      addClassString(classString, literalStart)
    }
  }

  return entries
}

function stripVariants(className) {
  let base = className.trim()
  while (VARIANT_PREFIX_REGEX.test(base)) {
    base = base.replace(VARIANT_PREFIX_REGEX, "")
  }
  return base
}

function resolvePrefixValue(baseClass, prefixes) {
  const normalized = baseClass.startsWith("-") ? baseClass.slice(1) : baseClass
  const sortedPrefixes = prefixes.slice().sort((left, right) => right.length - left.length)

  for (const prefix of sortedPrefixes) {
    const prefixWithDash = `${prefix}-`
    if (!normalized.startsWith(prefixWithDash)) {
      continue
    }

    return {
      prefix,
      value: normalized.slice(prefixWithDash.length),
      normalized,
    }
  }

  return null
}

function checkNoArbitraryValues(className, ruleConfig) {
  if (!ruleConfig?.enabled) {
    return null
  }

  const baseClass = stripVariants(className)
  const allowPatterns = ruleConfig.allowClassPatterns ?? []
  if (allowPatterns.some((pattern) => pattern.test(className) || pattern.test(baseClass))) {
    return null
  }

  const hasArbitrarySyntax =
    baseClass.includes("[") ||
    baseClass.includes("]") ||
    /\(--[\w-]+\)/.test(baseClass) ||
    /var\(--[\w-]+\)/.test(baseClass)

  if (!hasArbitrarySyntax) {
    return null
  }

  return {
    rule: "no-arbitrary-values",
    message: "Nepoužívej arbitrary utility hodnoty, použij token utility z libs/ui.",
  }
}

function checkNoTailwindPalette(className, ruleConfig) {
  if (!ruleConfig?.enabled) {
    return null
  }

  const baseClass = stripVariants(className).replace(/\/\d+$/, "")
  const match = resolvePrefixValue(baseClass, ruleConfig.colorUtilityPrefixes ?? [])
  if (!match) {
    return null
  }

  const palette = ruleConfig.paletteNames ?? []
  const value = match.value
  const isPalette = palette.some((colorName) => value === colorName || value.startsWith(`${colorName}-`))
  if (!isPalette) {
    return null
  }

  return {
    rule: "no-tailwind-palette",
    message: `Nepoužívej Tailwind palette (${value}), použij semantic token (např. text-fg-primary).`,
  }
}

function checkNoTailwindSpacingScale(className, ruleConfig) {
  if (!ruleConfig?.enabled) {
    return null
  }

  const baseClass = stripVariants(className)
  const match = resolvePrefixValue(baseClass, ruleConfig.prefixes ?? [])
  if (!match) {
    return null
  }

  const value = match.value
  if (!value || value.includes("/")) {
    return null
  }
  if (value.startsWith("[") || value.startsWith("(")) {
    return null
  }

  const allowedKeywords = new Set(ruleConfig.allowedKeywords ?? [])
  if (allowedKeywords.has(value)) {
    return null
  }

  if (!/^\d+(?:\.\d+)?$/.test(value)) {
    return null
  }

  const allowedNumericValues = new Set(ruleConfig.allowedNumericValues ?? [])
  if (allowedNumericValues.has(value)) {
    return null
  }

  return {
    rule: "no-tailwind-spacing-scale",
    message: `Nepoužívej Tailwind spacing scale (${match.prefix}-${value}), použij token scale.`,
  }
}

function checkNoTailwindContainerScale(className, ruleConfig) {
  if (!ruleConfig?.enabled) {
    return null
  }

  const baseClass = stripVariants(className)
  const match = resolvePrefixValue(baseClass, ruleConfig.prefixes ?? [])
  if (!match) {
    return null
  }

  const value = match.value
  if (!value || value.startsWith("[") || value.startsWith("(") || value.includes("/")) {
    return null
  }

  const disallowedValues = new Set(ruleConfig.disallowedValues ?? [])
  if (!disallowedValues.has(value)) {
    return null
  }

  return {
    rule: "no-tailwind-container-scale",
    message: `Nepoužívej default container scale (${match.prefix}-${value}), použij container token (např. max-w-max-w).`,
  }
}

function validateClass(className, rulesConfig) {
  const checks = [
    [checkNoArbitraryValues, rulesConfig.noArbitraryValues],
    [checkNoTailwindPalette, rulesConfig.noTailwindPalette],
    [checkNoTailwindSpacingScale, rulesConfig.noTailwindSpacingScale],
    [checkNoTailwindContainerScale, rulesConfig.noTailwindContainerScale],
  ]

  for (const [check, ruleConfig] of checks) {
    const finding = check(className, ruleConfig)
    if (finding) {
      return finding
    }
  }

  return null
}

function resolveRuleConfigMap(config) {
  const rules = config.rules ?? {}
  return {
    noArbitraryValues: rules.noArbitraryValues ?? { enabled: false },
    noTailwindPalette: rules.noTailwindPalette ?? { enabled: false },
    noTailwindSpacingScale: rules.noTailwindSpacingScale ?? { enabled: false },
    noTailwindContainerScale: rules.noTailwindContainerScale ?? { enabled: false },
  }
}

function listSourceFiles(rootDir, config) {
  const extensions = new Set(config.fileExtensions ?? [".ts", ".tsx"])
  const excludeRegexes = [...BASE_EXCLUDE_PATTERNS, ...(config.exclude ?? [])].map(globToRegExp)
  const scanDirectories = config.scanDirectories ?? []

  const files = []

  const walk = (absoluteDir) => {
    if (!fs.existsSync(absoluteDir)) {
      return
    }

    const entries = fs.readdirSync(absoluteDir, { withFileTypes: true })
    for (const entry of entries) {
      const absolutePath = path.join(absoluteDir, entry.name)
      const relativePath = normalizePath(path.relative(rootDir, absolutePath))

      if (excludeRegexes.some((regex) => regex.test(relativePath))) {
        continue
      }

      if (entry.isDirectory()) {
        walk(absolutePath)
        continue
      }

      if (!entry.isFile()) {
        continue
      }

      const extension = path.extname(entry.name)
      if (!extensions.has(extension)) {
        continue
      }

      files.push(relativePath)
    }
  }

  for (const relativeDir of scanDirectories) {
    walk(path.resolve(rootDir, relativeDir))
  }

  return files.sort((left, right) => left.localeCompare(right))
}

function printSummary(findings, scannedFileCount) {
  const byRule = new Map()
  for (const finding of findings) {
    byRule.set(finding.rule, (byRule.get(finding.rule) ?? 0) + 1)
  }

  console.log(`Scanned files: ${scannedFileCount}`)
  if (findings.length === 0) {
    console.log("No guardrail violations found.")
    return
  }

  console.log(`Total violations: ${findings.length}`)
  for (const [rule, count] of [...byRule.entries()].sort((left, right) => left[0].localeCompare(right[0]))) {
    console.log(`- ${rule}: ${count}`)
  }

  const groupedByFile = new Map()
  for (const finding of findings) {
    if (!groupedByFile.has(finding.file)) {
      groupedByFile.set(finding.file, [])
    }
    groupedByFile.get(finding.file).push(finding)
  }

  for (const [file, fileFindings] of [...groupedByFile.entries()].sort((left, right) => left[0].localeCompare(right[0]))) {
    console.log(`\n${file}`)
    for (const finding of fileFindings) {
      console.log(`  L${finding.line} ${finding.className}`)
      console.log(`    ${finding.message}`)
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const rootDir = process.cwd()
  const configPath = path.resolve(rootDir, args.configPath)

  if (!fs.existsSync(configPath)) {
    console.error(`Config file not found: ${configPath}`)
    process.exit(2)
  }

  const configModule = await import(pathToFileURL(configPath).href)
  const config = configModule.default ?? configModule
  const rulesConfig = resolveRuleConfigMap(config)
  const sourceFiles = listSourceFiles(rootDir, config)

  const findings = []

  for (const file of sourceFiles) {
    const absoluteFilePath = path.resolve(rootDir, file)
    const content = fs.readFileSync(absoluteFilePath, "utf8")
    const classEntries = extractClassEntries(content)

    for (const entry of classEntries) {
      const ruleFinding = validateClass(entry.className, rulesConfig)
      if (!ruleFinding) {
        continue
      }

      findings.push({
        file,
        line: entry.line,
        className: entry.className,
        rule: ruleFinding.rule,
        message: ruleFinding.message,
      })
    }
  }

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          scannedFiles: sourceFiles.length,
          violationCount: findings.length,
          findings,
        },
        null,
        2,
      ),
    )
  } else {
    printSummary(findings, sourceFiles.length)
  }

  process.exit(findings.length > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error("Token usage validation failed.")
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})

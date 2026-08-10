#!/usr/bin/env node
/// <reference types="node" />

import { existsSync, readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import { argv, cwd, exit } from "node:process"
import { pathToFileURL } from "node:url"

import {
  globToRegExp,
  normalizePath,
  parseGuardrailArgs,
} from "./guardrail-utils.mjs"
import defaultConfig from "./token-usage.config.mjs"

/** @typedef {{ configPath: string, json: boolean }} GuardrailArgs */
/** @typedef {{ className: string, line: number }} ClassEntry */
/** @typedef {{ message: string, rule: string }} RuleFinding */
/** @typedef {ClassEntry & RuleFinding & { file: string }} Finding */
/** @typedef {{ normalized: string, prefix: string, value: string }} PrefixValue */
/** @typedef {{ enabled: boolean, validClassPatterns: RegExp[] }} ArbitraryValuesRule */
/** @typedef {{ enabled: boolean, colorUtilityPrefixes: string[], paletteNames: string[] }} PaletteRule */
/** @typedef {{ enabled: boolean, allowedKeywords: string[], allowedNumericValues: string[], prefixes: string[] }} SpacingRule */
/** @typedef {{ enabled: boolean, disallowedValues: string[], prefixes: string[] }} ContainerRule */
/** @typedef {{ noArbitraryValues: ArbitraryValuesRule, noTailwindContainerScale: ContainerRule, noTailwindPalette: PaletteRule, noTailwindSpacingScale: SpacingRule }} RulesConfig */
/** @typedef {{ exclude: string[], fileExtensions: string[], rules: RulesConfig, scanDirectories: string[] }} TokenUsageConfig */
/** @typedef {{ absoluteDir: string, excludeRegexes: RegExp[], extensions: Set<string>, files: string[], rootDir: string }} CollectFilesOptions */

const DEFAULT_CONFIG_PATH = "scripts/token-usage.config.mjs"
const BASE_EXCLUDE_PATTERNS = [
  "**/node_modules/**",
  "**/.next/**",
  "**/.git/**",
]
const CLASS_TOKEN_SPLIT_REGEX = /\s+/u
const VARIANT_PREFIX_REGEX =
  /^(?:[a-z0-9@_-]+:|[a-z0-9@_-]+-\[[^\]]+\]:|data-\[[^\]]+\]:|aria-\[[^\]]+\]:|\[[^\]]+\]:|\*:|!)/iu
const PLAUSIBLE_CLASS_TOKEN_REGEX = /[a-z]/iu
const CSS_TOKEN_SHORTHAND_REGEX = /\(--[\w-]+\)/u
const CSS_VAR_TOKEN_REGEX = /var\(--[\w-]+\)/u
const OPACITY_SUFFIX_REGEX = /\/\d+$/u
const NUMERIC_SCALE_VALUE_REGEX = /^\d+(?:\.\d+)?$/u
const TEMPLATE_EXPRESSION_REGEX = /\$\{[^}]*\}/gu
const WHITESPACE_REGEX = /\s+/gu
const CLASS_NAME_REGEXES = [
  /className\s*=\s*"(?<classString>[^"]+)"/gu,
  /className\s*=\s*'(?<classString>[^']+)'/gu,
  /className\s*=\s*`(?<classString>[\s\S]*?)`/gu,
  /className\s*=\s*\{\s*"(?<classString>[^"]+)"\s*\}/gu,
  /className\s*=\s*\{\s*'(?<classString>[^']+)'\s*\}/gu,
  /className\s*=\s*\{\s*`(?<classString>[\s\S]*?)`\s*\}/gu,
  /\bclassName\s*:\s*"(?<classString>[^"]+)"/gu,
  /\bclassName\s*:\s*'(?<classString>[^']+)'/gu,
  /\bclassName\s*:\s*`(?<classString>[\s\S]*?)`/gu,
]
const UTILITY_CALL_REGEX = /\b(?:cn|clsx)\s*\((?<argsBlock>[\s\S]*?)\)/gu
const STRING_LITERAL_REGEX =
  /(?<quote>["'`])(?<classString>(?:\\.|(?!\k<quote>)[\s\S])*?)\k<quote>/gu

/** @type {(globPattern: string) => RegExp} */
const buildGlobRegex = globToRegExp
/** @type {(value: string) => string} */
const normalizeFilePath = normalizePath
/** @type {(argv: string[], defaultConfigPath: string) => GuardrailArgs} */
const parseArgs = parseGuardrailArgs

/** @param {unknown} value @returns {value is object} */
const isObject = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/** @param {object} value @param {string} key @returns {unknown} */
const readProperty = (value, key) => Reflect.get(value, key)

/** @param {unknown} value @param {string} label @returns {string[]} */
const parseStringArray = (value, label) => {
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === "string")
  ) {
    throw new TypeError(`${label} must be an array of strings.`)
  }
  return value
}

/** @param {unknown} value @param {string} label @returns {RegExp[]} */
const parseRegExpArray = (value, label) => {
  if (!Array.isArray(value) || !value.every((item) => item instanceof RegExp)) {
    throw new TypeError(`${label} must be an array of regular expressions.`)
  }
  return value
}

/** @param {unknown} value @param {string} label @returns {object} */
const parseObject = (value, label) => {
  if (!isObject(value)) {
    throw new TypeError(`${label} must be an object.`)
  }
  return value
}

/** @param {object} rule @param {string} label @returns {boolean} */
const parseEnabled = (rule, label) => {
  const enabled = readProperty(rule, "enabled")
  if (typeof enabled !== "boolean") {
    throw new TypeError(`${label}.enabled must be a boolean.`)
  }
  return enabled
}

/** @param {unknown} value @returns {TokenUsageConfig} */
const parseConfig = (value) => {
  const config = parseObject(value, "config")
  const rules = parseObject(readProperty(config, "rules"), "rules")
  const arbitraryRule = parseObject(
    readProperty(rules, "noArbitraryValues"),
    "rules.noArbitraryValues",
  )
  const containerRule = parseObject(
    readProperty(rules, "noTailwindContainerScale"),
    "rules.noTailwindContainerScale",
  )
  const paletteRule = parseObject(
    readProperty(rules, "noTailwindPalette"),
    "rules.noTailwindPalette",
  )
  const spacingRule = parseObject(
    readProperty(rules, "noTailwindSpacingScale"),
    "rules.noTailwindSpacingScale",
  )

  return {
    exclude: parseStringArray(readProperty(config, "exclude"), "exclude"),
    fileExtensions: parseStringArray(
      readProperty(config, "fileExtensions"),
      "fileExtensions",
    ),
    rules: {
      noArbitraryValues: {
        enabled: parseEnabled(arbitraryRule, "rules.noArbitraryValues"),
        validClassPatterns: parseRegExpArray(
          readProperty(arbitraryRule, "validClassPatterns"),
          "rules.noArbitraryValues.validClassPatterns",
        ),
      },
      noTailwindContainerScale: {
        disallowedValues: parseStringArray(
          readProperty(containerRule, "disallowedValues"),
          "rules.noTailwindContainerScale.disallowedValues",
        ),
        enabled: parseEnabled(containerRule, "rules.noTailwindContainerScale"),
        prefixes: parseStringArray(
          readProperty(containerRule, "prefixes"),
          "rules.noTailwindContainerScale.prefixes",
        ),
      },
      noTailwindPalette: {
        colorUtilityPrefixes: parseStringArray(
          readProperty(paletteRule, "colorUtilityPrefixes"),
          "rules.noTailwindPalette.colorUtilityPrefixes",
        ),
        enabled: parseEnabled(paletteRule, "rules.noTailwindPalette"),
        paletteNames: parseStringArray(
          readProperty(paletteRule, "paletteNames"),
          "rules.noTailwindPalette.paletteNames",
        ),
      },
      noTailwindSpacingScale: {
        allowedKeywords: parseStringArray(
          readProperty(spacingRule, "allowedKeywords"),
          "rules.noTailwindSpacingScale.allowedKeywords",
        ),
        allowedNumericValues: parseStringArray(
          readProperty(spacingRule, "allowedNumericValues"),
          "rules.noTailwindSpacingScale.allowedNumericValues",
        ),
        enabled: parseEnabled(spacingRule, "rules.noTailwindSpacingScale"),
        prefixes: parseStringArray(
          readProperty(spacingRule, "prefixes"),
          "rules.noTailwindSpacingScale.prefixes",
        ),
      },
    },
    scanDirectories: parseStringArray(
      readProperty(config, "scanDirectories"),
      "scanDirectories",
    ),
  }
}

/** @param {string} content @returns {number[]} */
const buildLineStarts = (content) => {
  const starts = [0]
  for (let index = 0; index < content.length; index += 1) {
    if (content[index] === "\n") {
      starts.push(index + 1)
    }
  }
  return starts
}

/** @param {number[]} lineStarts @param {number} index @returns {number} */
const lineFromIndex = (lineStarts, index) => {
  let low = 0
  let high = lineStarts.length - 1
  let line = 1

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const value = lineStarts[mid]
    if (value === undefined) {
      throw new RangeError(`Missing line start at index ${mid}.`)
    }

    if (value <= index) {
      line = mid + 1
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  return line
}

/** @param {string} value @returns {string} */
const sanitizeClassString = (value) =>
  value
    .replaceAll(TEMPLATE_EXPRESSION_REGEX, " ")
    .replaceAll(WHITESPACE_REGEX, " ")
    .trim()

/** @param {string} value @returns {string[]} */
const tokenizeClassString = (value) =>
  sanitizeClassString(value)
    .split(CLASS_TOKEN_SPLIT_REGEX)
    .map((token) => token.trim())
    .filter((token) => token.length > 0)

/** @param {string} token @returns {boolean} */
const isPlausibleClassToken = (token) =>
  token.length > 1 &&
  !token.startsWith("//") &&
  PLAUSIBLE_CLASS_TOKEN_REGEX.test(token)

/** @param {string} content @returns {ClassEntry[]} */
const extractClassEntries = (content) => {
  /** @type {ClassEntry[]} */
  const entries = []
  /** @type {Set<string>} */
  const seen = new Set()
  const lineStarts = buildLineStarts(content)

  /** @param {string} classString @param {number} absoluteIndex */
  const addClassString = (classString, absoluteIndex) => {
    const line = lineFromIndex(lineStarts, absoluteIndex)
    for (const className of tokenizeClassString(classString)) {
      const key = `${line}:${className}`
      if (isPlausibleClassToken(className) && !seen.has(key)) {
        seen.add(key)
        entries.push({ className, line })
      }
    }
  }

  for (const regex of CLASS_NAME_REGEXES) {
    for (const match of content.matchAll(regex)) {
      const classString = match.groups?.classString
      if (classString !== undefined && match.index !== undefined) {
        addClassString(classString, match.index + match[0].indexOf(classString))
      }
    }
  }

  for (const match of content.matchAll(UTILITY_CALL_REGEX)) {
    const argsBlock = match.groups?.argsBlock
    if (argsBlock !== undefined && match.index !== undefined) {
      const callStart = match.index + match[0].indexOf(argsBlock)
      for (const stringMatch of argsBlock.matchAll(STRING_LITERAL_REGEX)) {
        const classString = stringMatch.groups?.classString
        if (classString !== undefined && stringMatch.index !== undefined) {
          const literalStart =
            callStart + stringMatch.index + stringMatch[0].indexOf(classString)
          addClassString(classString, literalStart)
        }
      }
    }
  }

  return entries
}

/** @param {string} className @returns {string} */
const stripVariants = (className) => {
  let base = className.trim()
  while (VARIANT_PREFIX_REGEX.test(base)) {
    base = base.replace(VARIANT_PREFIX_REGEX, "")
  }
  return base
}

/** @param {string} baseClass @param {string[]} prefixes @returns {PrefixValue | null} */
const resolvePrefixValue = (baseClass, prefixes) => {
  const normalized = baseClass.startsWith("-") ? baseClass.slice(1) : baseClass

  for (let index = prefixes.length - 1; index >= 0; index -= 1) {
    const prefix = prefixes[index]
    if (prefix === undefined) {
      throw new RangeError(`Missing prefix at index ${index}.`)
    }
    const prefixWithDash = `${prefix}-`
    if (normalized.startsWith(prefixWithDash)) {
      return {
        normalized,
        prefix,
        value: normalized.slice(prefixWithDash.length),
      }
    }
  }

  return null
}

/** @param {string} className @param {ArbitraryValuesRule} ruleConfig @returns {RuleFinding | null} */
const checkNoArbitraryValues = (className, ruleConfig) => {
  if (!ruleConfig.enabled) {
    return null
  }

  const baseClass = stripVariants(className)
  if (
    ruleConfig.validClassPatterns.some(
      (pattern) => pattern.test(className) || pattern.test(baseClass),
    )
  ) {
    return null
  }

  const hasArbitrarySyntax =
    baseClass.includes("[") ||
    baseClass.includes("]") ||
    CSS_TOKEN_SHORTHAND_REGEX.test(baseClass) ||
    CSS_VAR_TOKEN_REGEX.test(baseClass)

  return hasArbitrarySyntax
    ? {
        message:
          "Nepoužívej arbitrary utility hodnoty, použij token utility z libs/ui.",
        rule: "no-arbitrary-values",
      }
    : null
}

/** @param {string} className @param {PaletteRule} ruleConfig @returns {RuleFinding | null} */
const checkNoTailwindPalette = (className, ruleConfig) => {
  if (!ruleConfig.enabled) {
    return null
  }

  const baseClass = stripVariants(className).replace(OPACITY_SUFFIX_REGEX, "")
  const match = resolvePrefixValue(baseClass, ruleConfig.colorUtilityPrefixes)
  if (match === null) {
    return null
  }

  const { value } = match
  const isPalette = ruleConfig.paletteNames.some(
    (colorName) => value === colorName || value.startsWith(`${colorName}-`),
  )
  return isPalette
    ? {
        message: `Nepoužívej Tailwind palette (${value}), použij semantic token (např. text-fg-primary).`,
        rule: "no-tailwind-palette",
      }
    : null
}

/** @param {string} className @param {SpacingRule} ruleConfig @returns {RuleFinding | null} */
const checkNoTailwindSpacingScale = (className, ruleConfig) => {
  if (!ruleConfig.enabled) {
    return null
  }

  const match = resolvePrefixValue(
    stripVariants(className),
    ruleConfig.prefixes,
  )
  if (match === null) {
    return null
  }

  const { value } = match
  const hasSpecialSyntax =
    value.length === 0 ||
    value.includes("/") ||
    value.startsWith("[") ||
    value.startsWith("(")
  const isAllowed =
    ruleConfig.allowedKeywords.includes(value) ||
    !NUMERIC_SCALE_VALUE_REGEX.test(value) ||
    ruleConfig.allowedNumericValues.includes(value)

  return hasSpecialSyntax || isAllowed
    ? null
    : {
        message: `Nepoužívej Tailwind spacing scale (${match.prefix}-${value}), použij token scale.`,
        rule: "no-tailwind-spacing-scale",
      }
}

/** @param {string} className @param {ContainerRule} ruleConfig @returns {RuleFinding | null} */
const checkNoTailwindContainerScale = (className, ruleConfig) => {
  if (!ruleConfig.enabled) {
    return null
  }

  const match = resolvePrefixValue(
    stripVariants(className),
    ruleConfig.prefixes,
  )
  if (match === null) {
    return null
  }

  const { value } = match
  const hasPlainValue =
    value.length > 0 &&
    !value.startsWith("[") &&
    !value.startsWith("(") &&
    !value.includes("/")

  return hasPlainValue && ruleConfig.disallowedValues.includes(value)
    ? {
        message: `Nepoužívej default container scale (${match.prefix}-${value}), použij container token (např. max-w-max-w).`,
        rule: "no-tailwind-container-scale",
      }
    : null
}

/** @param {string} className @param {RulesConfig} rulesConfig @returns {RuleFinding | null} */
const validateClass = (className, rulesConfig) =>
  checkNoArbitraryValues(className, rulesConfig.noArbitraryValues) ??
  checkNoTailwindPalette(className, rulesConfig.noTailwindPalette) ??
  checkNoTailwindSpacingScale(className, rulesConfig.noTailwindSpacingScale) ??
  checkNoTailwindContainerScale(className, rulesConfig.noTailwindContainerScale)

/** @param {string} relativePath @param {RegExp[]} excludeRegexes @returns {boolean} */
const shouldScanEntry = (relativePath, excludeRegexes) =>
  !excludeRegexes.some((regex) => regex.test(relativePath))

/** @param {CollectFilesOptions} options File collection options. */
const collectSourceFilesFromDirectory = ({
  absoluteDir,
  excludeRegexes,
  extensions,
  files,
  rootDir,
}) => {
  if (!existsSync(absoluteDir)) {
    return
  }

  const entries = readdirSync(absoluteDir, { withFileTypes: true })
  for (const entry of entries) {
    const absolutePath = path.join(absoluteDir, entry.name)
    const relativePath = normalizeFilePath(path.relative(rootDir, absolutePath))

    if (shouldScanEntry(relativePath, excludeRegexes)) {
      if (entry.isDirectory()) {
        collectSourceFilesFromDirectory({
          absoluteDir: absolutePath,
          excludeRegexes,
          extensions,
          files,
          rootDir,
        })
      } else if (entry.isFile() && extensions.has(path.extname(entry.name))) {
        files.push(relativePath)
      }
    }
  }
}

/** @param {string} rootDir @param {TokenUsageConfig} config @returns {string[]} */
const listSourceFiles = (rootDir, config) => {
  const extensions = new Set(config.fileExtensions)
  const excludeRegexes = [...BASE_EXCLUDE_PATTERNS, ...config.exclude].map(
    buildGlobRegex,
  )
  /** @type {string[]} */
  const files = []

  for (const relativeDir of config.scanDirectories) {
    collectSourceFilesFromDirectory({
      absoluteDir: path.resolve(rootDir, relativeDir),
      excludeRegexes,
      extensions,
      files,
      rootDir,
    })
  }

  return files
}

/** @param {Finding[]} findings @param {number} scannedFileCount */
const printSummary = (findings, scannedFileCount) => {
  /** @type {Map<string, number>} */
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
  for (const [rule, count] of byRule) {
    console.log(`- ${rule}: ${count}`)
  }

  /** @type {Map<string, Finding[]>} */
  const groupedByFile = new Map()
  for (const finding of findings) {
    const fileFindings = groupedByFile.get(finding.file) ?? []
    fileFindings.push(finding)
    groupedByFile.set(finding.file, fileFindings)
  }

  for (const [file, fileFindings] of groupedByFile) {
    console.log(`\n${file}`)
    for (const finding of fileFindings) {
      console.log(`  L${finding.line} ${finding.className}`)
      console.log(`    ${finding.message}`)
    }
  }
}

/** @param {string} configPath @returns {Promise<TokenUsageConfig>} */
const loadConfig = async (configPath) => {
  /** @type {unknown} */
  const configModule = await import(pathToFileURL(configPath).href)
  const configValue =
    isObject(configModule) && "default" in configModule
      ? readProperty(configModule, "default")
      : configModule
  return parseConfig(configValue)
}

const main = async () => {
  const args = parseArgs(argv.slice(2), DEFAULT_CONFIG_PATH)
  const rootDir = cwd()
  const configPath = path.resolve(rootDir, args.configPath)

  if (!existsSync(configPath)) {
    console.error(`Config file not found: ${configPath}`)
    exit(2)
  }

  /** @type {unknown} */
  const defaultConfigValue = defaultConfig
  const config =
    args.configPath === DEFAULT_CONFIG_PATH
      ? parseConfig(defaultConfigValue)
      : await loadConfig(configPath)
  const sourceFiles = listSourceFiles(rootDir, config)
  /** @type {Finding[]} */
  const findings = []

  for (const file of sourceFiles) {
    const absoluteFilePath = path.resolve(rootDir, file)
    const content = readFileSync(absoluteFilePath, "utf-8")
    const classEntries = extractClassEntries(content)

    for (const entry of classEntries) {
      const ruleFinding = validateClass(entry.className, config.rules)
      if (ruleFinding !== null) {
        findings.push({
          className: entry.className,
          file,
          line: entry.line,
          message: ruleFinding.message,
          rule: ruleFinding.rule,
        })
      }
    }
  }

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          findings,
          scannedFiles: sourceFiles.length,
          violationCount: findings.length,
        },
        null,
        2,
      ),
    )
  } else {
    printSummary(findings, sourceFiles.length)
  }

  exit(findings.length > 0 ? 1 : 0)
}

try {
  await main()
} catch (error) {
  console.error("Token usage validation failed.")
  console.error(error instanceof Error ? error.message : String(error))
  exit(1)
}

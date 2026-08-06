#!/usr/bin/env node
// @ts-check
/// <reference types="node" />

import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { pathToFileURL } from "node:url"

import { parseSync, Visitor } from "oxc-parser"

import { globToRegExp, parseGuardrailArgs } from "./guardrail-utils.mjs"
import defaultConfig from "./ui-primitives.config.mjs"

/** @typedef {{ filePattern?: string, tag?: string }} AllowByFileConfig */
/** @typedef {{ enabled?: boolean, message?: string, modulePatterns?: (RegExp | string)[] }} BannedImportsConfig */
/** @typedef {{ allowByFile?: AllowByFileConfig[], enabled?: boolean, suggestions?: Record<string, string>, tags?: string[] }} BannedJsxTagsConfig */
/** @typedef {{ exclude?: string[], fileExtensions?: string[], rules?: { bannedImports?: BannedImportsConfig, bannedJsxTags?: BannedJsxTagsConfig }, scanDirectories?: string[] }} UiPrimitivesConfig */
/** @typedef {{ fileRegex: RegExp, tag: string }} ParsedAllowByFile */
/** @typedef {{ bannedImports: { enabled: boolean, message: string, modulePatterns: RegExp[] }, bannedJsxTags: { allowByFile: ParsedAllowByFile[], enabled: boolean, suggestions: Record<string, string>, tags: Set<string> } }} RulesConfig */
/** @typedef {{ column: number, detail: string, line: number, message: string, rule: string }} Finding */
/** @typedef {Finding & {file: string}} FileFinding */
/** @typedef {import("oxc-parser").JSXElementName} JSXElementName */
/** @typedef {import("oxc-parser").ImportDeclaration} ImportDeclaration */
/** @typedef {import("oxc-parser").JSXOpeningElement} JSXOpeningElement */

const DEFAULT_CONFIG_PATH = "scripts/ui-primitives.config.mjs"
const BASE_EXCLUDE_PATTERNS = [
  "**/node_modules/**",
  "**/.next/**",
  "**/.git/**",
]

/** @param {string} left - Left value. @param {string} right - Right value. @returns {number} Locale comparison. */
const compareStrings = (left, right) => left.localeCompare(right)

/** @param {[string, number]} left - Left rule entry. @param {[string, number]} right - Right rule entry. @returns {number} Rule comparison. */
const compareRuleEntries = (left, right) => compareStrings(left[0], right[0])

/** @param {[string, FileFinding[]]} left - Left file entry. @param {[string, FileFinding[]]} right - Right file entry. @returns {number} File comparison. */
const compareFileEntries = (left, right) => compareStrings(left[0], right[0])

/** @param {unknown} value - Candidate value. @returns {value is object} Whether value is object-like. */
const isObject = (value) => value !== null && typeof value === "object"

/** @param {object} value - Source object. @param {string} key - Property key. @returns {unknown} Property value. */
const getProperty = (value, key) => Reflect.get(value, key)

/** @param {unknown} value - Candidate value. @returns {value is string[]} Whether value is string array. */
const isStringArray = (value) =>
  Array.isArray(value) && value.every((item) => typeof item === "string")

/** @param {unknown} value - Candidate value. @returns {value is Record<string, string>} Whether value is string record. */
const isStringRecord = (value) => {
  if (!isObject(value) || Array.isArray(value)) {
    return false
  }
  return Object.keys(value).every(
    (key) => typeof getProperty(value, key) === "string",
  )
}

/** @param {unknown} value - Candidate value. @returns {value is AllowByFileConfig} Whether value is allowlist entry. */
const isAllowByFileConfig = (value) => {
  if (!isObject(value)) {
    return false
  }
  const filePattern = getProperty(value, "filePattern")
  const tag = getProperty(value, "tag")
  const filePatternValid =
    filePattern === undefined || typeof filePattern === "string"
  const tagValid = tag === undefined || typeof tag === "string"
  return filePatternValid && tagValid
}

/** @param {unknown} value - Candidate value. @returns {value is BannedImportsConfig} Whether value is banned-import config. */
const isBannedImportsConfig = (value) => {
  if (!isObject(value)) {
    return false
  }
  const enabled = getProperty(value, "enabled")
  const message = getProperty(value, "message")
  const modulePatterns = getProperty(value, "modulePatterns")
  const enabledValid = enabled === undefined || typeof enabled === "boolean"
  const messageValid = message === undefined || typeof message === "string"
  const patternsValid =
    modulePatterns === undefined ||
    (Array.isArray(modulePatterns) &&
      modulePatterns.every(
        (pattern) => typeof pattern === "string" || pattern instanceof RegExp,
      ))
  return enabledValid && messageValid && patternsValid
}

/** @param {unknown} value - Candidate value. @returns {value is BannedJsxTagsConfig} Whether value is banned-tag config. */
const isBannedJsxTagsConfig = (value) => {
  if (!isObject(value)) {
    return false
  }
  const allowByFile = getProperty(value, "allowByFile")
  const enabled = getProperty(value, "enabled")
  const suggestions = getProperty(value, "suggestions")
  const tags = getProperty(value, "tags")
  const allowlistValid =
    allowByFile === undefined ||
    (Array.isArray(allowByFile) && allowByFile.every(isAllowByFileConfig))
  const enabledValid = enabled === undefined || typeof enabled === "boolean"
  const suggestionsValid =
    suggestions === undefined || isStringRecord(suggestions)
  const tagsValid = tags === undefined || isStringArray(tags)
  return allowlistValid && enabledValid && suggestionsValid && tagsValid
}

/** @param {unknown} value - Candidate value. @returns {value is UiPrimitivesConfig} Whether value is valid config. */
const isUiPrimitivesConfig = (value) => {
  if (!isObject(value)) {
    return false
  }
  const exclude = getProperty(value, "exclude")
  if (exclude !== undefined && !isStringArray(exclude)) {
    return false
  }
  const fileExtensions = getProperty(value, "fileExtensions")
  if (fileExtensions !== undefined && !isStringArray(fileExtensions)) {
    return false
  }
  const scanDirectories = getProperty(value, "scanDirectories")
  if (scanDirectories !== undefined && !isStringArray(scanDirectories)) {
    return false
  }
  const rules = getProperty(value, "rules")
  if (rules === undefined) {
    return true
  }
  if (!isObject(rules)) {
    return false
  }
  const bannedImports = getProperty(rules, "bannedImports")
  const bannedJsxTags = getProperty(rules, "bannedJsxTags")
  return (
    (bannedImports === undefined || isBannedImportsConfig(bannedImports)) &&
    (bannedJsxTags === undefined || isBannedJsxTagsConfig(bannedJsxTags))
  )
}

/** @param {string} rootDir - Scan root. @param {UiPrimitivesConfig} config - Scan config. @returns {string[]} Sorted source paths. */
const listSourceFiles = (rootDir, config) => {
  const extensions = new Set(config.fileExtensions ?? [".ts", ".tsx"])
  const excludeRegexes = [
    ...BASE_EXCLUDE_PATTERNS,
    ...(config.exclude ?? []),
  ].map(globToRegExp)
  const scanDirectories = config.scanDirectories ?? []
  /** @type {string[]} */
  const files = []

  /** @param {string} absoluteDir - Directory to scan. */
  const walk = (absoluteDir) => {
    if (!fs.existsSync(absoluteDir)) {
      return
    }
    const entries = fs.readdirSync(absoluteDir, { withFileTypes: true })
    for (const entry of entries) {
      const entryName = entry.name
      const absolutePath = path.join(absoluteDir, entryName)
      const platformRelativePath = path.relative(rootDir, absolutePath)
      const relativePath = platformRelativePath.replaceAll(path.sep, "/")
      const excluded = excludeRegexes.some((regex) => regex.test(relativePath))
      if (!excluded && entry.isDirectory()) {
        walk(absolutePath)
      } else if (
        !excluded &&
        entry.isFile() &&
        extensions.has(path.extname(entryName))
      ) {
        files.push(relativePath)
      }
    }
  }

  for (const relativeDir of scanDirectories) {
    walk(path.resolve(rootDir, relativeDir))
  }
  const sortedFiles = [...files]
  sortedFiles.sort(compareStrings)
  return sortedFiles
}

/** @param {UiPrimitivesConfig} config - Raw config. @returns {RulesConfig} Normalized rules. */
const parseRuleConfig = (config) => {
  const rules = config.rules ?? {}
  const bannedJsxTags = rules.bannedJsxTags ?? { enabled: false }
  const bannedImports = rules.bannedImports ?? { enabled: false }
  const allowByFile = (bannedJsxTags.allowByFile ?? []).map((item) => ({
    fileRegex: globToRegExp(item.filePattern ?? ""),
    tag: (item.tag ?? "").toLowerCase(),
  }))
  return {
    bannedImports: {
      enabled: Boolean(bannedImports.enabled),
      message:
        bannedImports.message ??
        "Nepovoleny import knihovny. Pouzij komponentu z @techsio/ui-kit.",
      modulePatterns: (bannedImports.modulePatterns ?? []).map((pattern) =>
        pattern instanceof RegExp ? pattern : new RegExp(pattern, "u"),
      ),
    },
    bannedJsxTags: {
      allowByFile,
      enabled: Boolean(bannedJsxTags.enabled),
      suggestions: bannedJsxTags.suggestions ?? {},
      tags: new Set((bannedJsxTags.tags ?? []).map((tag) => tag.toLowerCase())),
    },
  }
}

/** @param {string} content - Source text. @param {number} position - Character offset. @returns {{column: number, line: number}} Source location. */
const getLineAndColumn = (content, position) => {
  const precedingContent = content.slice(0, position)
  const line = precedingContent.split("\n").length
  const lastNewline = precedingContent.lastIndexOf("\n")
  return { column: position - lastNewline, line }
}

/** @param {JSXElementName} node - JSX tag node. @returns {boolean} Whether tag is intrinsic. */
const isIntrinsicTagName = (node) => {
  if (node.type === "JSXIdentifier") {
    const firstCharacter = node.name.at(0)
    return (
      firstCharacter !== undefined &&
      firstCharacter === firstCharacter.toLowerCase()
    )
  }
  return node.type === "JSXNamespacedName"
}

/** @param {JSXElementName} node - JSX tag node. @returns {string} Normalized tag. */
const normalizedTagName = (node) => {
  if (node.type === "JSXIdentifier") {
    return node.name.toLowerCase()
  }
  if (node.type === "JSXNamespacedName") {
    return `${node.namespace.name}:${node.name.name}`.toLowerCase()
  }
  return ""
}

/** @param {string} file - Relative file path. @param {string} tag - Tag name. @param {ParsedAllowByFile[]} allowlist - File allowlist. @returns {boolean} Whether tag is allowed. */
const isTagAllowedForFile = (file, tag, allowlist) => {
  const normalizedFile = file.replaceAll(path.sep, "/")
  return allowlist.some(
    (item) => item.tag === tag && item.fileRegex.test(normalizedFile),
  )
}

/** @param {ImportDeclaration} node - Import node. @param {string} content - Source text. @param {RulesConfig} rules - Parsed rules. @returns {Finding | null} Import finding. */
const resolveBannedImportFinding = (node, content, rules) => {
  if (!rules.bannedImports.enabled || typeof node.source.value !== "string") {
    return null
  }
  const moduleName = node.source.value
  if (
    !rules.bannedImports.modulePatterns.some((pattern) =>
      pattern.test(moduleName),
    )
  ) {
    return null
  }
  const { line, column } = getLineAndColumn(content, node.source.start)
  return {
    column,
    detail: moduleName,
    line,
    message: rules.bannedImports.message,
    rule: "no-banned-ui-imports",
  }
}

/** @param {JSXOpeningElement} node - JSX opening node. @param {string} content - Source text. @param {string} file - Relative file path. @param {RulesConfig} rules - Parsed rules. @returns {Finding | null} JSX finding. */
const resolveBannedJsxTagFinding = (node, content, file, rules) => {
  if (!rules.bannedJsxTags.enabled || !isIntrinsicTagName(node.name)) {
    return null
  }
  const tagName = normalizedTagName(node.name)
  const banned = rules.bannedJsxTags.tags.has(tagName)
  const allowed = isTagAllowedForFile(
    file,
    tagName,
    rules.bannedJsxTags.allowByFile,
  )
  if (!banned || allowed) {
    return null
  }
  const { line, column } = getLineAndColumn(content, node.name.start)
  const suggestion = rules.bannedJsxTags.suggestions[tagName]
  return {
    column,
    detail: `<${tagName}>`,
    line,
    message:
      suggestion === undefined
        ? `Nepouzivej nativni <${tagName}>. Pouzij komponentu z libs/ui.`
        : `Nepouzivej nativni <${tagName}>. ${suggestion}`,
    rule: "no-native-jsx-primitives",
  }
}

/** @param {string} file - Relative file path. @param {string} content - Source text. @param {RulesConfig} rules - Parsed rules. @returns {Finding[]} File findings. */
const collectFileFindings = (file, content, rules) => {
  const parseResult = parseSync(file, content, {
    lang: file.endsWith(".tsx") ? "tsx" : "ts",
    sourceType: "module",
  })
  /** @type {Finding[]} */
  const findings = []
  const dedupe = new Set()
  /** @param {Finding | null} finding - Candidate finding. */
  const pushFinding = (finding) => {
    if (finding === null) {
      return
    }
    const key = `${finding.rule}:${finding.line}:${finding.column}:${finding.detail}`
    if (!dedupe.has(key)) {
      dedupe.add(key)
      findings.push(finding)
    }
  }
  /** @param {ImportDeclaration} node - Import node. */
  const visitImport = (node) => {
    pushFinding(resolveBannedImportFinding(node, content, rules))
  }
  /** @param {JSXOpeningElement} node - JSX opening node. */
  const visitJsxOpening = (node) => {
    pushFinding(resolveBannedJsxTagFinding(node, content, file, rules))
  }
  new Visitor({
    ImportDeclaration: visitImport,
    JSXOpeningElement: visitJsxOpening,
  }).visit(parseResult.program)
  return findings
}

/** @param {FileFinding[]} findings - All findings. @param {number} scannedFileCount - Scanned count. */
const printSummary = (findings, scannedFileCount) => {
  /** @type {Map<string, number>} */
  const byRule = new Map()
  for (const finding of findings) {
    byRule.set(finding.rule, (byRule.get(finding.rule) ?? 0) + 1)
  }
  console.log(`Scanned files: ${scannedFileCount}`)
  if (findings.length === 0) {
    console.log("No UI primitives violations found.")
    return
  }
  console.log(`Total violations: ${findings.length}`)
  /** @type {[string, number][]} */
  const ruleEntries = [...byRule.entries()]
  ruleEntries.sort(compareRuleEntries)
  const sortedRuleEntries = ruleEntries
  for (const [rule, count] of sortedRuleEntries) {
    console.log(`- ${rule}: ${count}`)
  }
  /** @type {Map<string, FileFinding[]>} */
  const groupedByFile = new Map()
  for (const finding of findings) {
    const fileFindings = groupedByFile.get(finding.file) ?? []
    fileFindings.push(finding)
    groupedByFile.set(finding.file, fileFindings)
  }
  /** @type {[string, FileFinding[]][]} */
  const fileEntries = [...groupedByFile.entries()]
  fileEntries.sort(compareFileEntries)
  const sortedFileEntries = fileEntries
  for (const [file, fileFindings] of sortedFileEntries) {
    console.log(`\n${file}`)
    for (const finding of fileFindings) {
      console.log(`  L${finding.line}:${finding.column} ${finding.detail}`)
      console.log(`    ${finding.message}`)
    }
  }
}

/** @param {string} configPath - Absolute config path. @returns {Promise<UiPrimitivesConfig>} Validated config. */
const loadConfig = async (configPath) => {
  /** @type {unknown} */
  const moduleValue = await import(pathToFileURL(configPath).href)
  if (!isObject(moduleValue)) {
    throw new TypeError(`Invalid config: ${configPath}`)
  }
  const config = getProperty(moduleValue, "default") ?? moduleValue
  if (!isUiPrimitivesConfig(config)) {
    throw new TypeError(`Invalid UI primitives config: ${configPath}`)
  }
  return config
}

const main = async () => {
  const args = parseGuardrailArgs(process.argv.slice(2), DEFAULT_CONFIG_PATH)
  const rootDir = process.cwd()
  const configPath = path.resolve(rootDir, args.configPath)
  if (!fs.existsSync(configPath)) {
    console.error(`Config file not found: ${configPath}`)
    process.exit(2)
  }
  /** @type {UiPrimitivesConfig} */
  let config = defaultConfig
  if (args.configPath !== DEFAULT_CONFIG_PATH) {
    config = await loadConfig(configPath)
  }
  const sourceFiles = listSourceFiles(rootDir, config)
  const rules = parseRuleConfig(config)
  /** @type {FileFinding[]} */
  const findings = []
  for (const file of sourceFiles) {
    const content = fs.readFileSync(path.resolve(rootDir, file), "utf-8")
    for (const finding of collectFileFindings(file, content, rules)) {
      findings.push({ file, ...finding })
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
  process.exit(findings.length > 0 ? 1 : 0)
}

try {
  await main()
} catch (error) {
  console.error("UI primitives validation failed.")
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}

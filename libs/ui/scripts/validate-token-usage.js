#!/usr/bin/env node
/// <reference types="node" />
/// <reference types="glob" />

/**
 * Token Usage Validation Script
 *
 * Validates that all Tailwind classes in components have corresponding token definitions.
 * Follows Tailwind v4 theme variable namespace rules for precise mapping.
 */

import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"

import { globSync } from "glob"

/** @typedef {{ className: string, expectedTokens: string[], line: number }} ValidationError */

const ROOT = path.resolve(import.meta.dirname, "..")

// Tailwind v4 namespace to utility prefix mappings
/** @type {Readonly<Record<string, readonly string[]>>} */
const NAMESPACE_MAPPINGS = {
  blur: ["blur"],
  border: ["border"],
  color: [
    "bg",
    "text",
    "border",
    "fill",
    "stroke",
    "outline",
    "ring",
    "ring-offset",
    "shadow",
    "accent",
    "caret",
    "decoration",
  ],
  container: ["w", "h", "min-w", "min-h", "max-w", "max-h"],
  font: ["font"],
  "font-weight": ["font"],
  opacity: ["opacity"],
  radius: ["rounded"],
  shadow: ["shadow", "drop-shadow", "inset-shadow"],
  spacing: [
    "p",
    "px",
    "py",
    "pt",
    "pr",
    "pb",
    "pl",
    "ps",
    "pe",
    "m",
    "mx",
    "my",
    "mt",
    "mr",
    "mb",
    "ml",
    "ms",
    "me",
    "gap",
    "gap-x",
    "gap-y",
    "space-x",
    "space-y",
    "w",
    "h",
    "max-w",
    "min-w",
    "max-h",
    "min-h",
    "top",
    "right",
    "bottom",
    "left",
    "inset",
    "inset-x",
    "inset-y",
  ],
  text: ["text"],
}

// Standard Tailwind utilities to ignore (not custom tokens)
const IGNORE_PATTERNS = [
  // Standard positioning values
  /^(?:top|right|bottom|left|inset|inset-x|inset-y)-(?:0|px|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|auto|full|screen|min|max|fit|end)$/u,

  // Layout & positioning
  /^(?:flex|grid|block|inline|hidden|absolute|relative|fixed|sticky)$/u,
  /^(?:items|justify|content|self)-(?:start|end|center|stretch|between|around|evenly)$/u,
  /^(?:flex|grid)-(?:row|col|flow|wrap|nowrap)$/u,
  /^(?:order|col|row)-(?:start|end|\d+)$/u,

  // Standard spacing (without custom tokens)
  /^(?:p|m|gap|w|h|max-w|min-w|max-h|min-h|top|right|bottom|left|inset|space)-(?:0|px|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|auto|full|screen|min|max|fit|end)$/u,

  // Margin/padding with directional prefixes
  /^(?:ml|mr|mt|mb|mx|my|ms|me|pl|pr|pt|pb|px|py|ps|pe)-(?:0|px|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|auto|full|screen|min|max|fit)$/u,

  // Standard colors including transparent
  /^(?:bg|text|border)-(?:transparent|current|black|white|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d{1,3})?(?:\/\d{1,3})?$/u,
  /^(?:bg|text|border)-(?:transparent|current|black|white|inherit)$/u,

  // Standard typography
  /^text-(?:xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl|left|center|right|justify|start|end)$/u,
  /^font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/u,
  /^font-(?:sans|serif|mono)$/u,
  /^(?:leading|tracking)-(?:none|tight|snug|normal|relaxed|loose|wide|wider|widest)$/u,

  // Standard borders & effects
  /^(?:border|rounded)-(?:none|sm|md|lg|xl|2xl|3xl|full)$/u,
  /^rounded-(?:s|e|t|r|b|l|ss|se|ee|es|tl|tr|br|bl)-(?:none|sm|md|lg|xl|2xl|3xl|full)$/u,
  /^border-(?:0|2|4|8|t|r|b|l|s|e|x|y|color)$/u,
  /^border-(?:collapse|separate)$/u,
  /^shadow-(?:sm|md|lg|xl|2xl|inner|none)$/u,
  /^opacity-(?:0|5|10|20|25|30|40|50|60|70|75|80|90|95|100)$/u,

  // Pseudo-classes and state modifiers
  /^(?:hover|focus|active|disabled|group-hover|group-focus):/u,
  /^data-\[.+\]:/u,

  // Responsive prefixes
  /^(?:sm|md|lg|xl|2xl):/u,

  // Transform & animation
  /^(?:transform|rotate|scale|translate|skew|transition|duration|ease|delay|animate)-.+$/u,

  // Special edge cases
  // Dynamic height references
  /^max-h-\(--available-height\)$/u,
  // Selector prefixes
  /^\*:max-h-\(--available-height\)$/u,
  // Fractional positioning
  /^(?:top|right|bottom|left)-(?:1\/2)$/u,

  // Misc utilities
  /^(?:sr-only|not-sr-only|pointer-events|select|resize|appearance|cursor|outline|ring)-.+$/u,
]

// Precompute prefix helpers for mapping
/** @type {string[]} */
const KNOWN_PREFIXES = []
for (const prefixes of Object.values(NAMESPACE_MAPPINGS)) {
  KNOWN_PREFIXES.push(...prefixes)
}
KNOWN_PREFIXES.sort((first, second) => second.length - first.length)

/** @type {Map<string, string[]>} */
const PREFIX_TO_NAMESPACES = new Map()
for (const [namespace, prefixes] of Object.entries(NAMESPACE_MAPPINGS)) {
  for (const prefix of prefixes) {
    const namespaces = PREFIX_TO_NAMESPACES.get(prefix)
    if (namespaces === undefined) {
      PREFIX_TO_NAMESPACES.set(prefix, [namespace])
    } else {
      namespaces.push(namespace)
    }
  }
}

const CLASS_STRING_REGEX = /\S+/gu
const CLASS_MODIFIER_REGEX = /^(?:[a-z-]+:|data-\[[^\]]+\]:)/iu
/** @type {Set<string>} */
const EXTERNAL_TOKENS = new Set([
  "--available-height",
  "--height",
  "--border-width-badge-dynamic",
])

/**
 * Add whitespace-separated classes to a set.
 *
 * @param {Set<string>} classes Collected classes
 * @param {string} classString Whitespace-separated class string
 */
const addClassString = (classes, classString) => {
  for (const className of classString.match(CLASS_STRING_REGEX) ?? []) {
    classes.add(className.trim())
  }
}

/**
 * Extract one named capture from every match and add its classes.
 *
 * @param {Set<string>} classes Collected classes
 * @param {string} content Source content
 * @param {RegExp} pattern Global matching pattern
 * @param {string} groupName Named capture group
 */
const addCapturedClassStrings = (classes, content, pattern, groupName) => {
  for (const match of content.matchAll(pattern)) {
    const classString = match.groups?.[groupName]
    if (classString !== undefined) {
      addClassString(classes, classString)
    }
  }
}

/**
 * Extract classes from className arrays.
 *
 * @param {Set<string>} classes Collected classes
 * @param {string} content Source content
 */
const extractClassNameArrays = (classes, content) => {
  const arrayPattern =
    /className\s*[:=]\s*(?:\{)?\s*\[(?<arrayContent>[^\]]+)\]/gu
  const stringPattern = /['"`](?<classString>[^'"`]+)['"`]/gu

  for (const match of content.matchAll(arrayPattern)) {
    const arrayContent = match.groups?.arrayContent
    if (arrayContent !== undefined) {
      addCapturedClassStrings(
        classes,
        arrayContent,
        stringPattern,
        "classString",
      )
    }
  }
}

/**
 * Extract static classes from className template literals.
 *
 * @param {Set<string>} classes Collected classes
 * @param {string} content Source content
 */
const extractClassNameTemplates = (classes, content) => {
  const pattern = /className\s*=\s*`(?<classString>[^`]+)`/gu
  for (const match of content.matchAll(pattern)) {
    const classString = match.groups?.classString
    if (classString !== undefined) {
      for (const part of classString.split(/\$\{[^}]+\}/u)) {
        addClassString(classes, part)
      }
    }
  }
}

/**
 * Extract classes from tailwind-variants configurations.
 *
 * @param {Set<string>} classes Collected classes
 * @param {string} content Source content
 */
const extractTailwindVariantClasses = (classes, content) => {
  const configPattern = /tv\s*\(\s*\{[\s\S]*?\}\s*\)/gu
  const slotPattern = /\[\s*['"`](?<classString>[^'"`]+)['"`]/gu
  const variantPattern = /:\s*\{\s*[^}]*['"`](?<classString>[^'"`]+)['"`]/gu

  for (const match of content.matchAll(configPattern)) {
    const [tvConfig] = match
    addCapturedClassStrings(classes, tvConfig, slotPattern, "classString")
    addCapturedClassStrings(classes, tvConfig, variantPattern, "classString")
  }
}

/**
 * Extract classes from clsx and cn calls.
 *
 * @param {Set<string>} classes Collected classes
 * @param {string} content Source content
 */
const extractClassUtilityCalls = (classes, content) => {
  const callPattern = /(?:clsx|cn)\s*\(\s*(?<arguments>[^)]+)\)/gu
  const stringPattern = /['"`](?<classString>[^'"`]+)['"`]/gu

  for (const match of content.matchAll(callPattern)) {
    const argumentsContent = match.groups?.arguments
    if (argumentsContent !== undefined) {
      addCapturedClassStrings(
        classes,
        argumentsContent,
        stringPattern,
        "classString",
      )
    }
  }
}

/**
 * Extract broader quoted strings that resemble CSS classes.
 *
 * @param {Set<string>} classes Collected classes
 * @param {string} content Source content
 */
const extractQuotedClassStrings = (classes, content) => {
  const pattern =
    /['"`](?<classString>[^'"`]*(?:bg-|text-|border-|p-|m-|w-|h-|flex|grid|rounded)[^'"`]*)['"`]/gu

  for (const match of content.matchAll(pattern)) {
    const classString = match.groups?.classString
    if (classString !== undefined && /^[a-z-\s:[\]()]+$/iu.test(classString)) {
      addClassString(classes, classString)
    }
  }
}

/**
 * Extract Tailwind classes from TypeScript/JSX content.
 *
 * @param {string} content TypeScript or JSX source
 * @returns {string[]} Extracted classes
 */
const extractTailwindClasses = (content) => {
  /** @type {Set<string>} */
  const classes = new Set()
  const classContent = content.replaceAll(
    /figma\.enum\(\s*["'][^"']+["']\s*,\s*\{[\s\S]*?\}\s*\)/gu,
    "",
  )

  addCapturedClassStrings(
    classes,
    classContent,
    /className\s*=\s*["'](?<classString>[^"']+)["']/gu,
    "classString",
  )
  extractClassNameArrays(classes, classContent)
  extractClassNameTemplates(classes, classContent)
  extractTailwindVariantClasses(classes, classContent)
  extractClassUtilityCalls(classes, classContent)
  extractQuotedClassStrings(classes, classContent)

  return [...classes].filter((className) => className.length > 0)
}

/**
 * Remove chained state and data prefixes from a class.
 *
 * @param {string} className Tailwind class
 * @returns {string} Class without modifiers
 */
const removeClassModifiers = (className) => {
  let baseClass = className
  while (CLASS_MODIFIER_REGEX.test(baseClass)) {
    baseClass = baseClass.replace(CLASS_MODIFIER_REGEX, "")
  }
  return baseClass
}

/**
 * Map Tailwind utility class to possible CSS custom properties.
 *
 * @param {string} className Tailwind class
 * @returns {string[]} Possible token names
 */
const mapClassToPossibleTokens = (className) => {
  const baseClass = removeClassModifiers(className)
  const normalized = baseClass.startsWith("-") ? baseClass.slice(1) : baseClass
  const prefix = KNOWN_PREFIXES.find((candidate) =>
    normalized.startsWith(`${candidate}-`),
  )

  if (prefix === undefined) {
    return []
  }

  const value = normalized.slice(prefix.length + 1)
  if (value.length === 0) {
    return []
  }

  const possibleTokens = []
  for (const namespace of PREFIX_TO_NAMESPACES.get(prefix) ?? []) {
    possibleTokens.push(
      namespace === "font-weight"
        ? `--font-weight-${value}`
        : `--${namespace}-${value}`,
    )
  }

  if (["p", "px", "py", "pt", "pr", "pb", "pl", "ps", "pe"].includes(prefix)) {
    possibleTokens.push(`--padding-${value}`, `--spacing-${value}`)
  }

  if (["m", "mx", "my", "mt", "mr", "mb", "ml", "ms", "me"].includes(prefix)) {
    possibleTokens.push(`--margin-${value}`, `--spacing-${value}`)
  }

  if (["gap", "gap-x", "gap-y"].includes(prefix)) {
    possibleTokens.push(`--gap-${value}`, `--spacing-${value}`)
  }

  if (["w", "min-w", "max-w"].includes(prefix)) {
    possibleTokens.push(`--width-${value}`)
  }

  if (["h", "min-h", "max-h"].includes(prefix)) {
    possibleTokens.push(`--height-${value}`)
  }

  if (["space-x", "space-y"].includes(prefix)) {
    possibleTokens.push(`--space-${value}`, `--spacing-${value}`)
  }

  if (
    ["inset", "inset-x", "inset-y", "top", "right", "bottom", "left"].includes(
      prefix,
    )
  ) {
    possibleTokens.push(`--inset-${value}`, `--spacing-${value}`)
  }

  return [...new Set(possibleTokens)]
}

/**
 * Load token declarations from CSS files.
 *
 * @param {Set<string>} tokens Collected token names
 */
const loadCssTokens = (tokens) => {
  const tokenFiles = globSync("src/tokens/**/*.css", { cwd: ROOT })
  for (const file of tokenFiles) {
    const content = fs.readFileSync(path.join(ROOT, file), "utf-8")
    for (const match of content.matchAll(/--(?<token>[a-z][a-z0-9-]*)\s*:/gu)) {
      const token = match.groups?.token
      if (token !== undefined) {
        tokens.add(`--${token}`)
      }
    }
  }
}

/**
 * Load custom properties defined in component inline styles.
 *
 * @param {Set<string>} tokens Collected token names
 */
const loadInlineTokens = (tokens) => {
  const componentFiles = globSync("src/**/*.{ts,tsx}", {
    cwd: ROOT,
    ignore: ["**/*.stories.tsx", "**/*.test.tsx", "**/*.spec.tsx"],
  })
  for (const file of componentFiles) {
    const content = fs.readFileSync(path.join(ROOT, file), "utf-8")
    const pattern = /["'](?<token>--[a-z][a-z0-9-]*)["']\s*:/giu
    for (const match of content.matchAll(pattern)) {
      const token = match.groups?.token
      if (token !== undefined) {
        tokens.add(token)
      }
    }
  }
}

/**
 * Load all defined tokens from CSS files and component inline styles.
 *
 * @returns {Set<string>} Defined token names
 */
const loadDefinedTokens = () => {
  /** @type {Set<string>} */
  const tokens = new Set()
  loadCssTokens(tokens)
  loadInlineTokens(tokens)
  return tokens
}

/**
 * Check if a class should be ignored.
 *
 * @param {string} className Tailwind class
 * @returns {boolean} Whether class is a standard ignored utility
 */
const shouldIgnoreClass = (className) =>
  IGNORE_PATTERNS.some((pattern) =>
    pattern.test(removeClassModifiers(className)),
  )

/**
 * Extract tokens referenced directly inside arbitrary utility syntax.
 *
 * @param {string} className Tailwind class
 * @returns {string[]} Referenced token names
 */
const extractTokensFromArbitraryUtility = (className) => {
  /** @type {Set<string>} */
  const tokens = new Set()
  const patterns = [
    /var\(\s*(?<token>--[a-z][a-z0-9-]*)/giu,
    /[:=]\s*(?<token>--[a-z][a-z0-9-]*)/giu,
    /\((?<token>--[a-z][a-z0-9-]*)/giu,
  ]

  for (const pattern of patterns) {
    for (const match of className.matchAll(pattern)) {
      const token = match.groups?.token
      if (token !== undefined) {
        tokens.add(token)
      }
    }
  }
  return [...tokens]
}

/**
 * Find first line containing a class.
 *
 * @param {string} content Component source
 * @param {string} className Tailwind class
 * @returns {number} One-based line number, or zero when not found
 */
const findClassLine = (content, className) =>
  content.split("\n").findIndex((line) => line.includes(className)) + 1

/**
 * Create a missing-token error.
 *
 * @param {string} content Component source
 * @param {string} className Tailwind class
 * @param {string[]} expectedTokens Expected token names
 * @returns {ValidationError} Validation error
 */
const createValidationError = (content, className, expectedTokens) => ({
  className,
  expectedTokens,
  line: findClassLine(content, className),
})

/**
 * Validate one class against defined tokens.
 *
 * @param {string} content Component source
 * @param {string} className Tailwind class
 * @param {Set<string>} definedTokens Defined token names
 * @returns {ValidationError[]} Missing-token errors
 */
const validateClass = (content, className, definedTokens) => {
  const errors = []
  const arbitraryTokens = extractTokensFromArbitraryUtility(className)
  const tokensNeedingCheck = arbitraryTokens.filter(
    (token) => !EXTERNAL_TOKENS.has(token),
  )
  const hasDefinedArbitraryToken = tokensNeedingCheck.some((token) =>
    definedTokens.has(token),
  )

  if (tokensNeedingCheck.length > 0 && !hasDefinedArbitraryToken) {
    errors.push(createValidationError(content, className, tokensNeedingCheck))
  }
  if (
    arbitraryTokens.length > 0 &&
    (tokensNeedingCheck.length === 0 || hasDefinedArbitraryToken)
  ) {
    return errors
  }
  if (shouldIgnoreClass(className)) {
    return errors
  }

  const possibleTokens = mapClassToPossibleTokens(className)
  if (
    possibleTokens.length > 0 &&
    !possibleTokens.some((token) => definedTokens.has(token))
  ) {
    errors.push(createValidationError(content, className, possibleTokens))
  }
  return errors
}

/**
 * Validate all classes in one component file.
 *
 * @param {string} content Component source
 * @param {Set<string>} definedTokens Defined token names
 * @returns {ValidationError[]} Missing-token errors
 */
const validateComponentContent = (content, definedTokens) => {
  const errors = []
  for (const className of extractTailwindClasses(content)) {
    errors.push(...validateClass(content, className, definedTokens))
  }
  return errors
}

/**
 * Report validation errors.
 *
 * @param {Map<string, ValidationError[]>} errorsByFile Errors keyed by file
 * @param {number} totalErrors Total error count
 */
const reportErrors = (errorsByFile, totalErrors) => {
  console.log(`❌ Found ${totalErrors} missing token definitions:\n`)
  for (const [file, errors] of errorsByFile) {
    console.log(`📄 ${file}:`)
    for (const error of errors) {
      const tokenList = error.expectedTokens.join(" OR ")
      console.log(
        `  Line ${error.line}: ${error.className} → Missing token: ${tokenList}`,
      )
    }
    console.log()
  }
}

/**
 * Main validation function.
 *
 * @returns {boolean} Whether all classes reference defined tokens
 */
const validateTokenUsage = () => {
  console.log("🔍 Validating token usage in components...\n")

  const definedTokens = loadDefinedTokens()
  console.log(`📋 Found ${definedTokens.size} defined tokens`)

  const componentFiles = globSync("src/**/*.{ts,tsx}", {
    cwd: ROOT,
    ignore: ["**/*.stories.tsx", "**/*.test.tsx", "**/*.spec.tsx"],
  })
  /** @type {Map<string, ValidationError[]>} */
  const errorsByFile = new Map()
  let totalErrors = 0

  for (const file of componentFiles) {
    const content = fs.readFileSync(path.join(ROOT, file), "utf-8")
    const fileErrors = validateComponentContent(content, definedTokens)
    if (fileErrors.length > 0) {
      errorsByFile.set(file, fileErrors)
      totalErrors += fileErrors.length
    }
  }

  if (totalErrors === 0) {
    console.log(
      "✅ All component classes have corresponding token definitions!",
    )
    return true
  }

  reportErrors(errorsByFile, totalErrors)
  return false
}

const [entryPath] = process.argv.slice(1)
if (
  entryPath !== undefined &&
  pathToFileURL(path.resolve(entryPath)).href === import.meta.url
) {
  try {
    process.exit(validateTokenUsage() ? 0 : 1)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("💥 Validation failed:", message)
    process.exit(1)
  }
}

export { validateTokenUsage, mapClassToPossibleTokens, extractTailwindClasses }

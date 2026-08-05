#!/usr/bin/env node

/// <reference types="node" />

/**
 * Token Definition Validation Script (optimized)
 *
 * - Single-pass indexing of token CSS files
 * - Single-pass scanning of component files
 * - Dependency closure via forward BFS
 * - Optional --profile timings
 */

import { existsSync, readdirSync } from "node:fs"
import fs from "node:fs/promises"
import path from "node:path"
import { performance } from "node:perf_hooks"
import { argv, env } from "node:process"
import { pathToFileURL } from "node:url"

const ROOT = path.resolve(import.meta.dirname, "..")

/**
 * @typedef {object} TokenDefinition
 * @property {string} file - Source file.
 * @property {number} line - Source line.
 * @property {string} value - CSS value.
 */

/** @typedef {TokenDefinition & {name: string}} UnusedToken */

/**
 * @typedef {object} Profiler
 * @property {(label: string) => number} end - End a timing interval.
 * @property {(label: string) => void} mark - Start a timing interval.
 */

/**
 * @typedef {object} ValidationOptions
 * @property {boolean} [failOnUnused] - Fail when unused tokens are found.
 * @property {boolean} [profile] - Print timing details.
 */

const CONFIG = {
  // File patterns to exclude from usage scanning
  excludeFiles: [
    "**/*.stories.tsx",
    "**/*.test.tsx",
    "**/*.spec.tsx",
    "**/node_modules/**",
  ],

  // Patterns to ignore completely
  ignorePatterns: [/^--tw-/u, /_test$/u, /_debug$/u],

  // Token CSS glob
  tokenCssGlob: "src/tokens/components/**/*.css",

  // Tokens to always consider "used" (whitelist)
  whitelistPatterns: [
    /^--color-primary$/u,
    /^--color-secondary$/u,
    /^--color-danger$/u,
    /^--color-warning$/u,
    /^--color-success$/u,
    /^--color-info$/u,
    /^--spacing-\d{2,3}$/u,
    /^--text-(?:xs|sm|md|lg|xl)$/u,
    /^--radius-(?:sm|md|lg)$/u,
    // Base system tokens
    /^--color-.*-(?:50|100|200|300|400|500|600|700|800|900)$/u,
    /^--state-(?:hover|focus|active|disabled)$/u,
  ],
}

/** @type {Readonly<Record<string, readonly string[]>>} */
const UTILITY_MAPPINGS = {
  animate: ["animate"],
  arrow: [],
  aspect: ["aspect"],
  blur: ["blur"],
  border: ["border"],
  color: [
    "bg",
    "text",
    "border",
    "outline",
    "decoration",
    "shadow",
    "inset-shadow",
    "ring",
    "ring-offset",
    "inset-ring",
    "accent",
    "caret",
    "fill",
    "stroke",
  ],
  container: ["w", "h", "min-w", "min-h", "max-w", "max-h"],
  "drop-shadow": ["drop-shadow"],
  duration: ["duration"],
  ease: ["ease"],
  font: ["font"],
  gap: ["gap"],
  height: ["h", "min-h", "max-h"],
  "inset-shadow": ["inset-shadow"],
  leading: ["leading"],
  margin: [
    "m",
    "mx",
    "my",
    "mt",
    "mr",
    "mb",
    "ml",
    "ms",
    "me",
    "-m",
    "-mx",
    "-my",
    "-mt",
    "-mr",
    "-mb",
    "-ml",
    "-ms",
    "-me",
  ],
  opacity: ["opacity"],
  padding: ["p", "px", "py", "pt", "pr", "pb", "pl", "ps", "pe"],
  perspective: ["perspective"],
  radius: ["rounded"],
  shadow: ["shadow"],
  size: ["size"],
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
    "-m",
    "-mx",
    "-my",
    "-mt",
    "-mr",
    "-mb",
    "-ml",
    "-ms",
    "-me",
    "w",
    "h",
    "min-w",
    "min-h",
    "max-w",
    "max-h",
    "inset",
    "inset-x",
    "inset-y",
    "top",
    "right",
    "bottom",
    "left",
    "start",
    "end",
    "-inset",
    "-inset-x",
    "-inset-y",
    "-top",
    "-right",
    "-bottom",
    "-left",
    "-start",
    "-end",
    "gap",
    "gap-x",
    "gap-y",
    "space-x",
    "space-y",
    "size",
    "translate",
    "translate-x",
    "translate-y",
    "-translate",
    "-translate-x",
    "-translate-y",
  ],
  text: ["text"],
  textarea: [],
  tooltip: [],
  tracking: ["tracking"],
  tree: [],
  width: ["w", "min-w", "max-w"],
  z: [],
}

const CUSTOM_PROPERTY_PREFIXES = [
  "arrow",
  "tree",
  "tooltip",
  "textarea",
  "z",
  "opacity-bg",
  "opacity-borderless",
  "spacing-translate",
]

/** @param {boolean} enabled - Whether profiling is enabled. @returns {Profiler} */
const profiled = (enabled) => {
  /** @type {Map<string, number>} */
  const marks = new Map()
  return {
    end: (label) => {
      if (!enabled) {
        return 0
      }
      const now = performance.now()
      const start = marks.get(label) ?? now
      marks.set(label, now)
      return now - start
    },
    mark: (label) => {
      if (enabled) {
        marks.set(label, performance.now())
      }
    },
  }
}

/** @param {string} tokenName - Token name. */
const isWhitelisted = (tokenName) =>
  CONFIG.whitelistPatterns.some((pattern) => pattern.test(tokenName))

/** @param {string} tokenName - Token name. */
const shouldIgnoreToken = (tokenName) =>
  CONFIG.ignorePatterns.some((pattern) => pattern.test(tokenName))

/** @param {unknown} error - Thrown value. */
const getErrorMessage = (error) =>
  error instanceof Error ? error.message : String(error)

/** @param {string} raw - Class-like source text. */
const normalizeClass = (raw) => raw.split(":").at(-1) ?? ""

/** @param {string} directory - Directory path. */
const readDirectory = (directory) => {
  try {
    return readdirSync(directory, { withFileTypes: true })
  } catch (error) {
    console.error(`💥 Failed to inspect ${directory}:`, getErrorMessage(error))
    return []
  }
}

/** @param {string} file - Relative path. */
const isExcludedComponentFile = (file) =>
  file.endsWith(".stories.tsx") ||
  file.endsWith(".test.tsx") ||
  file.endsWith(".spec.tsx")

/** @param {string} pattern - Glob pattern. @returns {string[]} */
const findFiles = (pattern) => {
  const tokenFiles = pattern.endsWith(".css")
  const baseDirectory = tokenFiles
    ? path.join(ROOT, "src/tokens/components")
    : path.join(ROOT, "src")
  const allowedExtensions = tokenFiles
    ? new Set([".css"])
    : new Set([".ts", ".tsx"])
  const files = []
  const pendingDirectories = [baseDirectory]

  while (pendingDirectories.length > 0) {
    const directory = pendingDirectories.pop()
    if (directory === undefined || !existsSync(directory)) {
      continue
    }

    for (const entry of readDirectory(directory)) {
      const absolutePath = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        pendingDirectories.push(absolutePath)
      } else if (allowedExtensions.has(path.extname(entry.name))) {
        const relativePath = path.relative(ROOT, absolutePath)
        if (tokenFiles || !isExcludedComponentFile(relativePath)) {
          files.push(relativePath)
        }
      }
    }
  }
  return files
}

/** @param {string} tokenName - CSS token. @returns {Set<string>} */
const tokenToUtilityClasses = (tokenName) => {
  /** @type {Set<string>} */
  const classes = new Set()
  const tokenParts = tokenName.slice(2).split("-")
  if (tokenParts.length < 2) {
    return classes
  }

  const [primaryNamespace, possibleSubNamespace] = tokenParts
  if (primaryNamespace === undefined) {
    return classes
  }

  const subNamespace =
    tokenParts.length > 2 ? (possibleSubNamespace ?? null) : null
  const key = tokenParts.slice(subNamespace === null ? 1 : 2).join("-")

  let namespace = primaryNamespace
  let tokenKey = key
  if (primaryNamespace === "font" && subNamespace === "weight") {
    namespace = "font-weight"
  } else if (
    subNamespace !== null &&
    UTILITY_MAPPINGS[`${primaryNamespace}-${subNamespace}`] !== undefined
  ) {
    namespace = `${primaryNamespace}-${subNamespace}`
  } else if (subNamespace !== null) {
    tokenKey = `${subNamespace}-${key}`
  }

  const isCustomProperty = CUSTOM_PROPERTY_PREFIXES.some((prefix) =>
    tokenName.includes(`--${prefix}`),
  )
  if (isCustomProperty) {
    return classes
  }

  const prefixes =
    UTILITY_MAPPINGS[namespace] ?? UTILITY_MAPPINGS[primaryNamespace] ?? []
  for (const prefix of prefixes) {
    classes.add(
      namespace === "font-weight"
        ? `font-${tokenKey}`
        : `${prefix}-${tokenKey}`,
    )
  }
  return classes
}

/**
 * @param {string} file - Relative token file.
 * @param {Map<string, TokenDefinition>} defs - Token definitions.
 * @param {Map<string, Set<string>>} dependencyGraph - Token dependencies.
 * @param {Map<string, Set<string>>} cssUsage - Direct CSS usage.
 */
/**
 * @param {string} value - Token value.
 * @returns {Set<string>} - Referenced tokens.
 */
const extractDependencies = (value) => {
  /** @type {Set<string>} */
  const dependencies = new Set()
  for (const match of value.matchAll(/var\(\s*(?<token>--[\w-]+)/gu)) {
    const dependency = match.groups?.token
    if (dependency !== undefined) {
      dependencies.add(dependency)
    }
  }
  return dependencies
}

/**
 * @param {string} content - CSS content.
 * @param {string} file - Relative file path.
 * @param {Map<string, TokenDefinition>} defs - Token definitions.
 * @param {Map<string, Set<string>>} dependencyGraph - Token dependencies.
 */
const indexTokenDefinitions = (content, file, defs, dependencyGraph) => {
  const tokenPattern = /--(?<name>[\w-]+)\s*:\s*(?<value>[^;]+);/gu
  for (const match of content.matchAll(tokenPattern)) {
    const nameGroup = match.groups?.name
    const valueGroup = match.groups?.value
    if (nameGroup !== undefined && valueGroup !== undefined) {
      const name = `--${nameGroup}`
      const value = valueGroup.trim()
      const line = content.slice(0, match.index).split("\n").length
      defs.set(name, { file, line, value })
      dependencyGraph.set(name, extractDependencies(value))
    }
  }
}

/**
 * @param {string[]} lines - CSS lines.
 * @param {string} file - Relative file path.
 * @param {Map<string, TokenDefinition>} defs - Token definitions.
 * @param {Map<string, Set<string>>} cssUsage - Direct CSS usage.
 */
const indexCssUsage = (lines, file, defs, cssUsage) => {
  const definitionLines = new Set()
  for (const definition of defs.values()) {
    if (definition.file === file) {
      definitionLines.add(definition.line)
    }
  }

  for (const [index, line] of lines.entries()) {
    const lineNumber = index + 1
    if (!definitionLines.has(lineNumber) && line.includes("var(")) {
      for (const token of extractDependencies(line)) {
        const locations = cssUsage.get(token) ?? new Set()
        // This is direct usage from a non-definition CSS property.
        locations.add(`${file}:${lineNumber} (CSS property)`)
        cssUsage.set(token, locations)
      }
    }
  }
}

/**
 * @param {string} file - Relative token file.
 * @param {Map<string, TokenDefinition>} defs - Token definitions.
 * @param {Map<string, Set<string>>} dependencyGraph - Token dependencies.
 * @param {Map<string, Set<string>>} cssUsage - Direct CSS usage.
 */
const processTokenFile = async (file, defs, dependencyGraph, cssUsage) => {
  const absolutePath = path.join(ROOT, file)
  if (!existsSync(absolutePath)) {
    return
  }

  try {
    const content = await fs.readFile(absolutePath, "utf-8")
    indexTokenDefinitions(content, file, defs, dependencyGraph)
    indexCssUsage(content.split("\n"), file, defs, cssUsage)
  } catch (error) {
    console.error(`💥 Failed to process ${file}:`, getErrorMessage(error))
  }
}

const buildTokenIndices = async () => {
  const files = findFiles(CONFIG.tokenCssGlob)
  /** @type {Map<string, TokenDefinition>} */
  const defs = new Map()
  /** @type {Map<string, Set<string>>} */
  const dependencyGraph = new Map()
  /** @type {Map<string, Set<string>>} */
  const cssUsage = new Map()

  await Promise.all(
    files.map(async (file) => {
      await processTokenFile(file, defs, dependencyGraph, cssUsage)
    }),
  )

  for (const token of defs.keys()) {
    if (!dependencyGraph.has(token)) {
      dependencyGraph.set(token, new Set())
    }
    if (!cssUsage.has(token)) {
      cssUsage.set(token, new Set())
    }
  }

  return { cssUsage, defs, dependencyGraph }
}

/**
 * @param {string} content - Component content.
 * @param {string} file - Relative file path.
 * @param {Map<string, Set<string>>} componentVarUsage - Direct component usage.
 */
const indexComponentVariables = (content, file, componentVarUsage) => {
  for (const match of content.matchAll(/var\(\s*(?<token>--[\w-]+)/gu)) {
    const token = match.groups?.token
    if (token !== undefined) {
      const locations = componentVarUsage.get(token) ?? new Set()
      const lineNumber = content.slice(0, match.index).split("\n").length
      locations.add(`${file}:${lineNumber} (component var() reference)`)
      componentVarUsage.set(token, locations)
    }
  }
}

/**
 * @param {string} content - Component content.
 * @param {ReadonlySet<string>} knownTokens - Defined tokens.
 * @param {Set<string>} classUsageTokens - Class-based usage.
 */
const indexDirectTokenClasses = (content, knownTokens, classUsageTokens) => {
  for (const match of content.matchAll(/--[a-z0-9-]+/giu)) {
    const [token] = match
    if (knownTokens.has(token)) {
      classUsageTokens.add(token)
    }
  }
}

/**
 * @param {string} content - Component content.
 * @param {Map<string, Set<string>>} classToTokens - Utility-to-token map.
 * @param {Set<string>} classUsageTokens - Class-based usage.
 */
const indexUtilityClasses = (content, classToTokens, classUsageTokens) => {
  const classLikePattern =
    /(?:^|[^A-Za-z0-9_-])(?<className>[A-Za-z0-9_-]+(?::[A-Za-z0-9_[\]-]+)*-[A-Za-z0-9_[\]-]+)/gu
  for (const match of content.matchAll(classLikePattern)) {
    const rawClass = match.groups?.className
    if (rawClass === undefined) {
      continue
    }

    const className = normalizeClass(rawClass)
    const tokens = classToTokens.get(className)
    if (className !== "" && tokens !== undefined) {
      for (const token of tokens) {
        classUsageTokens.add(token)
      }
    }
  }
}

/**
 * @param {string} content - Component content.
 * @param {ReadonlySet<string>} knownTokens - Defined tokens.
 * @param {Set<string>} classUsageTokens - Class-based usage.
 */
const indexVariantTokens = (content, knownTokens, classUsageTokens) => {
  const variantPattern = /@?(?:max|min)-(?<variant>[a-z0-9-]+):/giu
  for (const match of content.matchAll(variantPattern)) {
    const variantKey = match.groups?.variant
    if (variantKey === undefined) {
      continue
    }

    for (const token of [
      `--container-${variantKey}`,
      `--breakpoint-${variantKey}`,
    ]) {
      if (knownTokens.has(token)) {
        classUsageTokens.add(token)
      }
    }
  }
}

/**
 * @param {string} file - Relative component file.
 * @param {Map<string, Set<string>>} classToTokens - Utility-to-token map.
 * @param {ReadonlySet<string>} knownTokens - Defined tokens.
 * @param {Map<string, Set<string>>} componentVarUsage - Direct component usage.
 * @param {Set<string>} classUsageTokens - Class-based usage.
 */
const processComponentFile = async (
  file,
  classToTokens,
  knownTokens,
  componentVarUsage,
  classUsageTokens,
) => {
  const absolutePath = path.join(ROOT, file)
  if (!existsSync(absolutePath)) {
    return
  }

  try {
    const content = await fs.readFile(absolutePath, "utf-8")
    indexComponentVariables(content, file, componentVarUsage)
    indexDirectTokenClasses(content, knownTokens, classUsageTokens)
    indexUtilityClasses(content, classToTokens, classUsageTokens)
    indexVariantTokens(content, knownTokens, classUsageTokens)
  } catch (error) {
    console.error(`💥 Failed to process ${file}:`, getErrorMessage(error))
  }
}

/**
 * @param {Map<string, Set<string>>} classToTokens - Utility-to-token map.
 * @param {ReadonlySet<string>} knownTokens - Defined tokens.
 */
const buildComponentIndices = async (classToTokens, knownTokens) => {
  const files = findFiles("src/**/*.{ts,tsx}")
  /** @type {Map<string, Set<string>>} */
  const componentVarUsage = new Map()
  /** @type {Set<string>} */
  const classUsageTokens = new Set()

  await Promise.all(
    files.map(async (file) => {
      await processComponentFile(
        file,
        classToTokens,
        knownTokens,
        componentVarUsage,
        classUsageTokens,
      )
    }),
  )

  return { classUsageTokens, componentVarUsage }
}

/** @param {readonly string[]} tokens - Defined tokens. */
const computeClassMaps = (tokens) => {
  /** @type {Map<string, Set<string>>} */
  const classToTokens = new Map()
  for (const token of tokens) {
    for (const className of tokenToUtilityClasses(token)) {
      const mappedTokens = classToTokens.get(className) ?? new Set()
      mappedTokens.add(token)
      classToTokens.set(className, mappedTokens)
    }
  }
  return classToTokens
}

/**
 * @param {ReadonlySet<string>} initialUsed - Directly used tokens.
 * @param {Map<string, Set<string>>} dependencyGraph - Token dependencies.
 */
const propagateUsage = (initialUsed, dependencyGraph) => {
  const used = new Set(initialUsed)
  const queue = [...initialUsed]
  for (const current of queue) {
    const dependencies = dependencyGraph.get(current) ?? []
    for (const dependency of dependencies) {
      if (!used.has(dependency)) {
        used.add(dependency)
        queue.push(dependency)
      }
    }
  }
  return used
}

/**
 * @param {readonly string[]} allTokens - Defined tokens.
 * @param {Map<string, Set<string>>} cssUsage - Direct CSS usage.
 * @param {Map<string, Set<string>>} componentVarUsage - Component var usage.
 * @param {ReadonlySet<string>} classUsageTokens - Class-based usage.
 */
const collectDirectUsage = (
  allTokens,
  cssUsage,
  componentVarUsage,
  classUsageTokens,
) => {
  const usedDirect = new Set(classUsageTokens)
  for (const token of allTokens) {
    if (isWhitelisted(token)) {
      usedDirect.add(token)
    }
  }
  for (const [token, locations] of cssUsage) {
    if (locations.size > 0) {
      usedDirect.add(token)
    }
  }
  for (const [token, locations] of componentVarUsage) {
    if (locations.size > 0) {
      usedDirect.add(token)
    }
  }
  return usedDirect
}

/**
 * @param {readonly string[]} allTokens - Defined tokens.
 * @param {ReadonlySet<string>} usedTokens - Transitively used tokens.
 * @param {Map<string, TokenDefinition>} defs - Token definitions.
 * @returns {UnusedToken[]} - Unused token definitions.
 */
const findUnusedTokens = (allTokens, usedTokens, defs) => {
  const unusedTokens = []
  for (const name of allTokens) {
    if (!shouldIgnoreToken(name) && !usedTokens.has(name)) {
      const definition = defs.get(name)
      if (definition !== undefined) {
        unusedTokens.push({ name, ...definition })
      }
    }
  }
  return unusedTokens
}

/** @param {Profiler} profiler - Profiler. @param {string} label - Mark label. */
const logTiming = (profiler, label) => {
  console.log(`⏱️  ${label}: ${profiler.end(label).toFixed(1)}ms`)
}

/** @param {UnusedToken[]} unusedTokens - Unused tokens. */
const logUnusedTokens = (unusedTokens) => {
  /** @type {Map<string, UnusedToken[]>} */
  const byFile = new Map()
  for (const token of unusedTokens) {
    const fileTokens = byFile.get(token.file) ?? []
    fileTokens.push(token)
    byFile.set(token.file, fileTokens)
  }

  for (const [file, tokens] of byFile) {
    console.log(`📄 ${file}:`)
    for (const token of tokens) {
      console.log(`  Line ${token.line}: ${token.name} = ${token.value}`)
    }
    console.log()
  }
}

/**
 * @param {UnusedToken[]} unusedTokens - Unused tokens.
 * @param {number} totalTokens - Total token count.
 * @param {boolean} failOnUnused - Whether unused tokens fail validation.
 */
const reportResults = (unusedTokens, totalTokens, failOnUnused) => {
  console.log("\n📊 Validation Summary:")
  console.log(`   Total tokens: ${totalTokens}`)
  console.log(`   Used tokens: ${totalTokens - unusedTokens.length}`)
  console.log(`   Unused tokens: ${unusedTokens.length}`)

  if (unusedTokens.length === 0) {
    console.log("\n✅ All tokens are being used!")
    return true
  }

  console.log(`\n⚠️  Found ${unusedTokens.length} potentially unused tokens:\n`)
  logUnusedTokens(unusedTokens)
  console.log(
    "💡 Note: Tokens might be used dynamically or externally and not detected.",
  )
  if (!failOnUnused) {
    console.log(
      "ℹ️  Non-blocking mode: treating potentially unused tokens as warnings.",
    )
    return true
  }
  return false
}

/** @param {ValidationOptions} [options] - Validation options. */
const validateTokenDefinitions = async ({
  failOnUnused = false,
  profile = false,
} = {}) => {
  const profiler = profiled(profile)
  profiler.mark("total")
  console.log("🔍 Analyzing token definitions and usage...")

  profiler.mark("tokens")
  const { cssUsage, defs, dependencyGraph } = await buildTokenIndices()
  const allTokens = [...defs.keys()]
  if (profile) {
    logTiming(profiler, "tokens")
  }
  console.log(`📋 Found ${allTokens.length} total tokens\n`)

  profiler.mark("class maps")
  const classToTokens = computeClassMaps(allTokens)
  if (profile) {
    logTiming(profiler, "class maps")
  }

  profiler.mark("components")
  const { classUsageTokens, componentVarUsage } = await buildComponentIndices(
    classToTokens,
    new Set(allTokens),
  )
  if (profile) {
    logTiming(profiler, "components")
  }

  const usedDirect = collectDirectUsage(
    allTokens,
    cssUsage,
    componentVarUsage,
    classUsageTokens,
  )
  profiler.mark("closure")
  const usedTokens = propagateUsage(usedDirect, dependencyGraph)
  if (profile) {
    logTiming(profiler, "closure")
  }

  const result = reportResults(
    findUnusedTokens(allTokens, usedTokens, defs),
    allTokens.length,
    failOnUnused,
  )
  if (profile) {
    logTiming(profiler, "total")
  }
  return result
}

const isMainModule =
  argv[1] !== undefined &&
  pathToFileURL(path.resolve(argv[1])).href === import.meta.url

if (isMainModule) {
  const profile = argv.includes("--profile")
  const failOnUnused =
    argv.includes("--fail-on-unused") ||
    env.VALIDATE_TOKEN_DEFINITIONS_FAIL_ON_UNUSED === "1"

  try {
    const valid = await validateTokenDefinitions({ failOnUnused, profile })
    process.exitCode = valid ? 0 : 1
  } catch (error) {
    console.error("💥 Validation failed:", getErrorMessage(error))
    if (error instanceof Error && error.stack !== undefined) {
      console.error(error.stack)
    }
    process.exitCode = 1
  }
}

export { validateTokenDefinitions }

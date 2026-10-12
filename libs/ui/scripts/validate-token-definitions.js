#!/usr/bin/env node

/**
 * Token Definition Validation Script (optimized)
 *
 * - Single-pass indexing of token CSS files
 * - Single-pass scanning of component files
 * - Dependency closure via forward BFS
 * - Optional --profile timings
 */

import { existsSync, globSync, readFileSync } from "node:fs"
import path from "node:path"
import { performance } from "node:perf_hooks"
import { fileURLToPath, pathToFileURL } from "node:url"
import {
  COLOR_PREFIXES,
  GAP_PREFIXES,
  HEIGHT_PREFIXES,
  INSET_PREFIXES,
  MARGIN_PREFIXES,
  negated,
  PADDING_PREFIXES,
  SINGLE_PREFIX_NAMESPACES,
  SIZING_PREFIXES,
  SPACE_PREFIXES,
  WIDTH_PREFIXES,
} from "./token-utility-prefixes.js"

const ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..")

const TOKEN_DEFINITION_REGEX = /--([\w-]+)\s*:\s*([^;]+);/g
const VAR_REFERENCE_REGEX = /var\(\s*(--[\w-]+)/g
const TOKEN_REFERENCE_REGEX = /--[a-z0-9-]+/gi
// Words with at least one hyphen, optionally with variant prefixes like
// sm:, hover:, data-[...]:
const CLASS_LIKE_REGEX =
  /(^|[^A-Za-z0-9_-])([A-Za-z0-9_-]+(?::[A-Za-z0-9_[\]-]+)*-[A-Za-z0-9_[\]-]+)/g
// Tailwind container/breakpoint variants, e.g. @max-header-desktop:hidden
const MIN_MAX_VARIANT_REGEX = /@?(?:max|min)-([a-z0-9-]+):/gi

// Configuration for validation
const CONFIG = {
  // Tokens to always consider "used" (whitelist)
  whitelistPatterns: [
    /^--color-primary$/,
    /^--color-secondary$/,
    /^--color-danger$/,
    /^--color-warning$/,
    /^--color-success$/,
    /^--color-info$/,
    /^--spacing-\d{2,3}$/,
    /^--text-(xs|sm|md|lg|xl)$/,
    /^--radius-(sm|md|lg)$/,
    // Base system tokens
    /^--color-.*-(50|100|200|300|400|500|600|700|800|900)$/,
    /^--state-(hover|focus|active|disabled)$/,
  ],

  // Patterns to ignore completely
  ignorePatterns: [/^--tw-/, /_test$/, /_debug$/],

  // File patterns to exclude from usage scanning
  excludeFiles: [
    "**/*.stories.tsx",
    "**/*.test.tsx",
    "**/*.spec.tsx",
    "**/node_modules/**",
  ],

  // Token CSS glob
  tokenCssGlob: "src/tokens/components/**/*.css",
}

function isWhitelisted(tokenName) {
  return CONFIG.whitelistPatterns.some((p) => p.test(tokenName))
}

function shouldIgnoreToken(tokenName) {
  return CONFIG.ignorePatterns.some((p) => p.test(tokenName))
}

// Inset utilities here include the logical start/end edges.
const INSET = [...INSET_PREFIXES, "start", "end"]
const TRANSLATE = ["translate", "translate-x", "translate-y"]
const NEGATABLE_MARGIN = [...MARGIN_PREFIXES, ...negated(MARGIN_PREFIXES)]

// Tailwind v4 namespace to utility prefixes. This checker adds inset
// shadow/ring colors and translate/negative spacing utilities.
const UTILITY_PREFIXES = {
  ...SINGLE_PREFIX_NAMESPACES,
  color: [...COLOR_PREFIXES, "inset-shadow", "inset-ring"],
  container: SIZING_PREFIXES,
  spacing: [
    ...PADDING_PREFIXES,
    ...NEGATABLE_MARGIN,
    ...SIZING_PREFIXES,
    ...INSET,
    ...negated(INSET),
    ...GAP_PREFIXES,
    ...SPACE_PREFIXES,
    "size",
    ...TRANSLATE,
    ...negated(TRANSLATE),
  ],
  padding: PADDING_PREFIXES,
  margin: NEGATABLE_MARGIN,
  gap: ["gap"],
  width: WIDTH_PREFIXES,
  height: HEIGHT_PREFIXES,
  size: ["size"],
  tracking: ["tracking"],
  leading: ["leading"],
  "inset-shadow": ["inset-shadow"],
  "drop-shadow": ["drop-shadow"],
  blur: ["blur"],
  perspective: ["perspective"],
  aspect: ["aspect"],
  duration: ["duration"],
  ease: ["ease"],
  animate: ["animate"],
}

// Map CSS token to possible Tailwind utility classes
function tokenToUtilityClasses(tokenName) {
  const classes = new Set()
  const tokenParts = tokenName.slice(2).split("-")
  if (tokenParts.length < 2) {
    return classes
  }

  const primaryNamespace = tokenParts[0]
  const subNamespace = tokenParts.length > 2 ? tokenParts[1] : null
  const key = tokenParts.slice(subNamespace ? 2 : 1).join("-")

  let namespace = primaryNamespace
  let tokenKey = key
  if (primaryNamespace === "font" && subNamespace === "weight") {
    namespace = "font-weight"
  } else if (
    subNamespace &&
    UTILITY_PREFIXES[`${primaryNamespace}-${subNamespace}`]
  ) {
    namespace = `${primaryNamespace}-${subNamespace}`
  } else if (subNamespace) {
    tokenKey = `${subNamespace}-${key}`
  }

  const customPropertyPrefixes = [
    "arrow",
    "tree",
    "tooltip",
    "textarea",
    "z",
    "opacity-bg",
    "opacity-borderless",
    "spacing-translate",
  ]
  if (
    customPropertyPrefixes.some((prefix) => tokenName.includes(`--${prefix}`))
  ) {
    return classes
  }

  const prefixes =
    UTILITY_PREFIXES[namespace] || UTILITY_PREFIXES[primaryNamespace] || []
  for (const prefix of prefixes) {
    if (namespace === "font-weight") {
      classes.add(`font-${tokenKey}`)
    } else {
      classes.add(`${prefix}-${tokenKey}`)
    }
  }
  return classes
}

const lineNumberAt = (content, index) =>
  content.slice(0, index).split("\n").length

const varReferences = (text) =>
  Array.from(text.matchAll(VAR_REFERENCE_REGEX), (match) => match[1])

// Index one token CSS file: definitions, dependency edges, and var() usage on
// non-definition lines (direct CSS usage).
function indexTokenFile(file, content, { defs, dependencyGraph, cssUsage }) {
  const definitionLines = new Map() // token -> last definition line
  for (const match of content.matchAll(TOKEN_DEFINITION_REGEX)) {
    const name = `--${match[1]}`
    const value = match[2].trim()
    const line = lineNumberAt(content, match.index)
    defs.set(name, { value, file, line })
    dependencyGraph.set(name, new Set(varReferences(value)))
    definitionLines.set(name, line)
  }

  const skippedLines = new Set(definitionLines.values())
  for (const [index, line] of content.split("\n").entries()) {
    if (!skippedLines.has(index + 1)) {
      for (const token of varReferences(line)) {
        cssUsage.add(token)
      }
    }
  }
}

// Build indices from token CSS files in a single pass
function buildTokenIndices() {
  const indices = {
    defs: new Map(), // token -> { value, file, line }
    dependencyGraph: new Map(), // token -> Set<token>
    cssUsage: new Set(), // tokens referenced by var() outside definitions
  }
  for (const file of globSync(CONFIG.tokenCssGlob)) {
    const abs = path.join(ROOT, file)
    if (!existsSync(abs)) {
      continue
    }
    try {
      indexTokenFile(file, readFileSync(abs, "utf8"), indices)
    } catch (err) {
      console.error(`💥 Failed to process ${file}:`, err?.message || err)
    }
  }
  return indices
}

// Collect tokens a component file uses via var(), arbitrary utilities,
// utility classes, or container/breakpoint variants.
function collectComponentTokens(content, classToTokens, knownTokens, used) {
  // Direct var(--token) usage in TSX
  for (const token of varReferences(content)) {
    used.add(token)
  }

  // Arbitrary utilities referencing tokens directly, e.g. border-(length:--token)
  for (const [token] of content.matchAll(TOKEN_REFERENCE_REGEX)) {
    if (knownTokens.has(token)) {
      used.add(token)
    }
  }

  // Class-based usage; strip variant prefixes like sm:, hover:, data-[...]:
  for (const match of content.matchAll(CLASS_LIKE_REGEX)) {
    for (const token of classToTokens.get(match[2].split(":").at(-1)) ?? []) {
      used.add(token)
    }
  }

  // Variant-based token usage, e.g. @max-header-desktop:hidden, @min-md:flex
  for (const [, variantKey] of content.matchAll(MIN_MAX_VARIANT_REGEX)) {
    for (const token of [
      `--container-${variantKey}`,
      `--breakpoint-${variantKey}`,
    ]) {
      if (knownTokens.has(token)) {
        used.add(token)
      }
    }
  }
}

// Build component token usage in a single pass
function buildComponentUsage(classToTokens, knownTokens) {
  const files = globSync("src/**/*.{ts,tsx}", {
    cwd: ROOT,
    exclude: CONFIG.excludeFiles,
  })
  const used = new Set()
  for (const file of files) {
    let content
    try {
      content = readFileSync(file, "utf8")
    } catch {
      continue // ignore missing or unreadable files
    }
    collectComponentTokens(content, classToTokens, knownTokens, used)
  }
  return used
}

function computeClassToTokens(tokens) {
  const classToTokens = new Map()
  for (const token of tokens) {
    for (const c of tokenToUtilityClasses(token)) {
      if (!classToTokens.has(c)) {
        classToTokens.set(c, new Set())
      }
      classToTokens.get(c).add(token)
    }
  }
  return classToTokens
}

function propagateUsage(initialUsed, dependencyGraph) {
  const used = new Set(initialUsed)
  const queue = [...initialUsed]
  while (queue.length) {
    const deps = dependencyGraph.get(queue.shift()) ?? []
    for (const d of deps) {
      if (!used.has(d)) {
        used.add(d)
        queue.push(d)
      }
    }
  }
  return used
}

function reportUnusedTokens(unusedTokens) {
  console.log(`\n⚠️  Found ${unusedTokens.length} potentially unused tokens:\n`)
  for (const [file, list] of Map.groupBy(unusedTokens, (tok) => tok.file)) {
    console.log(`📄 ${file}:`)
    for (const t of list) {
      console.log(`  Line ${t.line}: ${t.name} = ${t.value}`)
    }
    console.log()
  }
  console.log(
    "💡 Note: Tokens might be used dynamically or externally and not detected."
  )
}

function validateTokenDefinitions({
  profile = false,
  failOnUnused = false,
} = {}) {
  const totalStart = performance.now()
  const timed = (label, fn) => {
    const start = performance.now()
    const result = fn()
    if (profile) {
      console.log(`⏱️  ${label}: ${(performance.now() - start).toFixed(1)}ms`)
    }
    return result
  }
  const logTotal = () => {
    if (profile) {
      console.log(`⏱️  total: ${(performance.now() - totalStart).toFixed(1)}ms`)
    }
  }
  console.log("🔍 Analyzing token definitions and usage...")

  // 1) Token indices
  const { defs, dependencyGraph, cssUsage } = timed("tokens", buildTokenIndices)
  const allTokens = Array.from(defs.keys())
  console.log(`📋 Found ${allTokens.length} total tokens\n`)

  // 2) Class maps from tokens
  const classToTokens = timed("class maps", () =>
    computeClassToTokens(allTokens)
  )

  // 3) Component usage
  const componentUsage = timed("components", () =>
    buildComponentUsage(classToTokens, new Set(allTokens))
  )

  // 4) Seed used set: whitelist, direct CSS var() usage outside token defs,
  // and component var()/class usage
  const usedDirect = new Set([
    ...allTokens.filter(isWhitelisted),
    ...cssUsage,
    ...componentUsage,
  ])

  // 5) Propagate through dependencies (forward)
  const usedTokens = timed("closure", () =>
    propagateUsage(usedDirect, dependencyGraph)
  )

  // 6) Classify
  const unusedTokens = allTokens
    .filter((t) => !(shouldIgnoreToken(t) || usedTokens.has(t)))
    .map((t) => ({ name: t, ...defs.get(t) }))

  // Report results
  console.log("\n📊 Validation Summary:")
  console.log(`   Total tokens: ${allTokens.length}`)
  console.log(`   Used tokens: ${allTokens.length - unusedTokens.length}`)
  console.log(`   Unused tokens: ${unusedTokens.length}`)

  if (unusedTokens.length === 0) {
    console.log("\n✅ All tokens are being used!")
    logTotal()
    return true
  }

  reportUnusedTokens(unusedTokens)
  if (!failOnUnused) {
    console.log(
      "ℹ️  Non-blocking mode: treating potentially unused tokens as warnings."
    )
  }
  logTotal()
  return !failOnUnused
}

if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  const profile = process.argv.includes("--profile")
  const failOnUnused =
    process.argv.includes("--fail-on-unused") ||
    process.env.VALIDATE_TOKEN_DEFINITIONS_FAIL_ON_UNUSED === "1"
  try {
    process.exit(validateTokenDefinitions({ profile, failOnUnused }) ? 0 : 1)
  } catch (err) {
    console.error("💥 Validation failed:", err?.message || err)
    if (err?.stack) {
      console.error(err.stack)
    }
    process.exit(1)
  }
}

export { validateTokenDefinitions }

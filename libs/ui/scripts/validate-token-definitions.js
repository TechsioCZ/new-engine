#!/usr/bin/env node

/**
 * Token Definition Validation Script (optimized)
 *
 * - Single-pass indexing of token CSS files
 * - Single-pass scanning of component files
 * - Dependency closure via forward BFS
 * - Optional --profile timings
 */

import { execFileSync } from "node:child_process"
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
import {
  conditionalScopes,
  effectiveDefinitions,
  entryApplies,
  loadRuntimeInventory,
  missingVariables,
  referencedVariables,
  tokenInventory,
} from "./validate-token-graph.js"

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
  tokenCssGlob: "src/tokens/**/*.css",
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
  "border-width": ["border"],
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

  if (namespace === "border") {
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
  for (const [file] of loadRuntimeInventory().files) {
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
      content = readFileSync(path.join(ROOT, file), "utf8")
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

// Zag/Floating UI supply these at runtime, not through the token graph.
const RUNTIME_TOKENS = new Set([
  "--available-height",
  "--available-width",
  "--reference-width",
  "--reference-height",
  "--transform-origin",
  "--arrow-x",
  "--arrow-y",
  "--x",
  "--y",
  "--height",
  "--width",
  "--top",
  "--left",
])

function reportCycles(definitions, add) {
  const stack = [],
    visited = new Set(),
    visiting = new Set()
  function visit(name) {
    if (visiting.has(name)) {
      add(definitions.get(name), name, "cycle", [
        ...stack.slice(stack.indexOf(name)),
        name,
      ])
      return
    }
    if (visited.has(name) || !definitions.has(name)) {
      return
    }
    visiting.add(name)
    stack.push(name)
    // CSS substitutes variables BEFORE choosing a light-dark color. Fallback
    // references also contribute cycle edges even if their primary is defined.
    for (const dependency of referencedVariables(definitions.get(name).value)) {
      visit(dependency)
    }
    stack.pop()
    visiting.delete(name)
    visited.add(name)
  }
  for (const name of definitions.keys()) {
    visit(name)
  }
}

function localScopeKey(entry) {
  const utility = entry.ancestors.find(
    (node) => node.type === "atrule" && node.name === "utility"
  )?.params
  return `${utility ?? ""}:${entry.selector}`
}

export function findUndefinedReferences(
  files,
  externalTokens = new Set(),
  entrypoints = null
) {
  const inventory = tokenInventory(files, entrypoints ?? undefined)
  const errors = []
  const reported = new Set()
  const locals = inventory.definitions.filter((entry) => !entry.global)
  const byOwner = Map.groupBy(locals, (entry) => entry.owner)
  const bySelector = Map.groupBy(locals, localScopeKey)
  const external = (name) =>
    externalTokens.has(name) ||
    RUNTIME_TOKENS.has(name) ||
    name.startsWith("--tw-")
  for (const scope of conditionalScopes(inventory)) {
    const definitions = effectiveDefinitions(inventory, scope)
    const isDefined = (name) => definitions.has(name) || external(name)
    const add = (entry, token, kind = "undefined", chain = null) => {
      const key = `${entry.file}:${entry.line}:${token}:${kind}:${scope.brand}:${scope.mode}:${scope.conditions.join("|")}`
      if (reported.has(key)) {
        return
      }
      reported.add(key)
      errors.push({
        file: entry.file,
        line: entry.line,
        token,
        kind,
        chain,
        ...scope,
      })
    }
    for (const entry of definitions.values()) {
      for (const token of missingVariables(entry.value, isDefined)) {
        add(entry, token)
      }
    }
    reportCycles(definitions, add)
    for (const entries of bySelector.values()) {
      const localDefinitions = new Map(
        entries
          .filter((entry) => entryApplies(entry, scope))
          .map((entry) => [entry.name, entry])
      )
      reportCycles(localDefinitions, add)
    }
    const consumers = [...inventory.consumers, ...locals].filter((entry) =>
      entryApplies(entry, scope)
    )
    for (const entry of consumers) {
      // Local aliases may supply the SAME element/utility, never a root or a
      // sibling. Index by owner/selector instead of rescanning the whole graph.
      const candidates = new Set([
        ...(bySelector.get(localScopeKey(entry)) ?? []),
        ...entry.ancestors.flatMap((owner) => byOwner.get(owner) ?? []),
      ])
      const local = [...candidates].filter((candidate) =>
        entryApplies(candidate, scope)
      )
      const localNames = new Set(local.map((candidate) => candidate.name))
      for (const token of missingVariables(
        entry.value,
        (name) => isDefined(name) || localNames.has(name)
      )) {
        add(entry, token)
      }
    }
  }
  return errors
}

function validateReferences() {
  const files = loadRuntimeInventory().files
  // Tailwind provides primitive defaults (font-mono, container widths, etc.).
  const tailwind = readFileSync(
    path.join(ROOT, "node_modules/tailwindcss/theme.css"),
    "utf8"
  )
  const defaults = new Set(
    Array.from(
      tailwind.matchAll(TOKEN_DEFINITION_REGEX),
      (match) => `--${match[1]}`
    )
  )
  const optionalTheme = "src/tokens/theme.css"
  const missing = [
    ...findUndefinedReferences(files, defaults),
    ...findUndefinedReferences(
      [
        ...files,
        [optionalTheme, readFileSync(path.join(ROOT, optionalTheme), "utf8")],
      ],
      defaults,
      ["src/tokens/_tokens-base.css", optionalTheme]
    ),
  ]
  for (const { file, token, line, kind, brand, mode, chain } of missing) {
    console.error(
      `${file}:${line}: ${kind} var(${token}) [${brand}/${mode}]${chain ? ` (${chain.join(" -> ")})` : ""}`
    )
  }
  return missing.length === 0
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
  if (!validateReferences()) {
    return false
  }
  execFileSync(
    process.execPath,
    [fileURLToPath(new URL("./validate-token-scopes.js", import.meta.url))],
    { stdio: "inherit" }
  )

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

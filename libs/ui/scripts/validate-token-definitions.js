#!/usr/bin/env node

/**
 * Token Definition Validation Script (optimized)
 *
 * - Single-pass indexing of token CSS files
 * - Single-pass scanning of component files
 * - Dependency closure via forward BFS
 * - Optional --profile timings
 */

import { existsSync } from "node:fs"
import fs from "node:fs/promises"
import path from "node:path"
import { performance } from "node:perf_hooks"
import { fileURLToPath, pathToFileURL } from "node:url"
import { globSync } from "glob"

const ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..")

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

// Simple stopwatch profiling
function profiled(enabled) {
  const marks = new Map()
  return {
    mark(label) {
      if (!enabled) return
      marks.set(label, performance.now())
    },
    end(label) {
      if (!enabled) return 0
      const start = marks.get(label) ?? performance.now()
      const delta = performance.now() - start
      marks.set(label, performance.now())
      return delta
    },
  }
}

function isWhitelisted(tokenName) {
  return CONFIG.whitelistPatterns.some((p) => p.test(tokenName))
}

function shouldIgnoreToken(tokenName) {
  return CONFIG.ignorePatterns.some((p) => p.test(tokenName))
}

// Map CSS token to possible Tailwind utility classes
function tokenToUtilityClasses(tokenName) {
  const classes = new Set()
  const tokenParts = tokenName.slice(2).split("-")
  if (tokenParts.length < 2) return classes

  const primaryNamespace = tokenParts[0]
  const subNamespace = tokenParts.length > 2 ? tokenParts[1] : null
  const key = tokenParts.slice(subNamespace ? 2 : 1).join("-")

  const mappings = {
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
    padding: ["p", "px", "py", "pt", "pr", "pb", "pl", "ps", "pe"],
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
    gap: ["gap"],
    width: ["w", "min-w", "max-w"],
    height: ["h", "min-h", "max-h"],
    size: ["size"],
    text: ["text"],
    font: ["font"],
    tracking: ["tracking"],
    leading: ["leading"],
    radius: ["rounded"],
    shadow: ["shadow"],
    "inset-shadow": ["inset-shadow"],
    "drop-shadow": ["drop-shadow"],
    blur: ["blur"],
    perspective: ["perspective"],
    aspect: ["aspect"],
    duration: ["duration"],
    ease: ["ease"],
    animate: ["animate"],
    opacity: ["opacity"],
    border: ["border"],
    z: [],
    arrow: [],
    tree: [],
    textarea: [],
    tooltip: [],
  }

  let namespace = primaryNamespace
  let tokenKey = key
  if (primaryNamespace === "font" && subNamespace === "weight") {
    namespace = "font-weight"
  } else if (subNamespace && mappings[`${primaryNamespace}-${subNamespace}`]) {
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

  const prefixes = mappings[namespace] || mappings[primaryNamespace] || []
  for (const prefix of prefixes) {
    if (namespace === "font-weight") {
      classes.add(`font-${tokenKey}`)
    } else {
      classes.add(`${prefix}-${tokenKey}`)
    }
  }
  return classes
}

// Build indices from token CSS files in a single pass
async function buildTokenIndices() {
  const files = globSync(CONFIG.tokenCssGlob)
  const defs = new Map() // token -> { value, file, line }
  const dependencyGraph = new Map() // token -> Set<token>
  const cssUsage = new Map() // token -> Set<location>

  await Promise.all(
    files.map(async (file) => {
      const abs = path.join(ROOT, file)
      if (!existsSync(abs)) return
      try {
        const content = await fs.readFile(abs, "utf8")
        const lines = content.split("\n")

        // 1) Parse token definitions and dependency edges
        const tokenRegex = /--([\w-]+)\s*:\s*([^;]+);/g
        let m
        while ((m = tokenRegex.exec(content)) !== null) {
          const name = `--${m[1]}`
          const value = m[2].trim()
          const line = content.substring(0, m.index).split("\n").length
          defs.set(name, { value, file, line })

          // Extract dependencies from value
          const deps = new Set()
          for (const vm of value.matchAll(/var\(\s*(--[\w-]+)/g)) {
            deps.add(vm[1])
          }
          for (const om of value.matchAll(/oklch\([^)]*var\(\s*(--[\w-]+)/g)) {
            deps.add(om[1])
          }
          dependencyGraph.set(name, deps)
        }

        // 2) Index var() usage on non-definition lines as direct CSS usage
        const defLine = new Set()
        for (const [token, data] of defs) {
          if (data.file === file) defLine.add(data.line)
        }

        for (let i = 0; i < lines.length; i++) {
          const lineNo = i + 1
          if (defLine.has(lineNo)) continue
          const line = lines[i]
          if (!line.includes("var(")) continue
          for (const vm of line.matchAll(/var\(\s*(--[\w-]+)/g)) {
            const t = vm[1]
            if (!cssUsage.has(t)) cssUsage.set(t, new Set())
            cssUsage.get(t).add(`${file}:${lineNo} (CSS property)`) // direct usage
          }
        }
      } catch (err) {
        console.error(`💥 Failed to process ${file}:`, err?.message || err)
      }
    })
  )

  // Ensure every token key exists in maps
  for (const token of defs.keys()) {
    if (!dependencyGraph.has(token)) dependencyGraph.set(token, new Set())
    if (!cssUsage.has(token)) cssUsage.set(token, new Set())
  }

  return { defs, dependencyGraph, cssUsage }
}

// Build component indices in a single pass
async function buildComponentIndices(classToTokens, knownTokens) {
  const files = globSync("src/**/*.{ts,tsx}", {
    cwd: ROOT,
    ignore: CONFIG.excludeFiles,
  })
  const componentVarUsage = new Map() // token -> Set<location>
  const classUsageTokens = new Set() // tokens used via classes

  const normalizeClass = (raw) => {
    // Strip variant prefixes like sm:, hover:, data-[...]: etc.
    if (!raw) return ""
    const parts = String(raw).split(":")
    const core = parts[parts.length - 1]
    return core
  }

  await Promise.all(
    files.map(async (file) => {
      if (!existsSync(file)) return
      try {
        const content = await fs.readFile(file, "utf8")

        // 1) Direct var(--token) usage in TSX
        for (const m of content.matchAll(/var\(\s*(--[\w-]+)/g)) {
          const t = m[1]
          if (!componentVarUsage.has(t)) componentVarUsage.set(t, new Set())
          const lineNo = content.substring(0, m.index).split("\n").length
          componentVarUsage
            .get(t)
            .add(`${file}:${lineNo} (component var() reference)`)
        }

        // 1b) Arbitrary utilities referencing tokens directly, e.g. border-(length:--token)
        for (const m of content.matchAll(/--[a-z0-9-]+/gi)) {
          const t = m[0]
          if (knownTokens.has(t)) {
            classUsageTokens.add(t)
          }
        }

        // 2) Class-based usage: scan whole file for class-like tokens
        // Capture words with at least one hyphen, optionally with variant prefixes like sm:, hover:, data-[...]:
        const classLike =
          /(^|[^A-Za-z0-9_-])([A-Za-z0-9_-]+(?::[A-Za-z0-9_[\]-]+)*-[A-Za-z0-9_[\]-]+)/g
        for (const m of content.matchAll(classLike)) {
          const raw = m[2]
          const cls = normalizeClass(raw)
          if (!cls) continue
          const tokens = classToTokens.get(cls)
          if (!tokens) continue
          for (const t of tokens) classUsageTokens.add(t)
        }

        // 2b) Variant-based token usage for Tailwind container/breakpoint variants
        // Examples: @max-header-desktop:hidden, @min-md:flex
        for (const m of content.matchAll(/@?(?:max|min)-([a-z0-9-]+):/gi)) {
          const variantKey = m[1]
          const candidates = [
            `--container-${variantKey}`,
            `--breakpoint-${variantKey}`,
          ]
          for (const token of candidates) {
            if (knownTokens.has(token)) classUsageTokens.add(token)
          }
        }
      } catch {
        // ignore unreadable files
      }
    })
  )

  return { componentVarUsage, classUsageTokens }
}

function computeClassMaps(tokens) {
  const tokenToClasses = new Map()
  const classToTokens = new Map()
  for (const token of tokens) {
    const classes = tokenToUtilityClasses(token)
    tokenToClasses.set(token, classes)
    for (const c of classes) {
      if (!classToTokens.has(c)) classToTokens.set(c, new Set())
      classToTokens.get(c).add(token)
    }
  }
  return { tokenToClasses, classToTokens }
}

function propagateUsage(initialUsed, dependencyGraph) {
  const used = new Set(initialUsed)
  const queue = [...initialUsed]
  while (queue.length) {
    const cur = queue.shift()
    const deps = dependencyGraph.get(cur)
    if (!deps) continue
    for (const d of deps) {
      if (!used.has(d)) {
        used.add(d)
        queue.push(d)
      }
    }
  }
  return used
}

async function validateTokenDefinitions({
  profile = false,
  failOnUnused = false,
} = {}) {
  const p = profiled(profile)
  p.mark("total")
  console.log("🔍 Analyzing token definitions and usage...")

  // 1) Token indices
  p.mark("tokens")
  const { defs, dependencyGraph, cssUsage } = await buildTokenIndices()
  const allTokens = Array.from(defs.keys())
  if (profile) console.log(`⏱️  tokens: ${p.end("tokens").toFixed(1)}ms`)
  console.log(`📋 Found ${allTokens.length} total tokens\n`)

  // 2) Class maps from tokens
  p.mark("classmaps")
  const { classToTokens } = computeClassMaps(allTokens)
  if (profile) console.log(`⏱️  class maps: ${p.end("classmaps").toFixed(1)}ms`)

  // 3) Component indices
  p.mark("components")
  const { componentVarUsage, classUsageTokens } = await buildComponentIndices(
    classToTokens,
    new Set(allTokens)
  )
  if (profile) console.log(`⏱️  components: ${p.end("components").toFixed(1)}ms`)

  // 4) Seed used set
  const usedDirect = new Set()
  for (const t of allTokens) {
    if (isWhitelisted(t)) usedDirect.add(t)
  }
  // Direct CSS var() usage (outside token defs)
  for (const [t, locs] of cssUsage) {
    if (locs.size > 0) usedDirect.add(t)
  }
  // Component var() usage
  for (const [t, locs] of componentVarUsage) {
    if (locs.size > 0) usedDirect.add(t)
  }
  // Class usage
  for (const t of classUsageTokens) usedDirect.add(t)

  // 5) Propagate through dependencies (forward)
  p.mark("closure")
  const usedTokens = propagateUsage(usedDirect, dependencyGraph)
  if (profile) console.log(`⏱️  closure: ${p.end("closure").toFixed(1)}ms`)

  // 6) Classify
  const unusedTokens = []
  for (const t of allTokens) {
    if (shouldIgnoreToken(t)) continue
    if (!usedTokens.has(t)) {
      const d = defs.get(t)
      unusedTokens.push({ name: t, file: d.file, line: d.line, value: d.value })
    }
  }

  // Report results
  console.log("\n📊 Validation Summary:")
  console.log(`   Total tokens: ${allTokens.length}`)
  console.log(`   Used tokens: ${allTokens.length - unusedTokens.length}`)
  console.log(`   Unused tokens: ${unusedTokens.length}`)

  if (unusedTokens.length === 0) {
    console.log("\n✅ All tokens are being used!")
    if (profile) console.log(`⏱️  total: ${p.end("total").toFixed(1)}ms`)
    return true
  }

  console.log(`\n⚠️  Found ${unusedTokens.length} potentially unused tokens:\n`)
  const byFile = new Map()
  for (const tok of unusedTokens) {
    if (!byFile.has(tok.file)) byFile.set(tok.file, [])
    byFile.get(tok.file).push(tok)
  }
  for (const [file, list] of byFile) {
    console.log(`📄 ${file}:`)
    for (const t of list)
      console.log(`  Line ${t.line}: ${t.name} = ${t.value}`)
    console.log()
  }
  console.log(
    "💡 Note: Tokens might be used dynamically or externally and not detected."
  )
  if (!failOnUnused) {
    console.log(
      "ℹ️  Non-blocking mode: treating potentially unused tokens as warnings."
    )
    if (profile) console.log(`⏱️  total: ${p.end("total").toFixed(1)}ms`)
    return true
  }
  if (profile) console.log(`⏱️  total: ${p.end("total").toFixed(1)}ms`)
  return false
}

if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  const profile = process.argv.includes("--profile")
  const failOnUnused =
    process.argv.includes("--fail-on-unused") ||
    process.env.VALIDATE_TOKEN_DEFINITIONS_FAIL_ON_UNUSED === "1"
  validateTokenDefinitions({ profile, failOnUnused })
    .then((ok) => process.exit(ok ? 0 : 1))
    .catch((err) => {
      console.error("💥 Validation failed:", err?.message || err)
      if (err?.stack) console.error(err.stack)
      process.exit(1)
    })
}

export { validateTokenDefinitions }

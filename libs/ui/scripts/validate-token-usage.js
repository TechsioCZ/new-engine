#!/usr/bin/env node

/**
 * Token Usage Validation Script
 *
 * Validates that all Tailwind classes in components have corresponding token definitions.
 * Follows Tailwind v4 theme variable namespace rules for precise mapping.
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { globSync } from "glob"

const ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..")

// Tailwind v4 namespace to utility prefix mappings
const NAMESPACE_MAPPINGS = {
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
  "font-weight": ["font"],
  font: ["font"],
  radius: ["rounded"],
  shadow: ["shadow", "drop-shadow", "inset-shadow"],
  blur: ["blur"],
  opacity: ["opacity"],
  border: ["border"],
}

// Standard Tailwind utilities to ignore (not custom tokens)
const IGNORE_PATTERNS = [
  // Standard positioning values
  /^(top|right|bottom|left|inset)-(0|px|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|auto|full|screen|min|max|fit|start|end|1\/2)$/,

  // Layout & positioning
  /^(flex|grid|block|inline|hidden|absolute|relative|fixed|sticky)$/,
  /^(items|justify|content|self)-(start|end|center|stretch|between|around|evenly)$/,
  /^(flex|grid)-(row|col|flow|wrap|nowrap)$/,
  /^(order|col|row)-(start|end|\d+)$/,

  // Standard spacing (without custom tokens)
  /^(p|m|gap|w|h|max-w|min-w|max-h|min-h|top|right|bottom|left|inset|space)-(0|px|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|auto|full|screen|min|max|fit|end)$/,

  // Margin/padding with directional prefixes
  /^(ml|mr|mt|mb|mx|my|ms|me|pl|pr|pt|pb|px|py|ps|pe)-(0|px|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|auto|full|screen|min|max|fit)$/,

  // Standard colors including transparent
  /^(bg|text|border)-(transparent|current|black|white|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d{1,3})?(?:\/\d{1,3})?$/,
  /^(bg|text|border)-(transparent|current|black|white|inherit)$/,

  // Standard typography
  /^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl|left|center|right|justify|start|end)$/,
  /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/,
  /^font-(sans|serif|mono)$/,
  /^(leading|tracking)-(none|tight|snug|normal|relaxed|loose|wide|wider|widest)$/,

  // Standard borders & effects
  /^(border|rounded)-(none|sm|md|lg|xl|2xl|3xl|full)$/,
  /^rounded-(s|e|t|r|b|l|ss|se|ee|es|tl|tr|br|bl)-(none|sm|md|lg|xl|2xl|3xl|full)$/,
  /^border-(0|2|4|8|t|r|b|l|s|e|x|y|color)$/,
  /^border-(collapse|separate)$/,
  /^shadow-(sm|md|lg|xl|2xl|inner|none)$/,
  /^opacity-(0|5|10|20|25|30|40|50|60|70|75|80|90|95|100)$/,

  // Pseudo-classes and state modifiers
  /^(hover|focus|active|disabled|group-hover|group-focus):/,
  /^data-\[.+\]:/,

  // Responsive prefixes
  /^(sm|md|lg|xl|2xl):/,

  // Transform & animation
  /^(transform|rotate|scale|translate|skew|transition|duration|ease|delay|animate)-.+$/,

  // Special edge cases
  /^max-h-\(--available-height\)$/, // Dynamic height references
  /^\*:max-h-\(--available-height\)$/, // Selector prefixes
  /^left-(1\/2)$/, // Fractional positioning

  // Misc utilities
  /^(sr-only|not-sr-only|pointer-events|select|resize|appearance|cursor|outline|ring)-.+$/,
]

// Precompute prefix helpers for mapping
const KNOWN_PREFIXES = Object.values(NAMESPACE_MAPPINGS)
  .flat()
  .slice()
  .sort((a, b) => b.length - a.length)
const PREFIX_TO_NAMESPACES = (() => {
  const map = new Map()
  for (const [ns, prefixes] of Object.entries(NAMESPACE_MAPPINGS)) {
    for (const p of prefixes) {
      if (!map.has(p)) {
        map.set(p, [])
      }
      map.get(p).push(ns)
    }
  }
  return map
})()

const CLASS_STRING_REGEX = /\S+/g
const CLASS_NAME_PROP_REGEX = /className\s*=\s*["']([^"']+)["']/g
const CLASS_NAME_ARRAY_REGEX = /className\s*[:=]\s*(?:\{)?\s*\[([^\]]+)\]/g
const CLASS_NAME_TEMPLATE_REGEX = /className\s*=\s*`([^`]+)`/g
const QUOTED_STRING_REGEX = /['"`]([^'"`]+)['"`]/g
const TEMPLATE_INTERPOLATION_REGEX = /\$\{[^}]+\}/
const TV_CONFIG_REGEX = /tv\s*\(\s*\{[\s\S]*?\}\s*\)/g
const TV_SLOT_REGEX = /\[\s*['"`]([^'"`]+)['"`]/g
const TV_VARIANT_REGEX = /:\s*\{\s*[^}]*['"`]([^'"`]+)['"`]/g
const CLASS_HELPER_REGEX = /(?:clsx|cn)\s*\(\s*([^)]+)\)/g
const POSSIBLE_CLASS_STRING_REGEX =
  /['"`]([^'"`]*(?:bg-|text-|border-|p-|m-|w-|h-|flex|grid|rounded)[^'"`]*)['"`]/g
const TAILWIND_CLASS_VALUE_REGEX = /^[a-z-\s:[\]()]+$/i
const CLASS_MODIFIER_REGEX = /^(?:[a-z-]+:|data-\[[^\]]+\]:)/i
const TOKEN_DEFINITION_REGEX = /--([a-z][a-z0-9-]*)\s*:/g
const INLINE_TOKEN_REGEX = /["'](--[a-z][a-z0-9-]*)["']\s*:/gi
const ARBITRARY_VAR_TOKEN_REGEX = /var\(\s*(--[a-z][a-z0-9-]*)/gi
const ARBITRARY_KEY_TOKEN_REGEX = /[:=]\s*(--[a-z][a-z0-9-]*)/gi
const ARBITRARY_BARE_TOKEN_REGEX = /\((--[a-z][a-z0-9-]*)/gi

const PREFIX_TOKEN_ALIASES = [
  {
    prefixes: new Set(["p", "px", "py", "pt", "pr", "pb", "pl", "ps", "pe"]),
    namespaces: ["padding", "spacing"],
  },
  {
    prefixes: new Set(["m", "mx", "my", "mt", "mr", "mb", "ml", "ms", "me"]),
    namespaces: ["margin", "spacing"],
  },
  {
    prefixes: new Set(["gap", "gap-x", "gap-y"]),
    namespaces: ["gap", "spacing"],
  },
  {
    prefixes: new Set(["w", "min-w", "max-w"]),
    namespaces: ["width"],
  },
  {
    prefixes: new Set(["h", "min-h", "max-h"]),
    namespaces: ["height"],
  },
  {
    prefixes: new Set(["space-x", "space-y"]),
    namespaces: ["space", "spacing"],
  },
  {
    prefixes: new Set([
      "inset",
      "inset-x",
      "inset-y",
      "top",
      "right",
      "bottom",
      "left",
    ]),
    namespaces: ["inset", "spacing"],
  },
]

const EXTERNAL_TOKENS = new Set([
  "--available-height",
  "--height",
  "--border-width-badge-dynamic",
])

function addClasses(classes, classString) {
  for (const className of classString.match(CLASS_STRING_REGEX) || []) {
    classes.add(className.trim())
  }
}

function addMatchedClasses(classes, matches) {
  for (const match of matches) {
    addClasses(classes, match[1])
  }
}

function addNestedQuotedClasses(classes, matches) {
  for (const match of matches) {
    addMatchedClasses(classes, match[1].matchAll(QUOTED_STRING_REGEX))
  }
}

function stripClassModifiers(className) {
  let baseClass = className
  while (CLASS_MODIFIER_REGEX.test(baseClass)) {
    baseClass = baseClass.replace(CLASS_MODIFIER_REGEX, "")
  }
  return baseClass
}

/**
 * Extract Tailwind classes from TypeScript/JSX content
 */
function extractTailwindClasses(content) {
  const classes = new Set()

  addMatchedClasses(classes, content.matchAll(CLASS_NAME_PROP_REGEX))
  addNestedQuotedClasses(classes, content.matchAll(CLASS_NAME_ARRAY_REGEX))

  for (const match of content.matchAll(CLASS_NAME_TEMPLATE_REGEX)) {
    for (const staticPart of match[1].split(TEMPLATE_INTERPOLATION_REGEX)) {
      addClasses(classes, staticPart)
    }
  }

  for (const match of content.matchAll(TV_CONFIG_REGEX)) {
    addMatchedClasses(classes, match[0].matchAll(TV_SLOT_REGEX))
    addMatchedClasses(classes, match[0].matchAll(TV_VARIANT_REGEX))
  }

  addNestedQuotedClasses(classes, content.matchAll(CLASS_HELPER_REGEX))

  const possibleClassStrings = content.matchAll(POSSIBLE_CLASS_STRING_REGEX)
  for (const match of possibleClassStrings) {
    if (TAILWIND_CLASS_VALUE_REGEX.test(match[1])) {
      addClasses(classes, match[1])
    }
  }

  return Array.from(classes).filter((cls) => cls.length > 0)
}

/**
 * Map Tailwind utility class to possible CSS custom properties
 */
function mapClassToPossibleTokens(className) {
  const baseClass = stripClassModifiers(className)
  const normalized = baseClass.startsWith("-") ? baseClass.slice(1) : baseClass
  const prefix = KNOWN_PREFIXES.find((knownPrefix) =>
    normalized.startsWith(`${knownPrefix}-`)
  )

  if (!prefix) {
    return []
  }

  const value = normalized.slice(prefix.length + 1)
  const possibleTokens = []
  const namespaces = PREFIX_TO_NAMESPACES.get(prefix) || []
  for (const namespace of namespaces) {
    const tokenNamespace =
      namespace === "font-weight" ? "font-weight" : namespace
    possibleTokens.push(`--${tokenNamespace}-${value}`)
  }

  for (const aliases of PREFIX_TOKEN_ALIASES) {
    if (aliases.prefixes.has(prefix)) {
      for (const namespace of aliases.namespaces) {
        possibleTokens.push(`--${namespace}-${value}`)
      }
    }
  }

  return [...new Set(possibleTokens)]
}

/**
 * Load all defined tokens from CSS files
 */
function loadDefinedTokens() {
  const tokens = new Set()
  const tokenFiles = globSync("src/tokens/**/*.css", { cwd: ROOT })

  for (const file of tokenFiles) {
    const content = fs.readFileSync(path.join(ROOT, file), "utf8")
    // Match CSS custom properties defined in tokens
    const tokenMatches = content.matchAll(TOKEN_DEFINITION_REGEX)
    for (const match of tokenMatches) {
      tokens.add(`--${match[1]}`)
    }
  }

  // Also treat inline style custom properties in components as defined
  const componentFiles = globSync("src/**/*.{ts,tsx}", {
    cwd: ROOT,
    ignore: ["**/*.stories.tsx", "**/*.test.tsx", "**/*.spec.tsx"],
  })
  for (const file of componentFiles) {
    const content = fs.readFileSync(path.join(ROOT, file), "utf8")
    // style={{ '--var': value }} or object entries '--var': value
    for (const m of content.matchAll(INLINE_TOKEN_REGEX)) {
      tokens.add(m[1])
    }
  }

  return tokens
}

/**
 * Check if a class should be ignored
 */
function shouldIgnoreClass(className) {
  const baseClass = stripClassModifiers(className)
  return IGNORE_PATTERNS.some((pattern) => pattern.test(baseClass))
}

// Extract tokens referenced directly inside arbitrary utility syntax
function extractTokensFromArbitraryUtility(className) {
  const tokens = new Set()
  // var(--token)
  for (const m of className.matchAll(ARBITRARY_VAR_TOKEN_REGEX)) {
    tokens.add(m[1])
  }
  // key:(--token) or key=--token forms inside parentheses/brackets
  for (const m of className.matchAll(ARBITRARY_KEY_TOKEN_REGEX)) {
    tokens.add(m[1])
  }
  // Bare --token immediately after an opening parenthesis. Avoid matching icon names like mdi--play in brackets.
  for (const m of className.matchAll(ARBITRARY_BARE_TOKEN_REGEX)) {
    tokens.add(m[1])
  }
  return Array.from(tokens)
}

function findMissingTokens(className, definedTokens) {
  const arbitraryTokens = extractTokensFromArbitraryUtility(className)
  if (arbitraryTokens.length > 0) {
    const governedTokens = arbitraryTokens.filter(
      (token) => !EXTERNAL_TOKENS.has(token)
    )
    const hasDefinedToken = governedTokens.some((token) =>
      definedTokens.has(token)
    )
    return governedTokens.length === 0 || hasDefinedToken ? [] : governedTokens
  }

  if (shouldIgnoreClass(className)) {
    return []
  }

  const possibleTokens = mapClassToPossibleTokens(className)
  const hasMatchingToken = possibleTokens.some((token) =>
    definedTokens.has(token)
  )
  return possibleTokens.length === 0 || hasMatchingToken ? [] : possibleTokens
}

function collectFileErrors(file, definedTokens) {
  const content = fs.readFileSync(path.join(ROOT, file), "utf8")
  const contentLines = content.split("\n")
  const fileErrors = []

  for (const className of extractTailwindClasses(content)) {
    const expectedTokens = findMissingTokens(className, definedTokens)
    if (expectedTokens.length > 0) {
      fileErrors.push({
        className,
        expectedTokens,
        line: contentLines.findIndex((line) => line.includes(className)) + 1,
      })
    }
  }

  return fileErrors
}

function reportErrors(errorsByFile, totalErrors) {
  console.log(`❌ Found ${totalErrors} missing token definitions:\n`)
  for (const [file, errors] of errorsByFile) {
    console.log(`📄 ${file}:`)
    for (const error of errors) {
      const tokenList = error.expectedTokens.join(" OR ")
      console.log(
        `  Line ${error.line}: ${error.className} → Missing token: ${tokenList}`
      )
    }
    console.log()
  }
}

/**
 * Main validation function
 */
function validateTokenUsage() {
  console.log("🔍 Validating token usage in components...\n")

  const definedTokens = loadDefinedTokens()
  console.log(`📋 Found ${definedTokens.size} defined tokens`)

  const componentFiles = globSync("src/**/*.{ts,tsx}", {
    cwd: ROOT,
    ignore: ["**/*.stories.tsx", "**/*.test.tsx", "**/*.spec.tsx"],
  })
  const errorsByFile = new Map()
  let totalErrors = 0

  for (const file of componentFiles) {
    const fileErrors = collectFileErrors(file, definedTokens)
    if (fileErrors.length > 0) {
      errorsByFile.set(file, fileErrors)
      totalErrors += fileErrors.length
    }
  }

  if (totalErrors === 0) {
    console.log(
      "✅ All component classes have corresponding token definitions!"
    )
    return true
  }

  reportErrors(errorsByFile, totalErrors)
  return false
}

/**
 * Run validation
 */
if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  try {
    const success = validateTokenUsage()
    process.exit(success ? 0 : 1)
  } catch (error) {
    console.error("💥 Validation failed:", error.message)
    process.exit(1)
  }
}

export { validateTokenUsage, mapClassToPossibleTokens, extractTailwindClasses }

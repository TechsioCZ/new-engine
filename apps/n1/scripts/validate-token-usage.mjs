#!/usr/bin/env node

/**
 * Token Usage Validation Script for N1
 *
 * Validates that all Tailwind classes in .tsx files have corresponding token definitions.
 * Follows Tailwind v4 theme variable namespace rules for precise mapping.
 *
 * Usage: node scripts/validate-token-usage.mjs
 *
 * Token CSS files checked:
 * - src/tokens/_n1-components.css
 * - src/tokens/_n1-semantic.css
 * - src/tokens/_n1shop-overrides.css
 * - src/tokens/_n1-layout.css
 * - src/tokens/_n1-spacing.css
 * - src/tokens/_n1-icons.css
 * - src/tokens/_n1-typography.css
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const DOUBLE_STAR_REGEX = /\*\*/g
const SINGLE_STAR_REGEX = /\*/g
const WINDOWS_SEPARATOR_REGEX = /\\/g
const WHITESPACE_REGEX = /\s+/
const VARIANT_PREFIX_REGEX = /^(?:[a-z-]+:|data-\[[^\]]+\]:|\*:)/i
const VARIANT_PREFIX_WITH_BANG_REGEX = /^(?:[a-z-]+:|data-\[[^\]]+\]:|\*:|!)/i
const NUMBER_REGEX = /^\d+(\.\d+)?$/
const INTEGER_REGEX = /^\d+$/
const OPACITY_SUFFIX_REGEX = /\/\d+$/

/**
 * Find all files matching extension in directory recursively
 */
function findFilesWithExtension(dir, extension, ignore = []) {
  const results = []

  function shouldIgnore(filePath) {
    return ignore.some((ig) => {
      if (filePath.includes("node_modules")) {
        return true
      }
      if (filePath.includes(".git")) {
        return true
      }
      if (ig.includes("*")) {
        // Simple glob matching for ignore patterns
        const pattern = ig
          .replace(DOUBLE_STAR_REGEX, ".*")
          .replace(SINGLE_STAR_REGEX, "[^/]*")
        return new RegExp(pattern).test(filePath)
      }
      return filePath.includes(ig)
    })
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: recursive directory walk with ignore rules
  function walkDir(currentDir) {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name)
        const relativePath = path
          .relative(dir, fullPath)
          .replace(WINDOWS_SEPARATOR_REGEX, "/")

        if (entry.name === "node_modules" || entry.name === ".git") {
          continue
        }
        if (shouldIgnore(relativePath)) {
          continue
        }

        if (entry.isDirectory()) {
          walkDir(fullPath)
        } else if (entry.isFile() && entry.name.endsWith(extension)) {
          results.push(relativePath)
        }
      }
    } catch (_err) {
      // Skip directories we can't read
    }
  }

  walkDir(dir)
  return results
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")

// Token CSS files to check for definitions (direct paths)
const TOKEN_FILES = [
  "src/tokens/_n1-components.css",
  "src/tokens/_n1-semantic.css",
  "src/tokens/_n1shop-overrides.css",
  "src/tokens/_n1-layout.css",
  "src/tokens/_n1-spacing.css",
  "src/tokens/_n1-icons.css",
  "src/tokens/_n1-typography.css",
]

// Additional token directories to scan recursively
const TOKEN_DIRS = ["src/tokens/app-components"]

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
    "from",
    "via",
    "to",
    "border-t",
    "border-r",
    "border-b",
    "border-l",
    "border-x",
    "border-y",
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
  "border-width": ["border"],
  z: ["z"],
  transition: ["transition", "duration", "delay"],
  ease: ["ease"],
}

// Standard Tailwind utilities to ignore (not custom tokens)
const IGNORE_PATTERNS = [
  // Standard positioning values
  /^(top|right|bottom|left|inset)-(0|px|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|auto|full|screen|min|max|fit|end|1\/2|1\/3|2\/3|1\/4|3\/4)$/,

  // Layout & positioning
  /^(flex|grid|block|inline|inline-flex|inline-block|hidden|absolute|relative|fixed|sticky|static)$/,
  /^(items|justify|content|self|place)-(start|end|center|stretch|between|around|evenly|baseline)$/,
  /^(flex|grid)-(row|col|flow|wrap|nowrap|none|1|auto|initial)$/,
  /^(order|col|row)-(start|end|span|\d+|auto)$/,
  /^(grid-cols|grid-rows)-(\d+|none|subgrid)$/,
  /^(col|row)-span-(\d+|full)$/,

  // Standard spacing (Tailwind default scale - NOT our tokens)
  /^(p|m|gap|w|h|max-w|min-w|max-h|min-h|top|right|bottom|left|inset|space)-(0|px|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|auto|full|screen|min|max|fit|svh|lvh|dvh)$/,

  // Fractional widths/heights
  /^(w|h|max-w|min-w|max-h|min-h)-(1\/2|1\/3|2\/3|1\/4|2\/4|3\/4|1\/5|2\/5|3\/5|4\/5|1\/6|5\/6|1\/12|full|screen|min|max|fit|auto)$/,

  // Margin/padding with directional prefixes
  /^(ml|mr|mt|mb|mx|my|pl|pr|pt|pb|px|py|ps|pe|ms|me)-(0|px|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|auto|full|screen|min|max|fit)$/,

  // Standard colors (Tailwind default palette - we use semantic tokens instead)
  /^(bg|text|border|fill|stroke|ring|accent|caret|decoration|from|via|to)-(transparent|current|black|white|inherit)$/,
  /^(bg|text|border|fill|stroke|ring|accent|caret|decoration|from|via|to)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(-\d{1,3})?(\/\d{1,3})?$/,

  // Standard typography
  /^text-(left|center|right|justify|start|end|wrap|nowrap|balance|pretty)$/,
  /^(leading|tracking)-(none|tight|snug|normal|relaxed|loose|wide|wider|widest|\d+)$/,
  /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/,
  /^font-(sans|serif|mono)$/,
  /^(italic|not-italic|underline|overline|line-through|no-underline)$/,
  /^(uppercase|lowercase|capitalize|normal-case)$/,
  /^(truncate|text-ellipsis|text-clip)$/,
  /^(whitespace|break)-(normal|nowrap|pre|pre-line|pre-wrap|words|all|keep)$/,
  /^align-(baseline|top|middle|bottom|text-top|text-bottom|sub|super)$/,

  // Standard borders & effects
  /^(border|rounded)-(none|sm|md|lg|xl|2xl|3xl|full|s|e|t|r|b|l|ss|se|es|ee|tl|tr|br|bl)$/,
  /^border-(0|2|4|8)$/,
  /^border-(t|r|b|l|x|y)(-\d+)?$/,
  /^(shadow|drop-shadow)-(sm|md|lg|xl|2xl|inner|none)$/,
  /^opacity-(\d+)$/,
  /^blur-(none|sm|md|lg|xl|2xl|3xl)?$/,

  // Responsive prefixes - these are just modifiers
  /^(sm|md|lg|xl|2xl):/,

  // State modifiers - these are just modifiers
  /^(hover|focus|active|disabled|visited|focus-within|focus-visible|group-hover|group-focus|peer-checked|first|last|odd|even|empty|placeholder|checked|indeterminate|default|required|valid|invalid|in-range|out-of-range|read-only|autofill|open):/,

  // Dark mode
  /^dark:/,

  // Data attributes
  /^data-\[.+\]:/,

  // Aria attributes
  /^aria-\[.+\]:/,

  // Has/group/peer variants
  /^(has|group|peer)-/,

  // Pseudo-elements
  /^(before|after|first-letter|first-line|marker|selection|file|placeholder|backdrop):/,

  // Transform & animation
  /^(transform|rotate|scale|translate|skew|transition|duration|ease|delay|animate)(-\w+)?$/,
  /^(-?rotate|scale|translate|skew)-(x|y|z)?-?\d+$/,
  /^origin-(center|top|top-right|right|bottom-right|bottom|bottom-left|left|top-left)$/,

  // Visibility & display
  /^(visible|invisible|collapse|opacity-\d+)$/,
  /^(overflow|overscroll)-(auto|hidden|clip|visible|scroll|x-auto|y-auto|x-hidden|y-hidden|x-clip|y-clip|x-visible|y-visible|x-scroll|y-scroll|contain|none)$/,

  // Sizing utilities
  /^(aspect)-(auto|square|video|\d+\/\d+)$/,
  /^(object|bg)-(contain|cover|fill|none|scale-down|center|top|right|bottom|left|left-top|left-bottom|right-top|right-bottom)$/,

  // Z-index standard values
  /^z-(\d+|auto)$/,

  // Cursor utilities
  /^cursor-(auto|default|pointer|wait|text|move|help|not-allowed|none|context-menu|progress|cell|crosshair|vertical-text|alias|copy|no-drop|grab|grabbing|all-scroll|col-resize|row-resize|n-resize|e-resize|s-resize|w-resize|ne-resize|nw-resize|se-resize|sw-resize|ew-resize|ns-resize|nesw-resize|nwse-resize|zoom-in|zoom-out)$/,

  // Pointer events
  /^pointer-events-(none|auto)$/,

  // User select
  /^select-(none|text|all|auto)$/,

  // Scroll utilities
  /^scroll-(auto|smooth|m-\d+|p-\d+|mt-\d+|mb-\d+|ml-\d+|mr-\d+|pt-\d+|pb-\d+|pl-\d+|pr-\d+)$/,
  /^snap-(start|end|center|align-none|normal|always|x|y|both|mandatory|proximity|none)$/,

  // Touch utilities
  /^touch-(auto|none|manipulation|pan-x|pan-left|pan-right|pan-y|pan-up|pan-down|pinch-zoom)$/,

  // Resize
  /^resize(-none|-y|-x)?$/,

  // Table utilities
  /^table-(auto|fixed|caption-top|caption-bottom)$/,
  /^border-(collapse|separate)$/,

  // Appearance
  /^appearance-(none|auto)$/,

  // Outline
  /^outline-(none|dashed|dotted|double|offset-\d+|\d+)?$/,
  /^ring-(0|1|2|4|8|inset)?$/,
  /^ring-offset-\d+$/,

  // Mix blend, isolation
  /^(mix-blend|bg-blend)-(normal|multiply|screen|overlay|darken|lighten|color-dodge|color-burn|hard-light|soft-light|difference|exclusion|hue|saturation|color|luminosity)$/,
  /^isolation-(auto|isolate)$/,

  // Filter utilities
  /^(filter|backdrop-filter)$/,
  /^(grayscale|invert|sepia)(-0)?$/,
  /^(brightness|contrast|saturate|hue-rotate)-\d+$/,
  /^backdrop-(blur|brightness|contrast|grayscale|hue-rotate|invert|opacity|saturate|sepia)(-\w+)?$/,

  // Will change
  /^will-change-(auto|scroll|contents|transform)$/,

  // Content
  /^content-(none|['"].+['"])?$/,

  // List utilities
  /^list-(inside|outside|none|disc|decimal|image)$/,

  // Columns
  /^columns-(\d+|auto|3xs|2xs|xs|sm|md|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl)$/,
  /^break-(before|after|inside)-(auto|avoid|all|page|left|right|column)$/,

  // Float & clear
  /^(float|clear)-(right|left|none|start|end)$/,

  // Box utilities
  /^box-(border|content|decoration-clone|decoration-slice)$/,

  // Container
  /^container$/,

  // Screen reader utilities
  /^(sr-only|not-sr-only)$/,

  // Forced color adjust
  /^forced-color-adjust-(auto|none)$/,

  // Print utilities
  /^print:/,

  // Special arbitrary values with square brackets
  /^\[.+\]$/,

  // Size utility
  /^size-(\d+|auto|full|min|max|fit|px|0\.5)$/,

  // Divide utilities
  /^divide-(x|y)(-\d+|-reverse)?$/,
  /^divide-(solid|dashed|dotted|double|none)$/,

  // Space utilities
  /^(space-x|space-y)-(\d+|reverse)$/,

  // Place utilities
  /^place-(content|items|self)-(start|end|center|between|around|evenly|baseline|stretch)$/,

  // Growing/shrinking
  /^(grow|shrink)(-0)?$/,
  /^basis-(\d+|auto|full|1\/2|1\/3|2\/3|1\/4|2\/4|3\/4)$/,

  // Gradient
  /^bg-gradient-to-(t|tr|r|br|b|bl|l|tl)$/,
  /^bg-(none|fixed|local|scroll)$/,

  // Word/hyphens
  /^(hyphens|word-break)-(manual|auto|none|normal|break-all|keep-all)$/,

  // Accent color
  /^accent-(auto|inherit|current|transparent)$/,

  // Caret color
  /^caret-(inherit|current|transparent)$/,

  // Line clamp
  /^line-clamp-(\d+|none)$/,

  // Important modifier
  /^!/,

  // Text balance/pretty (CSS text-wrap)
  /^text-(balance|pretty|wrap|nowrap)$/,

  // Scroll margin/padding
  /^scroll-(m|p)(t|r|b|l|x|y)?-\d+$/,

  // Min/max content
  /^(w|h)-(min|max|fit)-content$/,

  // Dynamic references (arbitrary values with var)
  /^\w+-\(--[\w-]+\)$/,
  /^\w+-\[var\(--[\w-]+\)\]$/,

  // Tailwind v4 special syntax
  /^\*:/, // Child selector
  /^@/, // Container queries

  // Prose classes from typography plugin
  /^prose(-\w+)?$/,

  // Form utilities
  /^form-(input|textarea|select|multiselect|checkbox|radio)$/,

  // Motion utilities
  /^motion-(safe|reduce):/,

  // Supports
  /^supports-\[.+\]:/,

  // Logical properties already covered but adding explicit ones
  /^(inline|block)-(start|end)/,

  // Tab size
  /^tab-\d+$/,

  // Text indent
  /^indent-\d+$/,

  // Vertical alignment (already covered but being explicit)
  /^vertical-(top|middle|bottom|baseline|text-top|text-bottom|sub|super)$/,

  // Negative margins
  /^-m[trblxy]?-\d+$/,
  /^-(top|right|bottom|left|inset)-\d+$/,

  // Arbitrary properties
  /^\[[\w-]+:.+\]$/,

  // Group and peer modifiers
  /^group\/\w+$/,
  /^peer\/\w+$/,

  // Max container widths that are standard
  /^max-w-(xs|sm|md|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|full|min|max|fit|prose|screen-sm|screen-md|screen-lg|screen-xl|screen-2xl)$/,

  // Screen height variants
  /^(h|min-h|max-h)-(svh|lvh|dvh|screen)$/,

  // Opacity modifiers (color/XX syntax) - e.g., bg-success/10, bg-surface/70
  /\/\d+$/,

  // Placement values (Zag.js component props, not Tailwind classes)
  /^(top|bottom|left|right)-(start|end)$/,
]

// Precompute prefix helpers
const KNOWN_PREFIXES = Object.values(NAMESPACE_MAPPINGS)
  .flat()
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

/**
 * Extract Tailwind classes from TSX content with line numbers
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: multiple parsing branches for class patterns
function extractTailwindClassesWithLines(content, _filePath) {
  const results = []
  const lines = content.split("\n")

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex]
    const lineNumber = lineIndex + 1

    // Skip comments and imports
    if (line.trim().startsWith("//") || line.trim().startsWith("import ")) {
      continue
    }

    // Match className props
    const classNameMatches = line.matchAll(
      /className\s*=\s*["'`]([^"'`]+)["'`]/g
    )
    for (const match of classNameMatches) {
      const classString = match[1]
      for (const cls of classString.split(WHITESPACE_REGEX)) {
        if (cls.trim()) {
          results.push({ className: cls.trim(), line: lineNumber })
        }
      }
    }

    // Match className with cn/clsx
    const cnMatches = line.matchAll(/(?:cn|clsx)\s*\(\s*['"`]([^'"`]+)['"`]/g)
    for (const match of cnMatches) {
      const classString = match[1]
      for (const cls of classString.split(WHITESPACE_REGEX)) {
        if (cls.trim()) {
          results.push({ className: cls.trim(), line: lineNumber })
        }
      }
    }

    // Match tv() variant strings
    const tvMatches = line.matchAll(
      /['"`]([^'"`]*(?:bg-|text-|border-|p-|m-|gap-|rounded-|w-|h-)[^'"`]*)['"`]/g
    )
    for (const match of tvMatches) {
      const classString = match[1]
      for (const cls of classString.split(WHITESPACE_REGEX)) {
        if (cls.trim()) {
          results.push({ className: cls.trim(), line: lineNumber })
        }
      }
    }
  }

  // Deduplicate results (same class on same line)
  const seen = new Set()
  return results.filter(({ className, line }) => {
    const key = `${line}:${className}`
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

/**
 * Map Tailwind utility class to possible CSS custom properties
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: handles multiple Tailwind namespaces
function mapClassToPossibleTokens(className) {
  // Remove chained state/data prefixes
  let baseClass = className
  while (VARIANT_PREFIX_REGEX.test(baseClass)) {
    baseClass = baseClass.replace(VARIANT_PREFIX_REGEX, "")
  }

  // Handle negative prefix
  const isNegative = baseClass.startsWith("-")
  const normalized = isNegative ? baseClass.slice(1) : baseClass

  // Try to match against known prefixes (longest first)
  let prefix = null
  let value = null

  for (const knownPrefix of KNOWN_PREFIXES) {
    if (normalized.startsWith(`${knownPrefix}-`)) {
      prefix = knownPrefix
      value = normalized.slice(knownPrefix.length + 1)
      break
    }
  }

  if (!(prefix && value)) {
    return []
  }

  const possibleTokens = []
  const namespaces = PREFIX_TO_NAMESPACES.get(prefix) || []

  for (const namespace of namespaces) {
    if (namespace === "font-weight") {
      possibleTokens.push(`--font-weight-${value}`)
    } else if (namespace === "container") {
      possibleTokens.push(`--container-${value}`)
      if (["w", "min-w", "max-w"].includes(prefix)) {
        possibleTokens.push(`--width-${value}`)
      }
      if (["h", "min-h", "max-h"].includes(prefix)) {
        possibleTokens.push(`--height-${value}`)
      }
    } else if (namespace === "spacing") {
      possibleTokens.push(`--spacing-${value}`)
      if (["top", "right", "bottom", "left"].includes(prefix)) {
        possibleTokens.push(`--inset-${value}`)
      }
    } else {
      possibleTokens.push(`--${namespace}-${value}`)
    }
  }

  // Add specific namespace alternatives
  if (["p", "px", "py", "pt", "pr", "pb", "pl", "ps", "pe"].includes(prefix)) {
    possibleTokens.push(`--padding-${value}`)
    possibleTokens.push(`--spacing-${value}`)
  }

  if (["m", "mx", "my", "mt", "mr", "mb", "ml", "ms", "me"].includes(prefix)) {
    possibleTokens.push(`--margin-${value}`)
    possibleTokens.push(`--spacing-${value}`)
  }

  if (["gap", "gap-x", "gap-y"].includes(prefix)) {
    possibleTokens.push(`--gap-${value}`)
    possibleTokens.push(`--spacing-${value}`)
  }

  if (["w", "min-w", "max-w"].includes(prefix)) {
    possibleTokens.push(`--width-${value}`)
    possibleTokens.push(`--container-${value}`)
  }

  if (["h", "min-h", "max-h"].includes(prefix)) {
    possibleTokens.push(`--height-${value}`)
    possibleTokens.push(`--container-${value}`)
  }

  if (["space-x", "space-y"].includes(prefix)) {
    possibleTokens.push(`--space-${value}`)
    possibleTokens.push(`--spacing-${value}`)
  }

  if (
    ["inset", "inset-x", "inset-y", "top", "right", "bottom", "left"].includes(
      prefix
    )
  ) {
    possibleTokens.push(`--inset-${value}`)
    possibleTokens.push(`--spacing-${value}`)
  }

  // Component-specific tokens
  possibleTokens.push(`--${prefix}-${value}`)

  return [...new Set(possibleTokens)]
}

/**
 * Recursively find all CSS files in a directory
 */
function findCssFiles(dir) {
  const results = []
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        results.push(...findCssFiles(fullPath))
      } else if (entry.isFile() && entry.name.endsWith(".css")) {
        results.push(fullPath)
      }
    }
  } catch (_err) {
    // Skip directories we can't read
  }
  return results
}

/**
 * Load defined tokens from CSS files
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: loads tokens from multiple sources
function loadDefinedTokens() {
  const tokens = new Set()

  // Load from direct file paths
  for (const file of TOKEN_FILES) {
    const fullPath = path.join(ROOT, file)
    try {
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, "utf8")
        const tokenMatches = content.matchAll(/--([\w-]+)\s*:/g)
        for (const match of tokenMatches) {
          tokens.add(`--${match[1]}`)
        }
      }
    } catch (err) {
      console.error(`⚠️  Failed to read ${file}:`, err.message)
    }
  }

  // Load from token directories recursively
  for (const dir of TOKEN_DIRS) {
    const fullDir = path.join(ROOT, dir)
    const cssFiles = findCssFiles(fullDir)
    for (const file of cssFiles) {
      try {
        const content = fs.readFileSync(file, "utf8")
        const tokenMatches = content.matchAll(/--([\w-]+)\s*:/g)
        for (const match of tokenMatches) {
          tokens.add(`--${match[1]}`)
        }
      } catch (err) {
        console.error(`⚠️  Failed to read ${file}:`, err.message)
      }
    }
  }

  return tokens
}

/**
 * Check if a class should be ignored
 */
function shouldIgnoreClass(className) {
  // Remove variant prefixes for checking
  let baseClass = className
  while (VARIANT_PREFIX_WITH_BANG_REGEX.test(baseClass)) {
    baseClass = baseClass.replace(VARIANT_PREFIX_WITH_BANG_REGEX, "")
  }

  // Skip empty or single-char classes
  if (baseClass.length <= 1) {
    return true
  }

  // Check against ignore patterns
  return IGNORE_PATTERNS.some((pattern) => pattern.test(baseClass))
}

/**
 * Extract tokens from arbitrary utility syntax
 */
function extractTokensFromArbitraryUtility(className) {
  const tokens = new Set()

  // var(--token)
  for (const m of className.matchAll(/var\(\s*(--[\w-]+)/gi)) {
    tokens.add(m[1])
  }

  // key:(--token) syntax
  for (const m of className.matchAll(/\((--[\w-]+)\)/gi)) {
    tokens.add(m[1])
  }

  return Array.from(tokens)
}

// Valid N1 spacing values (50-1000 in steps of 50)
const VALID_N1_SPACING = new Set([
  "50",
  "100",
  "150",
  "200",
  "250",
  "300",
  "350",
  "400",
  "450",
  "500",
  "550",
  "600",
  "650",
  "700",
  "750",
  "800",
  "850",
  "900",
  "950",
  "1000",
])

// Special spacing values that are always OK
const ALLOWED_SPACING_SPECIAL = new Set([
  "0",
  "px",
  "auto",
  "full",
  "screen",
  "min",
  "max",
  "fit",
  "svh",
  "lvh",
  "dvh",
  "section",
])

// Spacing utility prefixes
const SPACING_PREFIXES = [
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
  "min-w",
  "max-w",
  "min-h",
  "max-h",
  "top",
  "right",
  "bottom",
  "left",
  "inset",
  "inset-x",
  "inset-y",
]

// Color prefixes that shouldn't use numeric suffixes
const COLOR_PREFIXES = [
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
  "from",
  "via",
  "to",
  "border-t",
  "border-r",
  "border-b",
  "border-l",
]

// Tailwind default color names (should use semantic tokens instead)
const TAILWIND_COLOR_NAMES = [
  "slate",
  "gray",
  "zinc",
  "neutral",
  "stone",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
]

/**
 * Check if class uses invalid Tailwind default spacing (1-96 scale instead of 50-950)
 * Returns error message if invalid, null if OK
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: handles multiple spacing edge cases
function checkInvalidSpacing(className) {
  // Remove variant prefixes
  let baseClass = className
  while (VARIANT_PREFIX_REGEX.test(baseClass)) {
    baseClass = baseClass.replace(VARIANT_PREFIX_REGEX, "")
  }

  // Handle negative prefix
  if (baseClass.startsWith("-")) {
    baseClass = baseClass.slice(1)
  }

  // Check each spacing prefix
  for (const prefix of SPACING_PREFIXES) {
    if (baseClass.startsWith(`${prefix}-`)) {
      const value = baseClass.slice(prefix.length + 1)

      // Skip special values
      if (ALLOWED_SPACING_SPECIAL.has(value)) {
        return null
      }

      // Skip arbitrary values
      if (value.startsWith("[") || value.startsWith("(")) {
        return null
      }

      // Skip fractional values like 1/2, 1/3
      if (value.includes("/")) {
        return null
      }

      if (NUMBER_REGEX.test(value) && !VALID_N1_SPACING.has(value)) {
        return "Invalid spacing: use N1 scale (50-1000), not Tailwind default"
      }

      break
    }
  }

  return null
}

/**
 * Check if class uses Tailwind color with numeric suffix (gray-300, blue-500)
 * These should use semantic tokens instead
 * Returns error message if invalid, null if OK
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: handles multiple palette edge cases
function checkPaletteColor(className) {
  // Remove variant prefixes
  let baseClass = className
  while (VARIANT_PREFIX_REGEX.test(baseClass)) {
    baseClass = baseClass.replace(VARIANT_PREFIX_REGEX, "")
  }

  // Remove opacity modifier
  baseClass = baseClass.replace(OPACITY_SUFFIX_REGEX, "")

  // Check each color prefix
  for (const prefix of COLOR_PREFIXES) {
    if (baseClass.startsWith(`${prefix}-`)) {
      const rest = baseClass.slice(prefix.length + 1)

      // Check if it matches pattern: colorName-number (e.g., gray-300, blue-500)
      for (const colorName of TAILWIND_COLOR_NAMES) {
        if (rest.startsWith(`${colorName}-`)) {
          const suffix = rest.slice(colorName.length + 1)
          // Check if suffix is a number (50, 100, 200, etc.)
          if (INTEGER_REGEX.test(suffix)) {
            return `Palette color: use semantic token instead of ${colorName}-${suffix}`
          }
        }
      }

      break
    }
  }

  return null
}

/**
 * Main validation function
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: main validation flow aggregates multiple checks
function validateTokenUsage() {
  console.log("🔍 Validating token usage in N1 components...\n")

  const definedTokens = loadDefinedTokens()
  console.log(`📋 Found ${definedTokens.size} defined tokens`)

  const srcDir = path.join(ROOT, "src")
  const componentFiles = findFilesWithExtension(srcDir, ".tsx", [
    ".stories.tsx",
    ".test.tsx",
    ".spec.tsx",
  ]).map((f) => `src/${f}`)

  console.log(`📁 Scanning ${componentFiles.length} TSX files...\n`)

  let totalErrors = 0
  const errorsByFile = new Map()

  for (const file of componentFiles) {
    const fullPath = path.join(ROOT, file)
    const content = fs.readFileSync(fullPath, "utf8")
    const classesWithLines = extractTailwindClassesWithLines(content, file)
    const fileErrors = []

    for (const { className, line } of classesWithLines) {
      // 1. Check for invalid Tailwind default spacing (p-4, m-6 instead of p-400, m-600)
      const spacingError = checkInvalidSpacing(className)
      if (spacingError) {
        fileErrors.push({
          className,
          expectedTokens: [spacingError],
          line,
          type: "spacing",
        })
        continue
      }

      // 2. Check for palette colors with numeric suffixes (gray-300, blue-500)
      const paletteError = checkPaletteColor(className)
      if (paletteError) {
        fileErrors.push({
          className,
          expectedTokens: [paletteError],
          line,
          type: "palette",
        })
        continue
      }

      // 3. Check arbitrary utilities
      const arbitraryTokens = extractTokensFromArbitraryUtility(className)
      if (arbitraryTokens.length > 0) {
        const missingTokens = arbitraryTokens.filter(
          (t) => !definedTokens.has(t)
        )
        if (missingTokens.length > 0) {
          fileErrors.push({
            className,
            expectedTokens: missingTokens,
            line,
            type: "arbitrary",
          })
        }
        continue
      }

      // 4. Skip standard classes
      if (shouldIgnoreClass(className)) {
        continue
      }

      // 5. Map to possible tokens
      const possibleTokens = mapClassToPossibleTokens(className)
      if (possibleTokens.length === 0) {
        continue
      }

      // 6. Check if any matching token exists
      const hasMatchingToken = possibleTokens.some((token) =>
        definedTokens.has(token)
      )

      if (!hasMatchingToken) {
        fileErrors.push({
          className,
          expectedTokens: possibleTokens.slice(0, 3), // Show first 3 possibilities
          line,
          type: "token",
        })
      }
    }

    if (fileErrors.length > 0) {
      errorsByFile.set(file, fileErrors)
      totalErrors += fileErrors.length
    }
  }

  // Report results
  if (totalErrors === 0) {
    console.log(
      "✅ All component classes have corresponding token definitions!"
    )
    return true
  }

  // Count by type
  let spacingCount = 0
  let paletteCount = 0
  let tokenCount = 0
  let arbitraryCount = 0

  for (const [, errors] of errorsByFile) {
    for (const error of errors) {
      if (error.type === "spacing") {
        spacingCount += 1
      } else if (error.type === "palette") {
        paletteCount += 1
      } else if (error.type === "arbitrary") {
        arbitraryCount += 1
      } else {
        tokenCount += 1
      }
    }
  }

  console.log(`❌ Found ${totalErrors} issues:\n`)
  if (spacingCount > 0) {
    console.log(`   📏 Invalid spacing (use 50-950): ${spacingCount}`)
  }
  if (paletteCount > 0) {
    console.log(`   🎨 Palette colors (use semantic): ${paletteCount}`)
  }
  if (tokenCount > 0) {
    console.log(`   🏷️  Missing tokens: ${tokenCount}`)
  }
  if (arbitraryCount > 0) {
    console.log(`   📦 Arbitrary values: ${arbitraryCount}`)
  }
  console.log()

  for (const [file, errors] of errorsByFile) {
    console.log(`📄 ${file}:`)
    for (const error of errors) {
      let icon = "🏷️"
      if (error.type === "spacing") {
        icon = "📏"
      } else if (error.type === "palette") {
        icon = "🎨"
      } else if (error.type === "arbitrary") {
        icon = "📦"
      }
      const message = error.expectedTokens.join(" OR ")
      console.log(
        `  ${icon} Line ${error.line}: ${error.className} → ${message}`
      )
    }
    console.log()
  }

  return false
}

// Run validation
try {
  const success = validateTokenUsage()
  process.exit(success ? 0 : 1)
} catch (error) {
  console.error("💥 Validation failed:", error.message)
  if (error.stack) {
    console.error(error.stack)
  }
  process.exit(1)
}

#!/usr/bin/env node
// @ts-check
/// <reference types="node" />

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

const DOUBLE_STAR_REGEX = /\*\*/gu
const SINGLE_STAR_REGEX = /\*/gu
const WINDOWS_SEPARATOR_REGEX = /\\/gu
const WHITESPACE_REGEX = /\s+/u
const VARIANT_PREFIX_REGEX = /^(?:[a-z-]+:|data-\[[^\]]+\]:|\*:)/iu
const VARIANT_PREFIX_WITH_BANG_REGEX = /^(?:[a-z-]+:|data-\[[^\]]+\]:|\*:|!)/iu
const NUMBER_REGEX = /^\d+(?<capture1>\.\d+)?$/u
const INTEGER_REGEX = /^\d+$/u
const OPACITY_SUFFIX_REGEX = /\/\d+$/u

/**
 * @typedef {"arbitrary" | "palette" | "spacing" | "token"} FindingType
 * @typedef {{ className: string, expectedTokens: string[], line: number, type: FindingType }} Finding
 */

/**
 * Find all files matching extension in directory recursively.
 * @param {string} directory - Directory to scan.
 * @param {string} extension - Required file extension.
 * @param {string[]} [ignore] - Ignore patterns.
 * @returns {string[]} Relative file paths.
 */
const findFilesWithExtension = (directory, extension, ignore = []) => {
  /** @type {string[]} */
  const results = []
  /** @param {string} filePath - Relative file path. */
  const shouldIgnore = (filePath) =>
    filePath.includes("node_modules") ||
    filePath.includes(".git") ||
    ignore.some((pattern) => {
      if (!pattern.includes("*")) {
        return filePath.includes(pattern)
      }
      const regexSource = pattern
        .replace(DOUBLE_STAR_REGEX, ".*")
        .replace(SINGLE_STAR_REGEX, "[^/]*")
      return new RegExp(regexSource, "u").test(filePath)
    })

  /** @param {string} currentDirectory - Directory currently being scanned. */
  const walkDirectory = (currentDirectory) => {
    let entries
    try {
      entries = fs.readdirSync(currentDirectory, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDirectory, entry.name)
      const relativePath = path
        .relative(directory, fullPath)
        .replace(WINDOWS_SEPARATOR_REGEX, "/")

      if (!shouldIgnore(relativePath)) {
        if (entry.isDirectory()) {
          walkDirectory(fullPath)
        } else if (entry.isFile() && entry.name.endsWith(extension)) {
          results.push(relativePath)
        }
      }
    }
  }

  walkDirectory(directory)
  return results
}

const SCRIPT_DIRECTORY = import.meta.dirname
const ROOT = path.resolve(SCRIPT_DIRECTORY, "..")

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
/** @type {Record<string, string[]>} */
const NAMESPACE_MAPPINGS = {
  blur: ["blur"],
  border: ["border"],
  "border-width": ["border"],
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
  ease: ["ease"],
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
  transition: ["transition", "duration", "delay"],
  z: ["z"],
}

// Standard Tailwind utilities to ignore (not custom tokens)
const IGNORE_PATTERNS = [
  // Standard positioning values
  /^(?<capture2>top|right|bottom|left|inset)-(?<capture3>0|px|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|auto|full|screen|min|max|fit|end|1\/2|1\/3|2\/3|1\/4|3\/4)$/u,

  // Layout & positioning
  /^(?<capture4>flex|grid|block|inline|inline-flex|inline-block|hidden|absolute|relative|fixed|sticky|static)$/u,
  /^(?<capture5>items|justify|content|self|place)-(?<capture6>start|end|center|stretch|between|around|evenly|baseline)$/u,
  /^(?<capture7>flex|grid)-(?<capture8>row|col|flow|wrap|nowrap|none|1|auto|initial)$/u,
  /^(?<capture9>order|col|row)-(?<capture10>start|end|span|\d+|auto)$/u,
  /^(?<capture11>grid-cols|grid-rows)-(?<capture12>\d+|none|subgrid)$/u,
  /^(?<capture13>col|row)-span-(?<capture14>\d+|full)$/u,

  // Standard spacing (Tailwind default scale - NOT our tokens)
  /^(?<capture15>p|m|gap|w|h|max-w|min-w|max-h|min-h|top|right|bottom|left|inset|space)-(?<capture16>0|px|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|auto|full|screen|min|max|fit|svh|lvh|dvh)$/u,

  // Fractional widths/heights
  /^(?<capture17>w|h|max-w|min-w|max-h|min-h)-(?<capture18>1\/2|1\/3|2\/3|1\/4|2\/4|3\/4|1\/5|2\/5|3\/5|4\/5|1\/6|5\/6|1\/12|full|screen|min|max|fit|auto)$/u,

  // Margin/padding with directional prefixes
  /^(?<capture19>ml|mr|mt|mb|mx|my|pl|pr|pt|pb|px|py|ps|pe|ms|me)-(?<capture20>0|px|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|auto|full|screen|min|max|fit)$/u,

  // Standard colors (Tailwind default palette - we use semantic tokens instead)
  /^(?<capture21>bg|text|border|fill|stroke|ring|accent|caret|decoration|from|via|to)-(?<capture22>transparent|current|black|white|inherit)$/u,
  /^(?<capture23>bg|text|border|fill|stroke|ring|accent|caret|decoration|from|via|to)-(?<capture24>slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?<capture25>-\d{1,3})?(?<capture26>\/\d{1,3})?$/u,

  // Standard typography
  /^text-(?<capture27>left|center|right|justify|start|end|wrap|nowrap|balance|pretty)$/u,
  /^(?<capture28>leading|tracking)-(?<capture29>none|tight|snug|normal|relaxed|loose|wide|wider|widest|\d+)$/u,
  /^font-(?<capture30>thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/u,
  /^font-(?<capture31>sans|serif|mono)$/u,
  /^(?<capture32>italic|not-italic|underline|overline|line-through|no-underline)$/u,
  /^(?<capture33>uppercase|lowercase|capitalize|normal-case)$/u,
  /^(?<capture34>truncate|text-ellipsis|text-clip)$/u,
  /^(?<capture35>whitespace|break)-(?<capture36>normal|nowrap|pre|pre-line|pre-wrap|words|all|keep)$/u,
  /^align-(?<capture37>baseline|top|middle|bottom|text-top|text-bottom|sub|super)$/u,

  // Standard borders & effects
  /^(?<capture38>border|rounded)-(?<capture39>none|sm|md|lg|xl|2xl|3xl|full|s|e|t|r|b|l|ss|se|es|ee|tl|tr|br|bl)$/u,
  /^border-(?<capture40>0|2|4|8)$/u,
  /^border-(?<capture41>t|r|b|l|x|y)(?<capture42>-\d+)?$/u,
  /^(?<capture43>shadow|drop-shadow)-(?<capture44>sm|md|lg|xl|2xl|inner|none)$/u,
  /^opacity-(?<capture45>\d+)$/u,
  /^blur-(?<capture46>none|sm|md|lg|xl|2xl|3xl)?$/u,

  // Responsive prefixes - these are just modifiers
  /^(?<capture47>sm|md|lg|xl|2xl):/u,

  // State modifiers - these are just modifiers
  /^(?<capture48>hover|focus|active|disabled|visited|focus-within|focus-visible|group-hover|group-focus|peer-checked|first|last|odd|even|empty|placeholder|checked|indeterminate|default|required|valid|invalid|in-range|out-of-range|read-only|autofill|open):/u,

  // Dark mode
  /^dark:/u,

  // Data attributes
  /^data-\[.+\]:/u,

  // Aria attributes
  /^aria-\[.+\]:/u,

  // Has/group/peer variants
  /^(?<capture49>has|group|peer)-/u,

  // Pseudo-elements
  /^(?<capture50>before|after|first-letter|first-line|marker|selection|file|placeholder|backdrop):/u,

  // Transform & animation
  /^(?<capture51>transform|rotate|scale|translate|skew|transition|duration|ease|delay|animate)(?<capture52>-\w+)?$/u,
  /^(?<capture53>-?rotate|scale|translate|skew)-(?<capture54>x|y|z)?-?\d+$/u,
  /^origin-(?<capture55>center|top|top-right|right|bottom-right|bottom|bottom-left|left|top-left)$/u,

  // Visibility & display
  /^(?<capture56>visible|invisible|collapse|opacity-\d+)$/u,
  /^(?<capture57>overflow|overscroll)-(?<capture58>auto|hidden|clip|visible|scroll|x-auto|y-auto|x-hidden|y-hidden|x-clip|y-clip|x-visible|y-visible|x-scroll|y-scroll|contain|none)$/u,

  // Sizing utilities
  /^(?<capture59>aspect)-(?<capture60>auto|square|video|\d+\/\d+)$/u,
  /^(?<capture61>object|bg)-(?<capture62>contain|cover|fill|none|scale-down|center|top|right|bottom|left|left-top|left-bottom|right-top|right-bottom)$/u,

  // Z-index standard values
  /^z-(?<capture63>\d+|auto)$/u,

  // Cursor utilities
  /^cursor-(?<capture64>auto|default|pointer|wait|text|move|help|not-allowed|none|context-menu|progress|cell|crosshair|vertical-text|alias|copy|no-drop|grab|grabbing|all-scroll|col-resize|row-resize|n-resize|e-resize|s-resize|w-resize|ne-resize|nw-resize|se-resize|sw-resize|ew-resize|ns-resize|nesw-resize|nwse-resize|zoom-in|zoom-out)$/u,

  // Pointer events
  /^pointer-events-(?<capture65>none|auto)$/u,

  // User select
  /^select-(?<capture66>none|text|all|auto)$/u,

  // Scroll utilities
  /^scroll-(?<capture67>auto|smooth|m-\d+|p-\d+|mt-\d+|mb-\d+|ml-\d+|mr-\d+|pt-\d+|pb-\d+|pl-\d+|pr-\d+)$/u,
  /^snap-(?<capture68>start|end|center|align-none|normal|always|x|y|both|mandatory|proximity|none)$/u,

  // Touch utilities
  /^touch-(?<capture69>auto|none|manipulation|pan-x|pan-left|pan-right|pan-y|pan-up|pan-down|pinch-zoom)$/u,

  // Resize
  /^resize(?<capture70>-none|-y|-x)?$/u,

  // Table utilities
  /^table-(?<capture71>auto|fixed|caption-top|caption-bottom)$/u,
  /^border-(?<capture72>collapse|separate)$/u,

  // Appearance
  /^appearance-(?<capture73>none|auto)$/u,

  // Outline
  /^outline-(?<capture74>none|dashed|dotted|double|offset-\d+|\d+)?$/u,
  /^ring-(?<capture75>0|1|2|4|8|inset)?$/u,
  /^ring-offset-\d+$/u,

  // Mix blend, isolation
  /^(?<capture76>mix-blend|bg-blend)-(?<capture77>normal|multiply|screen|overlay|darken|lighten|color-dodge|color-burn|hard-light|soft-light|difference|exclusion|hue|saturation|color|luminosity)$/u,
  /^isolation-(?<capture78>auto|isolate)$/u,

  // Filter utilities
  /^(?<capture79>filter|backdrop-filter)$/u,
  /^(?<capture80>grayscale|invert|sepia)(?<capture81>-0)?$/u,
  /^(?<capture82>brightness|contrast|saturate|hue-rotate)-\d+$/u,
  /^backdrop-(?<capture83>blur|brightness|contrast|grayscale|hue-rotate|invert|opacity|saturate|sepia)(?<capture84>-\w+)?$/u,

  // Will change
  /^will-change-(?<capture85>auto|scroll|contents|transform)$/u,

  // Content
  /^content-(?<capture86>none|['"].+['"])?$/u,

  // List utilities
  /^list-(?<capture87>inside|outside|none|disc|decimal|image)$/u,

  // Columns
  /^columns-(?<capture88>\d+|auto|3xs|2xs|xs|sm|md|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl)$/u,
  /^break-(?<capture89>before|after|inside)-(?<capture90>auto|avoid|all|page|left|right|column)$/u,

  // Float & clear
  /^(?<capture91>float|clear)-(?<capture92>right|left|none|start|end)$/u,

  // Box utilities
  /^box-(?<capture93>border|content|decoration-clone|decoration-slice)$/u,

  // Container
  /^container$/u,

  // Screen reader utilities
  /^(?<capture94>sr-only|not-sr-only)$/u,

  // Forced color adjust
  /^forced-color-adjust-(?<capture95>auto|none)$/u,

  // Print utilities
  /^print:/u,

  // Special arbitrary values with square brackets
  /^\[.+\]$/u,

  // Size utility
  /^size-(?<capture96>\d+|auto|full|min|max|fit|px|0\.5)$/u,

  // Divide utilities
  /^divide-(?<capture97>x|y)(?<capture98>-\d+|-reverse)?$/u,
  /^divide-(?<capture99>solid|dashed|dotted|double|none)$/u,

  // Space utilities
  /^(?<capture100>space-x|space-y)-(?<capture101>\d+|reverse)$/u,

  // Place utilities
  /^place-(?<capture102>content|items|self)-(?<capture103>start|end|center|between|around|evenly|baseline|stretch)$/u,

  // Growing/shrinking
  /^(?<capture104>grow|shrink)(?<capture105>-0)?$/u,
  /^basis-(?<capture106>\d+|auto|full|1\/2|1\/3|2\/3|1\/4|2\/4|3\/4)$/u,

  // Gradient
  /^bg-gradient-to-(?<capture107>t|tr|r|br|b|bl|l|tl)$/u,
  /^bg-(?<capture108>none|fixed|local|scroll)$/u,

  // Word/hyphens
  /^(?<capture109>hyphens|word-break)-(?<capture110>manual|auto|none|normal|break-all|keep-all)$/u,

  // Accent color
  /^accent-(?<capture111>auto|inherit|current|transparent)$/u,

  // Caret color
  /^caret-(?<capture112>inherit|current|transparent)$/u,

  // Line clamp
  /^line-clamp-(?<capture113>\d+|none)$/u,

  // Important modifier
  /^!/u,

  // Text balance/pretty (CSS text-wrap)
  /^text-(?<capture114>balance|pretty|wrap|nowrap)$/u,

  // Scroll margin/padding
  /^scroll-(?<capture115>m|p)(?<capture116>t|r|b|l|x|y)?-\d+$/u,

  // Min/max content
  /^(?<capture117>w|h)-(?<capture118>min|max|fit)-content$/u,

  // Dynamic references (arbitrary values with var)
  /^\w+-\(--[\w-]+\)$/u,
  /^\w+-\[var\(--[\w-]+\)\]$/u,

  // Tailwind v4 child selector syntax
  /^\*:/u,
  // Tailwind v4 container queries
  /^@/u,

  // Prose classes from typography plugin
  /^prose(?<capture119>-\w+)?$/u,

  // Form utilities
  /^form-(?<capture120>input|textarea|select|multiselect|checkbox|radio)$/u,

  // Motion utilities
  /^motion-(?<capture121>safe|reduce):/u,

  // Supports
  /^supports-\[.+\]:/u,

  // Logical properties already covered but adding explicit ones
  /^(?<capture122>inline|block)-(?<capture123>start|end)/u,

  // Tab size
  /^tab-\d+$/u,

  // Text indent
  /^indent-\d+$/u,

  // Vertical alignment (already covered but being explicit)
  /^vertical-(?<capture124>top|middle|bottom|baseline|text-top|text-bottom|sub|super)$/u,

  // Negative margins
  /^-m[trblxy]?-\d+$/u,
  /^-(?<capture125>top|right|bottom|left|inset)-\d+$/u,

  // Arbitrary properties
  /^\[[\w-]+:.+\]$/u,

  // Group and peer modifiers
  /^group\/\w+$/u,
  /^peer\/\w+$/u,

  // Max container widths that are standard
  /^max-w-(?<capture126>xs|sm|md|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|full|min|max|fit|prose|screen-sm|screen-md|screen-lg|screen-xl|screen-2xl)$/u,

  // Screen height variants
  /^(?<capture127>h|min-h|max-h)-(?<capture128>svh|lvh|dvh|screen)$/u,

  // Opacity modifiers (color/XX syntax) - e.g., bg-success/10, bg-surface/70
  /\/\d+$/u,

  // Placement values (Zag.js component props, not Tailwind classes)
  /^(?<capture129>top|bottom|left|right)-(?<capture130>start|end)$/u,
]

// Precompute prefix helpers
const PREFIX_TO_NAMESPACES = (() => {
  /** @type {Map<string, string[]>} */
  const map = new Map()
  for (const [namespace, prefixes] of Object.entries(NAMESPACE_MAPPINGS)) {
    for (const prefix of prefixes) {
      const namespaces = map.get(prefix) ?? []
      namespaces.push(namespace)
      map.set(prefix, namespaces)
    }
  }
  return map
})()

const KNOWN_PREFIXES = (() => {
  /** @type {string[]} */
  const prefixes = []
  for (const prefix of PREFIX_TO_NAMESPACES.keys()) {
    const insertionIndex = prefixes.findIndex(
      (existingPrefix) => existingPrefix.length < prefix.length,
    )
    if (insertionIndex === -1) {
      prefixes.push(prefix)
    } else {
      prefixes.splice(insertionIndex, 0, prefix)
    }
  }
  return prefixes
})()

/**
 * Add classes matched by one pattern.
 * @param {{ className: string, line: number }[]} results - Destination.
 * @param {string} line - Source line.
 * @param {number} lineNumber - One-based line number.
 * @param {RegExp} pattern - Class string pattern.
 */
const addPatternMatches = (results, line, lineNumber, pattern) => {
  for (const match of line.matchAll(pattern)) {
    const classString = match.groups?.classString
    if (classString === undefined) {
      continue
    }
    for (const className of classString.split(WHITESPACE_REGEX)) {
      const trimmedClassName = className.trim()
      if (trimmedClassName !== "") {
        results.push({ className: trimmedClassName, line: lineNumber })
      }
    }
  }
}

/** @type {RegExp[]} */
const CLASS_PATTERNS = [
  /className\s*=\s*["'`](?<classString>[^"'`]+)["'`]/gu,
  /(?:cn|clsx)\s*\(\s*['"`](?<classString>[^'"`]+)['"`]/gu,
  /['"`](?<classString>[^'"`]*(?:bg-|text-|border-|p-|m-|gap-|rounded-|w-|h-)[^'"`]*)['"`]/gu,
]

/**
 * Extract Tailwind classes from TSX content with line numbers.
 * @param {string} content - TSX source.
 * @returns {{ className: string, line: number }[]} Extracted classes.
 */
const extractTailwindClassesWithLines = (content) => {
  /** @type {{ className: string, line: number }[]} */
  const results = []
  const lines = content.split("\n")

  for (const [lineIndex, line] of lines.entries()) {
    const trimmedLine = line.trim()
    if (trimmedLine.startsWith("//") || trimmedLine.startsWith("import ")) {
      continue
    }
    for (const pattern of CLASS_PATTERNS) {
      addPatternMatches(results, line, lineIndex + 1, pattern)
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

const HORIZONTAL_SIZE_PREFIXES = new Set(["w", "min-w", "max-w"])
const VERTICAL_SIZE_PREFIXES = new Set(["h", "min-h", "max-h"])
const EDGE_PREFIXES = new Set(["top", "right", "bottom", "left"])

/**
 * Add tokens for one namespace.
 * @param {string[]} tokens - Destination tokens.
 * @param {string} namespace - Tailwind namespace.
 * @param {string} prefix - Utility prefix.
 * @param {string} value - Utility value.
 */
const addNamespaceTokens = (tokens, namespace, prefix, value) => {
  if (namespace === "font-weight") {
    tokens.push(`--font-weight-${value}`)
    return
  }
  if (namespace === "container") {
    tokens.push(`--container-${value}`)
    if (HORIZONTAL_SIZE_PREFIXES.has(prefix)) {
      tokens.push(`--width-${value}`)
    }
    if (VERTICAL_SIZE_PREFIXES.has(prefix)) {
      tokens.push(`--height-${value}`)
    }
    return
  }
  if (namespace === "spacing") {
    tokens.push(`--spacing-${value}`)
    if (EDGE_PREFIXES.has(prefix)) {
      tokens.push(`--inset-${value}`)
    }
    return
  }
  tokens.push(`--${namespace}-${value}`)
}

/**
 * Map Tailwind utility class to possible CSS custom properties.
 * @param {string} className - Tailwind class.
 * @returns {string[]} Candidate token names.
 */
const mapClassToPossibleTokens = (className) => {
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

  if (prefix === null || value === null || value === "") {
    return []
  }

  /** @type {string[]} */
  const possibleTokens = []
  const namespaces = PREFIX_TO_NAMESPACES.get(prefix) ?? []

  for (const namespace of namespaces) {
    addNamespaceTokens(possibleTokens, namespace, prefix, value)
  }

  // Add specific namespace alternatives
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
    possibleTokens.push(`--width-${value}`, `--container-${value}`)
  }

  if (["h", "min-h", "max-h"].includes(prefix)) {
    possibleTokens.push(`--height-${value}`, `--container-${value}`)
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

  // Component-specific tokens
  possibleTokens.push(`--${prefix}-${value}`)

  return [...new Set(possibleTokens)]
}

/**
 * Recursively find all CSS files in a directory.
 * @param {string} directory - Directory to scan.
 * @returns {string[]} CSS file paths.
 */
const findCssFiles = (directory) => {
  /** @type {string[]} */
  const results = []
  try {
    const entries = fs.readdirSync(directory, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        results.push(...findCssFiles(fullPath))
      } else if (entry.isFile() && entry.name.endsWith(".css")) {
        results.push(fullPath)
      }
    }
  } catch {
    // Skip directories we can't read
  }
  return results
}

/**
 * Add tokens from one CSS file.
 * @param {Set<string>} tokens - Destination token set.
 * @param {string} file - CSS file path.
 * @param {string} displayPath - Path used in diagnostics.
 */
const addTokensFromFile = (tokens, file, displayPath) => {
  try {
    const content = fs.readFileSync(file, "utf-8")
    for (const match of content.matchAll(/--(?<token>[\w-]+)\s*:/gu)) {
      const token = match.groups?.token
      if (token !== undefined) {
        tokens.add(`--${token}`)
      }
    }
  } catch (error) {
    console.error(
      `⚠️  Failed to read ${displayPath}:`,
      error instanceof Error ? error.message : String(error),
    )
  }
}

/** Load defined tokens from CSS files.
 * @returns {Set<string>} Defined token names.
 */
const loadDefinedTokens = () => {
  /** @type {Set<string>} */
  const tokens = new Set()

  for (const file of TOKEN_FILES) {
    const fullPath = path.join(ROOT, file)
    if (fs.existsSync(fullPath)) {
      addTokensFromFile(tokens, fullPath, file)
    }
  }

  for (const directory of TOKEN_DIRS) {
    for (const file of findCssFiles(path.join(ROOT, directory))) {
      addTokensFromFile(tokens, file, file)
    }
  }

  return tokens
}

/**
 * Check if a class should be ignored.
 * @param {string} className - Tailwind class.
 * @returns {boolean} Whether to ignore it.
 */
const shouldIgnoreClass = (className) => {
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
 * Extract tokens from arbitrary utility syntax.
 * @param {string} className - Tailwind class.
 * @returns {string[]} Referenced tokens.
 */
const extractTokensFromArbitraryUtility = (className) => {
  /** @type {Set<string>} */
  const tokens = new Set()

  // var(--token)
  for (const m of className.matchAll(/var\(\s*(?<capture136>--[\w-]+)/giu)) {
    tokens.add(m[1])
  }

  // key:(--token) syntax
  for (const m of className.matchAll(/\((?<capture137>--[\w-]+)\)/giu)) {
    tokens.add(m[1])
  }

  return [...tokens]
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
 * Check for invalid Tailwind default spacing.
 * @param {string} className - Tailwind class.
 * @returns {string | null} Error message or null.
 */
const checkInvalidSpacing = (className) => {
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
 * Check for Tailwind palette colors with numeric suffixes.
 * @param {string} className - Tailwind class.
 * @returns {string | null} Error message or null.
 */
const checkPaletteColor = (className) => {
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
 * Find the first validation error for a class.
 * @param {string} className - Tailwind class.
 * @param {Set<string>} definedTokens - Defined CSS tokens.
 * @returns {{ expectedTokens: string[], type: FindingType } | null} Finding data.
 */
const findClassError = (className, definedTokens) => {
  const spacingError = checkInvalidSpacing(className)
  if (spacingError !== null) {
    return { expectedTokens: [spacingError], type: "spacing" }
  }

  const paletteError = checkPaletteColor(className)
  if (paletteError !== null) {
    return { expectedTokens: [paletteError], type: "palette" }
  }

  const arbitraryTokens = extractTokensFromArbitraryUtility(className)
  if (arbitraryTokens.length > 0) {
    const missingTokens = arbitraryTokens.filter(
      (token) => !definedTokens.has(token),
    )
    return missingTokens.length > 0
      ? { expectedTokens: missingTokens, type: "arbitrary" }
      : null
  }

  if (shouldIgnoreClass(className)) {
    return null
  }

  const possibleTokens = mapClassToPossibleTokens(className)
  if (
    possibleTokens.length === 0 ||
    possibleTokens.some((token) => definedTokens.has(token))
  ) {
    return null
  }

  return { expectedTokens: possibleTokens.slice(0, 3), type: "token" }
}

/**
 * Collect findings from component files.
 * @param {string[]} componentFiles - Files to scan.
 * @param {Set<string>} definedTokens - Defined CSS tokens.
 * @returns {Map<string, Finding[]>} Findings grouped by file.
 */
const collectFindings = (componentFiles, definedTokens) => {
  /** @type {Map<string, Finding[]>} */
  const errorsByFile = new Map()
  for (const file of componentFiles) {
    const content = fs.readFileSync(path.join(ROOT, file), "utf-8")
    /** @type {Finding[]} */
    const fileErrors = []
    for (const { className, line } of extractTailwindClassesWithLines(
      content,
    )) {
      const classError = findClassError(className, definedTokens)
      if (classError !== null) {
        fileErrors.push({ className, line, ...classError })
      }
    }
    if (fileErrors.length > 0) {
      errorsByFile.set(file, fileErrors)
    }
  }
  return errorsByFile
}

/** @param {Map<string, Finding[]>} errorsByFile - Findings grouped by file. */
const printReport = (errorsByFile) => {
  const counts = { arbitrary: 0, palette: 0, spacing: 0, token: 0 }
  for (const errors of errorsByFile.values()) {
    for (const error of errors) {
      counts[error.type] += 1
    }
  }
  const totalErrors = Object.values(counts).reduce(
    (sum, count) => sum + count,
    0,
  )
  console.log(`❌ Found ${totalErrors} issues:\n`)
  /** @type {[number, string][]} */
  const summaries = [
    [counts.spacing, "📏 Invalid spacing (use 50-950)"],
    [counts.palette, "🎨 Palette colors (use semantic)"],
    [counts.token, "🏷️  Missing tokens"],
    [counts.arbitrary, "📦 Arbitrary values"],
  ]
  for (const [count, label] of summaries) {
    if (count > 0) {
      console.log(`   ${label}: ${count}`)
    }
  }
  console.log()

  const icons = { arbitrary: "📦", palette: "🎨", spacing: "📏", token: "🏷️" }
  for (const [file, errors] of errorsByFile) {
    console.log(`📄 ${file}:`)
    for (const error of errors) {
      console.log(
        `  ${icons[error.type]} Line ${error.line}: ${error.className} → ${error.expectedTokens.join(" OR ")}`,
      )
    }
    console.log()
  }
}

/** Main validation function.
 * @returns {boolean} Whether validation passed.
 */
const validateTokenUsage = () => {
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

  const errorsByFile = collectFindings(componentFiles, definedTokens)
  if (errorsByFile.size === 0) {
    console.log(
      "✅ All component classes have corresponding token definitions!",
    )
    return true
  }

  printReport(errorsByFile)
  return false
}

// Run validation
try {
  const success = validateTokenUsage()
  process.exit(success ? 0 : 1)
} catch (error) {
  const failure = error instanceof Error ? error : new Error(String(error))
  console.error("💥 Validation failed:", failure.message)
  if (failure.stack !== undefined) {
    console.error(failure.stack)
  }
  process.exit(1)
}

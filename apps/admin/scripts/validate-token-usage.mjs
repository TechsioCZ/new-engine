#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(SCRIPT_DIR, "..")
const WORKSPACE_ROOT = path.resolve(ROOT, "../..")
const SRC_DIR = path.join(ROOT, "src")
const TOKEN_DIRS = [
  path.join(ROOT, "src/styles/tokens"),
  path.join(WORKSPACE_ROOT, "libs/ui/src/tokens"),
]
const FILE_EXTENSIONS = new Set([".ts", ".tsx"])
const IGNORED_FILE_SUFFIXES = [".test.ts", ".test.tsx", ".spec.ts", ".spec.tsx"]
const STRING_LITERAL_PATTERN = /"([^"]*)"|'([^']*)'|`([^`]*)`/g
const WHITESPACE_PATTERN = /\s+/
const CSS_TOKEN_PATTERN = /--[\w-]+/g
const TOKEN_DEFINITION_PATTERN = /--([\w-]+)\s*:/g
const OPACITY_SUFFIX_PATTERN = /\/\d+$/
const INTEGER_PATTERN = /^\d+$/

const TAILWIND_PALETTE_NAMES = new Set([
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
])

const COLOR_PREFIXES = [
  "border-t",
  "border-r",
  "border-b",
  "border-l",
  "border-x",
  "border-y",
  "ring-offset",
  "bg",
  "text",
  "border",
  "fill",
  "stroke",
  "outline",
  "ring",
  "accent",
  "caret",
  "decoration",
  "from",
  "via",
  "to",
]

const TOKEN_PREFIXES = [
  ["ring-offset", ["color", "spacing"]],
  ["border-t", ["color", "border", "spacing"]],
  ["border-r", ["color", "border", "spacing"]],
  ["border-b", ["color", "border", "spacing"]],
  ["border-l", ["color", "border", "spacing"]],
  ["border-x", ["color", "border", "spacing"]],
  ["border-y", ["color", "border", "spacing"]],
  ["grid-cols", []],
  ["grid-rows", []],
  ["auto-cols", []],
  ["auto-rows", []],
  ["translate-x", ["spacing"]],
  ["translate-y", ["spacing"]],
  ["-translate-x", ["spacing"]],
  ["-translate-y", ["spacing"]],
  ["max-w", ["container", "spacing", "width"]],
  ["min-w", ["container", "spacing", "width"]],
  ["max-h", ["container", "spacing", "height"]],
  ["min-h", ["container", "spacing", "height"]],
  ["space-x", ["spacing", "space"]],
  ["space-y", ["spacing", "space"]],
  ["gap-x", ["spacing", "gap"]],
  ["gap-y", ["spacing", "gap"]],
  ["inset-x", ["spacing", "inset"]],
  ["inset-y", ["spacing", "inset"]],
  ["rounded-t", ["radius"]],
  ["rounded-r", ["radius"]],
  ["rounded-b", ["radius"]],
  ["rounded-l", ["radius"]],
  ["rounded-tl", ["radius"]],
  ["rounded-tr", ["radius"]],
  ["rounded-br", ["radius"]],
  ["rounded-bl", ["radius"]],
  ["outline-offset", ["spacing"]],
  ["duration", ["duration"]],
  ["delay", ["duration"]],
  ["ease", ["ease"]],
  ["text", ["color", "text"]],
  ["font", ["font", "font-weight"]],
  ["leading", ["leading"]],
  ["tracking", ["tracking"]],
  ["shadow", ["shadow", "color"]],
  ["drop-shadow", ["drop-shadow", "shadow"]],
  ["inset-shadow", ["inset-shadow", "shadow"]],
  ["rounded", ["radius"]],
  ["border", ["color", "border", "spacing"]],
  ["outline", ["color", "spacing"]],
  ["ring", ["color", "spacing"]],
  ["bg", ["color"]],
  ["fill", ["color"]],
  ["stroke", ["color"]],
  ["accent", ["color"]],
  ["caret", ["color"]],
  ["decoration", ["color"]],
  ["from", ["color"]],
  ["via", ["color"]],
  ["to", ["color"]],
  ["p", ["spacing", "padding"]],
  ["px", ["spacing", "padding"]],
  ["py", ["spacing", "padding"]],
  ["pt", ["spacing", "padding"]],
  ["pr", ["spacing", "padding"]],
  ["pb", ["spacing", "padding"]],
  ["pl", ["spacing", "padding"]],
  ["ps", ["spacing", "padding"]],
  ["pe", ["spacing", "padding"]],
  ["m", ["spacing", "margin"]],
  ["mx", ["spacing", "margin"]],
  ["my", ["spacing", "margin"]],
  ["mt", ["spacing", "margin"]],
  ["mr", ["spacing", "margin"]],
  ["mb", ["spacing", "margin"]],
  ["ml", ["spacing", "margin"]],
  ["ms", ["spacing", "margin"]],
  ["me", ["spacing", "margin"]],
  ["gap", ["spacing", "gap"]],
  ["w", ["container", "spacing", "width"]],
  ["h", ["container", "spacing", "height"]],
  ["size", ["spacing", "size"]],
  ["top", ["spacing", "inset"]],
  ["right", ["spacing", "inset"]],
  ["bottom", ["spacing", "inset"]],
  ["left", ["spacing", "inset"]],
  ["inset", ["spacing", "inset"]],
  ["aspect", ["aspect"]],
  ["z", ["z"]],
  ["opacity", ["opacity"]],
  ["blur", ["blur"]],
]

const SPECIAL_VALUES = new Set([
  "0",
  "auto",
  "px",
  "full",
  "screen",
  "min",
  "max",
  "fit",
  "dvh",
  "svh",
  "lvh",
  "none",
  "current",
  "transparent",
  "inherit",
])

const IGNORED_BASE_PATTERNS = [
  /^(flex|grid|block|inline|inline-block|inline-flex|hidden|contents|table|flow-root)$/,
  /^(absolute|relative|fixed|sticky|static)$/,
  /^(items|justify|content|self|place-items|place-content|place-self)-(start|end|center|stretch|between|around|evenly|baseline)$/,
  /^(flex|grid)-(row|col|wrap|nowrap|flow|none|1|auto|initial)$/,
  /^(overflow|overscroll)-(auto|hidden|clip|visible|scroll|x-auto|y-auto|x-hidden|y-hidden|x-clip|y-clip|x-visible|y-visible|x-scroll|y-scroll)$/,
  /^(object|bg)-(contain|cover|fill|none|scale-down|center|top|right|bottom|left)$/,
  /^(whitespace|break)-(normal|nowrap|pre|pre-line|pre-wrap|words|all|keep)$/,
  /^(text)-(left|center|right|justify|start|end|wrap|nowrap|balance|pretty|ellipsis|clip)$/,
  /^(font)-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black|sans|serif|mono)$/,
  /^(leading|tracking)-(none|tight|snug|normal|relaxed|loose|wide|wider|widest)$/,
  /^(uppercase|lowercase|capitalize|normal-case|italic|not-italic|truncate)$/,
  /^(transition|transform|animate|motion-safe|motion-reduce)(-.+)?$/,
  /^(duration|delay)-\d+$/,
  /^(ease)-(linear|in|out|in-out)$/,
  /^(border|divide)-(solid|dashed|dotted|double|none|collapse|separate)$/,
  /^border(?:-[trblxyse])?$/,
  /^border(?:-[trblxyse])?-(0|2|4|8)$/,
  /^rounded-none$/,
  /^shadow-none$/,
  /^ring-(0|1|2|4|8|inset)$/,
  /^(cursor|pointer-events|select|resize|appearance|sr-only|not-sr-only)(-.+)?$/,
  /^(grow|shrink)(-0)?$/,
  /^(basis|order|col|row)-.+$/,
  /^grid-(cols|rows)-(\d+|none|subgrid)$/,
  /^col-span-(\d+|full)$/,
  /^row-span-(\d+|full)$/,
  /^aspect-(auto|square|video)$/,
  /^z-(\d+|auto)$/,
  /^opacity-\d+$/,
  /^align-.+$/,
]

const STRUCTURAL_ARBITRARY_PREFIXES = new Set([
  "grid-cols",
  "grid-rows",
  "auto-cols",
  "auto-rows",
  "basis",
  "content",
])

const SAFE_ARBITRARY_PROPERTIES = ["overflow-wrap", "word-break", "text-wrap"]

function walkFiles(dir, predicate) {
  const files = []

  if (!fs.existsSync(dir)) {
    return files
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolutePath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      files.push(...walkFiles(absolutePath, predicate))
      continue
    }

    if (entry.isFile() && predicate(absolutePath)) {
      files.push(absolutePath)
    }
  }

  return files
}

function isSourceFile(filePath) {
  const fileName = path.basename(filePath)

  return (
    FILE_EXTENSIONS.has(path.extname(fileName)) &&
    !IGNORED_FILE_SUFFIXES.some((suffix) => fileName.endsWith(suffix))
  )
}

function toRelative(filePath) {
  return path.relative(ROOT, filePath).replaceAll(path.sep, "/")
}

function lineNumberForIndex(content, index) {
  return content.slice(0, index).split("\n").length
}

function loadDefinedTokens() {
  const tokens = new Set()

  for (const tokenDir of TOKEN_DIRS) {
    for (const file of walkFiles(tokenDir, (candidate) =>
      candidate.endsWith(".css")
    )) {
      const content = fs.readFileSync(file, "utf8")

      for (const match of content.matchAll(TOKEN_DEFINITION_PATTERN)) {
        tokens.add(`--${match[1]}`)
      }
    }
  }

  return tokens
}

function splitClassString(value) {
  return value
    .split(WHITESPACE_PATTERN)
    .map((item) => item.trim())
    .filter(Boolean)
}

function extractClassCandidates(content) {
  const candidates = []

  for (const match of content.matchAll(STRING_LITERAL_PATTERN)) {
    const value = (match[1] ?? match[2] ?? match[3] ?? "").replace(
      /\$\{[^}]*\}/g,
      ""
    )

    if (!mightContainClass(value)) {
      continue
    }

    const line = lineNumberForIndex(content, match.index ?? 0)

    for (const className of splitClassString(value)) {
      candidates.push({ className, line })
    }
  }

  return candidates
}

function mightContainClass(value) {
  return splitClassString(value).some((className) => {
    const baseClass = stripVariants(className)

    return (
      baseClass.startsWith("[") ||
      shouldIgnoreBaseClass(baseClass) ||
      parseUtility(baseClass) !== null
    )
  })
}

function stripOpacitySuffix(value) {
  return value.replace(OPACITY_SUFFIX_PATTERN, "")
}

function findTopLevelColon(value) {
  let squareDepth = 0
  let parenDepth = 0

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index]

    if (char === "[") {
      squareDepth += 1
    } else if (char === "]") {
      squareDepth -= 1
    } else if (char === "(") {
      parenDepth += 1
    } else if (char === ")") {
      parenDepth -= 1
    } else if (char === ":" && squareDepth === 0 && parenDepth === 0) {
      return index
    }
  }

  return -1
}

function stripVariants(className) {
  let baseClass = className

  while (true) {
    if (baseClass.startsWith("!")) {
      baseClass = baseClass.slice(1)
      continue
    }

    if (baseClass.endsWith("!")) {
      baseClass = baseClass.slice(0, -1)
      continue
    }

    const separatorIndex = findTopLevelColon(baseClass)

    if (separatorIndex === -1) {
      return baseClass
    }

    baseClass = baseClass.slice(separatorIndex + 1)
  }
}

function parseUtility(baseClass) {
  const normalized = baseClass.startsWith("-") ? baseClass.slice(1) : baseClass

  for (const [prefix, namespaces] of TOKEN_PREFIXES) {
    if (normalized.startsWith(`${prefix}-`)) {
      const value = normalized.slice(prefix.length + 1)

      if (!value) {
        return null
      }

      return {
        namespaces,
        prefix,
        value,
      }
    }
  }

  return null
}

function tokenCandidates(prefix, value, namespaces) {
  const normalizedValue = stripOpacitySuffix(value)
  const candidates = []

  for (const namespace of namespaces) {
    if (namespace === "font-weight") {
      candidates.push(`--font-weight-${normalizedValue}`)
      continue
    }

    candidates.push(`--${namespace}-${normalizedValue}`)
  }

  if (["w", "h", "size", "min-w", "min-h", "max-w", "max-h"].includes(prefix)) {
    candidates.push(`--spacing-${normalizedValue}`)
  }

  return [...new Set(candidates)]
}

function referencedTokens(value) {
  return [...new Set(value.match(CSS_TOKEN_PATTERN) ?? [])]
}

function isSafeArbitraryProperty(baseClass) {
  if (!(baseClass.startsWith("[") && baseClass.endsWith("]"))) {
    return false
  }

  const propertyName = baseClass.slice(1, -1).split(":")[0]

  return SAFE_ARBITRARY_PROPERTIES.includes(propertyName)
}

function hasKnownTokenReference(value, definedTokens) {
  const tokens = referencedTokens(value)

  return tokens.length > 0 && tokens.every((token) => definedTokens.has(token))
}

function checkPaletteClass(baseClass) {
  const utility = parseUtility(baseClass)

  if (!(utility && COLOR_PREFIXES.includes(utility.prefix))) {
    return null
  }

  const [colorName, shade] = stripOpacitySuffix(utility.value).split("-")

  if (
    TAILWIND_PALETTE_NAMES.has(colorName) &&
    INTEGER_PATTERN.test(shade ?? "")
  ) {
    return `use semantic color token instead of ${colorName}-${shade}`
  }

  return null
}

function isSpecialValue(value) {
  const normalizedValue = stripOpacitySuffix(value)

  return (
    SPECIAL_VALUES.has(normalizedValue) ||
    normalizedValue.includes("/") ||
    normalizedValue.startsWith("[") ||
    normalizedValue.startsWith("(")
  )
}

function shouldIgnoreBaseClass(baseClass) {
  return IGNORED_BASE_PATTERNS.some((pattern) => pattern.test(baseClass))
}

function checkClass(className, definedTokens) {
  const baseClass = stripVariants(className)

  if (
    !baseClass ||
    baseClass.includes("${") ||
    shouldIgnoreBaseClass(baseClass)
  ) {
    return null
  }

  const paletteError = checkPaletteClass(baseClass)

  if (paletteError) {
    return paletteError
  }

  if (baseClass.includes("[") || baseClass.includes("(")) {
    const utility = parseUtility(baseClass)

    if (
      utility &&
      STRUCTURAL_ARBITRARY_PREFIXES.has(utility.prefix) &&
      !referencedTokens(baseClass).some((token) => !definedTokens.has(token))
    ) {
      return null
    }

    if (isSafeArbitraryProperty(baseClass)) {
      return null
    }

    return hasKnownTokenReference(baseClass, definedTokens)
      ? null
      : "arbitrary value must reference an existing design token"
  }

  const utility = parseUtility(baseClass)

  if (
    !utility ||
    utility.namespaces.length === 0 ||
    isSpecialValue(utility.value)
  ) {
    return null
  }

  const candidates = tokenCandidates(
    utility.prefix,
    utility.value,
    utility.namespaces
  )

  return candidates.some((token) => definedTokens.has(token))
    ? null
    : `missing token for ${baseClass}: expected one of ${candidates.join(", ")}`
}

function validateTokenUsage() {
  const definedTokens = loadDefinedTokens()
  const findings = []

  for (const file of walkFiles(SRC_DIR, isSourceFile)) {
    const content = fs.readFileSync(file, "utf8")

    for (const { className, line } of extractClassCandidates(content)) {
      const message = checkClass(className, definedTokens)

      if (!message) {
        continue
      }

      findings.push({
        className,
        file: toRelative(file),
        line,
        message,
      })
    }
  }

  if (findings.length === 0) {
    console.log("Admin token usage validation passed.")
    return true
  }

  console.error("Admin token usage validation failed.")
  console.error(
    "Use token-backed utilities, semantic color tokens, or documented structural layout utilities."
  )

  for (const finding of findings) {
    console.error(
      `${finding.file}:${finding.line} ${finding.className} - ${finding.message}`
    )
  }

  return false
}

process.exit(validateTokenUsage() ? 0 : 1)

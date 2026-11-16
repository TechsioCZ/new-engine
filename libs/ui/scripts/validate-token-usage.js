#!/usr/bin/env node

/**
 * Token Usage Validation Script
 *
 * Validates that all Tailwind classes in components have corresponding token definitions.
 * Follows Tailwind v4 theme variable namespace rules for precise mapping.
 */

import fs, { globSync } from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import ts from "typescript"
import {
  COLOR_PREFIXES,
  GAP_PREFIXES,
  HEIGHT_PREFIXES,
  INSET_PREFIXES,
  MARGIN_PREFIXES,
  PADDING_PREFIXES,
  SINGLE_PREFIX_NAMESPACES,
  SIZING_PREFIXES,
  SPACE_PREFIXES,
  WIDTH_PREFIXES,
} from "./token-utility-prefixes.js"
import {
  loadRuntimeInventory,
  missingVariables,
} from "./validate-token-graph.js"

const ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..")

// Logical inset utilities are governed only by this checker.
const INSET = [...INSET_PREFIXES, "inset-s", "inset-e", "inset-bs", "inset-be"]

// Tailwind v4 namespace to utility prefix mappings. Key order sets the order
// of candidate tokens in error messages (color before text/shadow/border).
const NAMESPACE_MAPPINGS = {
  color: COLOR_PREFIXES,
  container: SIZING_PREFIXES,
  spacing: [
    ...PADDING_PREFIXES,
    ...MARGIN_PREFIXES,
    ...GAP_PREFIXES,
    ...SPACE_PREFIXES,
    ...SIZING_PREFIXES,
    "size",
    ...INSET,
  ],
  ...SINGLE_PREFIX_NAMESPACES,
  "border-width": ["border"],
  size: ["size"],
  "transition-duration": ["duration"],
  leading: ["leading"],
  shadow: ["shadow", "drop-shadow", "inset-shadow"],
  blur: ["blur"],
}

// Standard Tailwind utilities to ignore (not custom tokens)
const IGNORE_PATTERNS = [
  // Standard positioning values
  /^(top|right|bottom|left|inset|inset-x|inset-y|inset-s|inset-e|inset-bs|inset-be)-(0|px|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|auto|full|screen|min|max|fit|start|end|1\/2)$/,

  // Layout & positioning
  /^(flex|grid|block|inline|hidden|absolute|relative|fixed|sticky)$/,
  /^(items|justify|content|self)-(start|end|center|stretch|between|around|evenly)$/,
  /^(flex|grid)-(row|col|flow|wrap|nowrap)$/,
  /^(order|col|row)-(start|end|\d+)$/,

  // Standard spacing (without custom tokens)
  /^(p|m|gap|w|h|max-w|min-w|max-h|min-h|top|right|bottom|left|inset|space)-(0|px|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|auto|full|screen|min|max|fit|end)$/,

  /^size-(full|min|max|fit|auto|px|\d+)$/,

  // Fractional dimensions compile to percentages without theme tokens.
  /^(w|h|min-w|max-w|min-h|max-h|size)-(0|[1-9]\d*)\/[1-9]\d*$/,

  // Margin/padding with directional prefixes
  /^(ml|mr|mt|mb|mx|my|ms|me|pl|pr|pt|pb|px|py|ps|pe)-(0|px|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96|auto|full|screen|min|max|fit)$/,

  // Standard colors including transparent
  /^(bg|text|border)-(transparent|current|black|white|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d{1,3})?(?:\/\d{1,3})?$/,
  /^(bg|text|border|decoration)-(transparent|current|black|white|inherit)$/,

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
  /^border-(t|r|b|l|s|e|x|y)-(0|2|4|8)$/,
  /^border-spacing(?:-[xy])?-(0|px|\d+(?:\.\d+)?)$/,
  /^decoration-(auto|from-font|\d+)$/,
  /^shadow-(sm|md|lg|xl|2xl|inner|none)$/,
  /^opacity-(0|5|10|20|25|30|40|50|60|70|75|80|90|95|100)$/,

  // Pseudo-classes and state modifiers
  /^(hover|focus|active|disabled|group-hover|group-focus):/,
  /^data-\[.+\]:/,

  // Responsive prefixes
  /^(sm|md|lg|xl|2xl):/,

  // Transform & animation
  /^(transform|rotate|scale|translate|skew|transition|ease|delay|animate)-.+$/,
  /^duration-\d+$/,

  // Special edge cases
  /^max-h-\(--available-height\)$/, // Dynamic height references
  /^\*:max-h-\(--available-height\)$/, // Selector prefixes
  /^left-(1\/2)$/, // Fractional positioning

  // Misc utilities
  /^(sr-only|not-sr-only|pointer-events|select|resize|appearance|cursor)-.+$/,
  /^(outline|ring)(?:-(none|hidden|solid|dashed|dotted|double|inset|current|transparent|inherit|0|1|2|4|8))?$/,
  /^outline-offset-\d+$/,
  /^ring-offset-\d+$/,
]

// Precompute prefix helpers for mapping
const KNOWN_PREFIXES = Object.values(NAMESPACE_MAPPINGS)
  .flat()
  .slice()
  .sort((a, b) => b.length - a.length)
const PREFIX_TO_NAMESPACES = (() => {
  const map = new Map()
  for (const [ns, prefixes] of Object.entries(NAMESPACE_MAPPINGS)) {
    if (ns === "border") {
      continue
    }
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
const CLASS_PROPERTIES = new Set(["class", "className"])
const CLASS_HELPERS = new Set(["cn", "clsx", "twMerge", "cx"])
const PAINT_ATTRIBUTES = new Set([
  "style",
  "fill",
  "stroke",
  "color",
  "width",
  "height",
  "backgroundColor",
])
const INLINE_TOKEN_REGEX = /["'](--[a-z][a-z0-9-]*)["']\s*:/gi
const ARBITRARY_VAR_TOKEN_REGEX = /var\(\s*(--[a-z][a-z0-9-]*)/gi
const ARBITRARY_KEY_TOKEN_REGEX = /[:=]\s*(--[a-z][a-z0-9-]*)/gi
const ARBITRARY_BARE_TOKEN_REGEX = /\((--[a-z][a-z0-9-]*)/gi

const PREFIX_TOKEN_ALIASES = [
  [PADDING_PREFIXES, ["padding", "spacing"]],
  [MARGIN_PREFIXES, ["margin", "spacing"]],
  [GAP_PREFIXES, ["gap", "spacing"]],
  [WIDTH_PREFIXES, ["width"]],
  [HEIGHT_PREFIXES, ["height"]],
  [SPACE_PREFIXES, ["space", "spacing"]],
  [INSET, ["inset", "spacing"]],
].map(([prefixes, namespaces]) => ({ prefixes: new Set(prefixes), namespaces }))

const EXTERNAL_TOKENS = new Set([
  "--available-height",
  "--available-width",
  "--height",
  "--width",
  // Zag Tabs/Toast establish these numeric/geometry inputs on their parts.
  "--x",
  "--y",
  "--scale",
  "--opacity",
  "--border-width-badge-dynamic",
  // Shared popup-size-* utilities establish these inherited runtime inputs.
  "--popup-item-x",
  "--popup-item-y",
  "--popup-item-gap",
])

function addClasses(classes, classString) {
  for (const className of classString.match(CLASS_STRING_REGEX) || []) {
    classes.add(className.trim())
  }
}

function propertyName(node) {
  return node?.name &&
    (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name))
    ? node.name.text
    : null
}

/** Parse executable consumers, not comments, prose, property names or types.
 * Resolve local constants only when they are reached from a class/paint sink. */
export function extractSourceConsumers(content) {
  const source = ts.createSourceFile(
    "consumer.tsx",
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  )
  const declarations = new Map()
  function index(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      const entries = declarations.get(node.name.text) ?? []
      entries.push(node)
      declarations.set(node.name.text, entries)
    }
    ts.forEachChild(node, index)
  }
  index(source)
  const classes = new Set(),
    paint = new Set()
  function binding(identifier) {
    // Lexical ancestors distinguish same-named constants in separate functions.
    for (let scope = identifier.parent; scope; scope = scope.parent) {
      for (const declaration of declarations.get(identifier.text) ?? []) {
        let owner = declaration.parent
        while (owner && !ts.isBlock(owner) && !ts.isSourceFile(owner)) {
          owner = owner.parent
        }
        if (owner === scope) {
          return declaration.initializer
        }
      }
    }
    return null
  }
  function collect(node, output, seen = new Set()) {
    if (!node || seen.has(node)) {
      return
    }
    const next = new Set(seen).add(node)
    const child = (value) => collect(value, output, next)
    switch (node.kind) {
      case ts.SyntaxKind.StringLiteral:
      case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
        output.add(node.text)
        break
      case ts.SyntaxKind.TemplateExpression:
        output.add(node.head.text)
        for (const span of node.templateSpans) {
          child(span.expression)
          output.add(span.literal.text)
        }
        break
      case ts.SyntaxKind.Identifier:
        child(binding(node))
        break
      case ts.SyntaxKind.ConditionalExpression:
        child(node.whenTrue)
        child(node.whenFalse)
        break
      case ts.SyntaxKind.PropertyAssignment:
        child(node.initializer)
        break
      case ts.SyntaxKind.ShorthandPropertyAssignment:
        child(node.name)
        break
      case ts.SyntaxKind.CallExpression:
        node.arguments.forEach(child)
        break
      case ts.SyntaxKind.ObjectLiteralExpression:
        for (const prop of node.properties) {
          // clsx({ "bg-example": enabled }) uses class names as keys.
          if (ts.isPropertyAssignment(prop) && ts.isStringLiteral(prop.name)) {
            output.add(prop.name.text)
          }
          child(prop)
        }
        break
      case ts.SyntaxKind.ArrayLiteralExpression:
        node.elements.forEach(child)
        break
      case ts.SyntaxKind.BinaryExpression:
        child(node.left)
        child(node.right)
        break
      case ts.SyntaxKind.ParenthesizedExpression:
      case ts.SyntaxKind.AsExpression:
      case ts.SyntaxKind.SatisfiesExpression:
      case ts.SyntaxKind.NonNullExpression:
      case ts.SyntaxKind.JsxExpression:
      case ts.SyntaxKind.SpreadElement:
      case ts.SyntaxKind.SpreadAssignment:
      case ts.SyntaxKind.ElementAccessExpression:
      case ts.SyntaxKind.PropertyAccessExpression:
        // Dynamic lookup may select any entry in a local class/style map.
        child(node.expression)
        break
      default:
        break
    }
  }
  function collectCompound(node) {
    if (!ts.isArrayLiteralExpression(node)) {
      return
    }
    for (const variant of node.elements) {
      if (!ts.isObjectLiteralExpression(variant)) {
        continue
      }
      for (const field of variant.properties) {
        if (CLASS_PROPERTIES.has(propertyName(field))) {
          collect(field, classes)
        }
      }
    }
  }
  function collectRecipe(config) {
    if (!(config && ts.isObjectLiteralExpression(config))) {
      return
    }
    for (const prop of config.properties) {
      const key = propertyName(prop)
      if (["base", "slots", "variants"].includes(key)) {
        collect(prop, classes)
      }
      if (
        ["compoundSlots", "compoundVariants"].includes(key) &&
        ts.isPropertyAssignment(prop)
      ) {
        collectCompound(prop.initializer)
      }
    }
  }
  function collectCall(node) {
    if (!ts.isIdentifier(node.expression)) {
      return
    }
    if (CLASS_HELPERS.has(node.expression.text)) {
      for (const arg of node.arguments) {
        collect(arg, classes)
      }
    }
    if (node.expression.text === "tv") {
      collectRecipe(node.arguments[0])
    }
  }
  function visit(node) {
    const name = propertyName(node)
    if (ts.isJsxAttribute(node) || ts.isPropertyAssignment(node)) {
      if (CLASS_PROPERTIES.has(name)) {
        collect(node.initializer, classes)
      }
      if (
        (ts.isJsxAttribute(node) && PAINT_ATTRIBUTES.has(name)) ||
        name === "style"
      ) {
        collect(node.initializer, paint)
      }
    }
    if (ts.isCallExpression(node)) {
      collectCall(node)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return { classes, paint }
}

function stripClassModifiers(className) {
  let depth = 0,
    last = 0
  for (let index = 0; index < className.length; index += 1) {
    const char = className[index]
    if (char === "\\") {
      index += 1
      continue
    }
    if (char === "[" || char === "(") {
      depth += 1
    }
    if (char === "]" || char === ")") {
      depth -= 1
    }
    if (char === ":" && depth === 0) {
      last = index + 1
    }
  }
  return className.slice(last).replace(/^!|!$/g, "")
}

/**
 * Extract Tailwind classes from TypeScript/JSX content
 */
function extractTailwindClasses(content) {
  const classes = new Set()
  for (const value of extractSourceConsumers(content).classes) {
    addClasses(classes, value)
  }
  return [...classes]
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
 * Load defined tokens and component sources for one validation pass
 */
function loadTokenUsageInputs() {
  const inventory = loadRuntimeInventory()
  const tokens = new Set(inventory.registrations)
  const runtimeTokens = new Set(
    inventory.definitions.map((entry) => entry.name)
  )

  const componentSources = new Map()

  // Also treat inline style custom properties in components as defined
  const componentFiles = globSync("src/**/*.{ts,tsx}", {
    cwd: ROOT,
    exclude: [
      "**/*.stories.tsx",
      "**/*.test.tsx",
      "**/*.spec.tsx",
      "**/*.figma.ts",
    ],
  })
  for (const file of componentFiles) {
    const content = fs.readFileSync(path.join(ROOT, file), "utf8")
    componentSources.set(file, content)
    // style={{ '--var': value }} or object entries '--var': value
    for (const m of content.matchAll(INLINE_TOKEN_REGEX)) {
      runtimeTokens.add(m[1])
    }
  }

  return { definedTokens: tokens, runtimeTokens, componentSources, inventory }
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

function findMissingTokens(
  className,
  definedTokens,
  runtimeTokens = definedTokens
) {
  const arbitraryTokens = extractTokensFromArbitraryUtility(className)
  if (arbitraryTokens.length > 0) {
    const isDefined = (token) =>
      runtimeTokens.has(token) || EXTERNAL_TOKENS.has(token)
    const missing = missingVariables(className.replaceAll("_", " "), isDefined)
    const shorthand = [
      ...className.matchAll(/(?:^|[:=-])\((?:[\w-]+:)?(--[\w-]+)\)/g),
    ]
      .map((match) => match[1])
      .filter((token) => !isDefined(token))
    return [...new Set([...missing, ...shorthand])]
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

function collectFileErrors(content, definedTokens, runtimeTokens) {
  const contentLines = content.split("\n")
  const fileErrors = []

  for (const className of extractTailwindClasses(content)) {
    const expectedTokens = findMissingTokens(
      className,
      definedTokens,
      runtimeTokens
    )
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

  const { definedTokens, runtimeTokens, componentSources } =
    loadTokenUsageInputs()
  console.log(`📋 Found ${definedTokens.size} defined tokens`)

  const errorsByFile = new Map()
  let totalErrors = 0

  for (const [file, content] of componentSources) {
    const fileErrors = collectFileErrors(content, definedTokens, runtimeTokens)
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

export {
  collectFileErrors,
  extractTailwindClasses,
  extractTokensFromArbitraryUtility,
  findMissingTokens,
  mapClassToPossibleTokens,
  stripClassModifiers,
  validateTokenUsage,
}

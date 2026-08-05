#!/usr/bin/env node
/// <reference types="node" />
/*
 * Migrate a component's `_<comp>.css` from the per-selector dark/reverse
 * pattern to a single light-dark() declaration per token.
 *
 * For each Figma-bound token in the component's @theme static block:
 *   - look up its light and dark values in the Figma export
 *   - rewrite as `--name: light-dark(L, D);` (or just `L` if equal)
 *
 * Then strip every dark/reverse/media block (no longer needed — the global
 * `_tokens-base.css` already flips color-scheme for .dark/.light/.reverse
 * and system preference, and `light-dark()` follows that automatically).
 *
 * Hand-kept declarations (not in the Figma export — e.g. font-weight,
 * spacing aliases, bridge tokens) are left untouched.
 *
 * Usage:
 *   node apply-light-dark.mjs <comp> [<comp> ...]
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import process from "node:process"

/** @typedef {Map<string, string>} DeclarationMap */
/** @typedef {[number, number]} Region */
/** @typedef {{ removed: boolean, text: string }} RemovalResult */
/** @typedef {(name: string, originalValue: string) => string | null} ValueLookup */
/** @typedef {{ close: number, openBrace: number }} ThemeSegment */

const scriptDirectory = import.meta.dirname
const REPO_ROOT = path.resolve(scriptDirectory, "..", "..", "..", "..")
const LIGHT_INPUT = path.join(
  REPO_ROOT,
  "libs/ui/src/tokens/figma/light/variables.css",
)
const DARK_INPUT = path.join(
  REPO_ROOT,
  "libs/ui/src/tokens/figma/dark/variables.css",
)
const COMP_DIR_ATOMS = path.join(
  REPO_ROOT,
  "libs/ui/src/tokens/components/atoms",
)

const PROPERTY_PREFIXES = [
  "color",
  "padding",
  "spacing",
  "text",
  "radius",
  "border-width",
]

// Primitive lookup tables for Strategy B. When a Figma-exported value matches
// a known primitive, the script emits `var(--primitive)` instead of the
// literal. See PRIMITIVES-STRATEGY.md for the rationale.
//
// Keys are the exact rem strings that Figma writes (rounded to 2 dp). Values
// are the primitive CSS var names from libs/ui/src/tokens/_{typography,
// spacing,base,semantic}.css. Update this table when primitives change.
/** @type {Readonly<Record<string, string>>} */
const TEXT_PRIMITIVES = {
  "0.8rem": "--text-xs",
  "1.25rem": "--text-md",
  "1.56rem": "--text-lg",
  "1.95rem": "--text-xl",
  "1rem": "--text-sm",
  "2.44rem": "--text-2xl",
}
/** @type {Readonly<Record<string, string>>} */
const SPACING_PRIMITIVES = {
  "0.19rem": "--spacing-50",
  "0.31rem": "--spacing-100",
  "0.63rem": "--spacing-150",
  "0.94rem": "--spacing-200",
  "1.25rem": "--spacing-250",
  "1.5625rem": "--spacing-300",
  "1.6875rem": "--spacing-350",
  "2.25rem": "--spacing-450",
  "2.5625rem": "--spacing-500",
  "2.8125rem": "--spacing-550",
  "2rem": "--spacing-400",
  "3.375rem": "--spacing-600",
  "3.6875rem": "--spacing-650",
  "3.9375rem": "--spacing-700",
  "4.5rem": "--spacing-750",
  "5.0625rem": "--spacing-800",
  "5.625rem": "--spacing-850",
  "6.1875rem": "--spacing-900",
  "6.75rem": "--spacing-950",
}
/** @type {Readonly<Record<string, string>>} */
const RADIUS_PRIMITIVES = {
  "0.25rem": "--radius-sm",
  "0.5rem": "--radius-md",
  "0.75rem": "--radius-lg",
  "0rem": "--radius-none",
}
/** @type {Readonly<Record<string, string>>} */
const BORDER_WIDTH_PRIMITIVES = {
  "0.0625rem": "--border-width-sm",
  "0.06rem": "--border-width-sm",
  "0.125rem": "--border-width-md",
  "0.13rem": "--border-width-md",
  "0.1875rem": "--border-width-lg",
  "0.19rem": "--border-width-lg",
  "0rem": "--border-width-none",
}
/** @type {Readonly<Record<string, Readonly<Record<string, string>>>>} */
const PRIMITIVE_ALIAS_BY_PREFIX = {
  "border-width": BORDER_WIDTH_PRIMITIVES,
  padding: SPACING_PRIMITIVES,
  radius: RADIUS_PRIMITIVES,
  spacing: SPACING_PRIMITIVES,
  text: TEXT_PRIMITIVES,
}

const DECL_RE = /^\s*(?<name>--[a-z0-9-]+):\s*(?<value>[^;]+);/gmu
const THEME_OPEN_RE = /@theme(?:\s+static)?\s*\{/gu
const INNER_DECL_RE =
  /^(?<indent>[ \t]*)(?<name>--[a-z0-9-]+):\s*(?<value>[^;]+);/gmu
const REF_ALIAS_RE =
  /^(?<base>--color-[a-z0-9-]+?)-(?<role>bg|fg|border)(?<suffix>-[a-z0-9-]+)?$/u
const STALE_COMMENT_RE = [
  /\/\* Dark visuals: explicit \.dark\/\.always-dark, OR \.reverse inside a light parent\. \*\/\n/gu,
  /\/\* Light visuals re-asserted: \.reverse inside a dark parent\. \*\/\n/gu,
  /\/\* Dark mode — class-based path \*\/\n/gu,
  /\/\* Dark mode — system-preference fallback \(suppressed by explicit light class\) \*\/\n/gu,
]
const STRIP_BLOCK_RES = [
  /:is\(\.dark, \.always-dark\),\s*\n:is\(\.light, \.always-light\) \.reverse \{/u,
  /:is\(\.dark, \.always-dark\) \.reverse \{/u,
  /:is\(\.dark, \.always-dark\) \{/u,
  /@media \(prefers-color-scheme: dark\) \{/u,
  /@media \(prefers-color-scheme: light\) \{/u,
]
const BLANK_LINES_RE = /\n{3,}/gu
const TRAILING_WS_RE = /[ \t]+\n/gu

// Region markers. Selector-block / comment removal is scoped to the
// substring between these markers — never the whole file. The markers
// are emitted by split-figma-tokens.mjs around generated override blocks.
// Hand-authored selector blocks at file root are left alone.
const REGION_START = "/* === FIGMA-GENERATED OVERRIDES START === */"
const REGION_END = "/* === FIGMA-GENERATED OVERRIDES END === */"

/**
 * @param {string} css - Function input.
 * @returns {DeclarationMap} Function result.
 */
const parseDecls = (css) => {
  /** @type {DeclarationMap} */
  const out = new Map()
  DECL_RE.lastIndex = 0
  for (const match of css.matchAll(DECL_RE)) {
    const { groups } = match
    const name = groups?.name
    const value = groups?.value
    if (name !== undefined && value !== undefined) {
      out.set(name, value.trim())
    }
  }
  return out
}

/**
 * @param {string} name - Function input.
 * @param {string} component - Function input.
 * @returns {boolean} Function result.
 */
const isFigmaBoundForComponent = (name, component) => {
  if (!name.startsWith("--")) {
    return false
  }
  const body = name.slice(2)
  for (const prefix of PROPERTY_PREFIXES) {
    if (body.startsWith(`${prefix}-${component}-`)) {
      return true
    }
    if (body === `${prefix}-${component}`) {
      return true
    }
  }
  return false
}

/**
 * @param {string} text - Function input.
 * @param {number} openIndex - Function input.
 * @returns {number} Function result.
 */
const findClosingBrace = (text, openIndex) => {
  let depth = 0
  for (let index = openIndex; index < text.length; index += 1) {
    if (text[index] === "{") {
      depth += 1
    } else if (text[index] === "}") {
      depth -= 1
      if (depth === 0) {
        return index
      }
    }
  }
  return -1
}

/**
 * @param {string} text - Function input.
 * @param {RegExp} startRegex - Function input.
 * @returns {RemovalResult} Function result.
 */
const removeFirstBlock = (text, startRegex) => {
  const match = text.match(startRegex)
  if (match === null || match.index === undefined) {
    return { removed: false, text }
  }
  const start = match.index
  const open = text.indexOf("{", start)
  const close = findClosingBrace(text, open)
  if (close === -1) {
    return { removed: false, text }
  }
  let end = close + 1
  while (end < text.length && text[end] === "\n") {
    end += 1
  }
  return { removed: true, text: text.slice(0, start) + text.slice(end) }
}

// Find [start, end] indexes of the substring bounded by the region markers,
// or null if either marker is missing. The returned range INCLUDES the
// marker lines so removal of the whole region (when emptied) is possible.
/**
 * @param {string} css - Function input.
 * @returns {Region | null} Function result.
 */
const findRegion = (css) => {
  const startIndex = css.indexOf(REGION_START)
  if (startIndex === -1) {
    return null
  }
  const endIndex = css.indexOf(REGION_END, startIndex + REGION_START.length)
  if (endIndex === -1) {
    return null
  }
  return [startIndex, endIndex + REGION_END.length]
}

/**
 * @param {string} css - Function input.
 * @returns {string} Function result.
 */
const stripSelectorBlocks = (css) => {
  const region = findRegion(css)
  if (region === null) {
    // No generated region detected — file is either already migrated or
    // never used the legacy pattern. Do nothing (avoid touching hand-authored
    // blocks at file root). This matches the CodeRabbit feedback on #425.
    return css
  }
  const [start, end] = region
  let inner = css.slice(start, end)
  for (let pass = 0; pass < 30; pass += 1) {
    let changed = false
    for (const regex of STRIP_BLOCK_RES) {
      const { text, removed } = removeFirstBlock(inner, regex)
      if (removed) {
        inner = text
        changed = true
      }
    }
    if (!changed) {
      break
    }
  }
  return css.slice(0, start) + inner + css.slice(end)
}

/**
 * @param {string} css - Function input.
 * @returns {string} Function result.
 */
const stripLeftoverComments = (css) => {
  const region = findRegion(css)
  if (region === null) {
    return css.replace(BLANK_LINES_RE, "\n\n")
  }
  const [start, end] = region
  let inner = css.slice(start, end)
  for (const regex of STALE_COMMENT_RE) {
    inner = inner.replace(regex, "")
  }
  const out = css.slice(0, start) + inner + css.slice(end)
  return out.replace(BLANK_LINES_RE, "\n\n")
}

/**
 * @param {string} inner - Function input.
 * @param {ValueLookup} valueLookup - Function input.
 * @returns {string} Function result.
 */
const transformThemeInner = (inner, valueLookup) => {
  let cursor = 0
  let out = ""
  INNER_DECL_RE.lastIndex = 0
  for (const match of inner.matchAll(INNER_DECL_RE)) {
    const { groups, index: matchIndex } = match
    const indent = groups?.indent
    const name = groups?.name
    const value = groups?.value
    const [full] = match
    if (
      matchIndex !== undefined &&
      indent !== undefined &&
      name !== undefined &&
      value !== undefined
    ) {
      const resolvedValue = valueLookup(name, value.trim())
      out += inner.slice(cursor, matchIndex)
      out +=
        resolvedValue === null ? full : `${indent}${name}: ${resolvedValue};`
      cursor = matchIndex + full.length
    }
  }
  return out + inner.slice(cursor)
}

/**
 * @param {string} css - Function input.
 * @param {ValueLookup} valueLookup - Function input.
 * @returns {string} Function result.
 */
const transformThemeBlock = (css, valueLookup) => {
  THEME_OPEN_RE.lastIndex = 0
  /** @type {ThemeSegment[]} */
  const segments = []
  let match = THEME_OPEN_RE.exec(css)
  while (match !== null) {
    const startBrace = css.indexOf("{", match.index)
    const close = findClosingBrace(css, startBrace)
    if (close !== -1) {
      segments.push({ close, openBrace: startBrace })
      THEME_OPEN_RE.lastIndex = close + 1
    }
    match = THEME_OPEN_RE.exec(css)
  }
  let out = css
  // Process in reverse so indices don't shift.
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const segment = segments[index]
    if (segment === undefined) {
      continue
    }
    const { openBrace, close } = segment
    const inner = out.slice(openBrace + 1, close)
    const replaced = transformThemeInner(inner, valueLookup)
    out = out.slice(0, openBrace + 1) + replaced + out.slice(close)
  }
  return out
}

// If a token like `--color-X-{bg|fg|border}-Y` has identical light + dark
// values to a reference token `--color-X-Y` in the same component, alias
// the derived token instead of duplicating the value. Matches the
// two-layer convention documented in libs/ui/CLAUDE.md.
/**
 * @param {string} name - Function input.
 * @param {DeclarationMap} lightDecls - Function input.
 * @param {DeclarationMap} darkDecls - Function input.
 * @param {string} component - Function input.
 * @returns {string | null} Function result.
 */
const findReferenceAlias = (name, lightDecls, darkDecls, component) => {
  const match = REF_ALIAS_RE.exec(name)
  if (match === null || match.groups === undefined) {
    return null
  }
  const { base, suffix } = match.groups
  if (base === undefined) {
    return null
  }
  const refName = `${base}${suffix ?? ""}`
  if (refName === name) {
    return null
  }
  if (!lightDecls.has(refName)) {
    return null
  }
  if (!isFigmaBoundForComponent(refName, component)) {
    return null
  }
  if (lightDecls.get(refName) !== lightDecls.get(name)) {
    return null
  }
  if (
    (darkDecls.get(refName) ?? lightDecls.get(refName)) !==
    (darkDecls.get(name) ?? lightDecls.get(name))
  ) {
    return null
  }
  return refName
}

// Strategy B: alias to a code-side primitive when its value matches.
/**
 * @param {string} name - Function input.
 * @param {string} value - Function input.
 * @returns {string | null} Function result.
 */
const findPrimitiveAlias = (name, value) => {
  if (!name.startsWith("--")) {
    return null
  }
  const body = name.slice(2)
  for (const [prefix, table] of Object.entries(PRIMITIVE_ALIAS_BY_PREFIX)) {
    if (body.startsWith(`${prefix}-`) || body === prefix) {
      const primitive = table[value]
      if (primitive !== undefined) {
        return primitive
      }
    }
  }
  return null
}

/**
 * @param {string} light - Function input.
 * @param {string} dark - Function input.
 * @returns {string} Function result.
 */
const emitLightDarkPair = (light, dark) => {
  if (light.length + dark.length > 50) {
    return `light-dark(\n    ${light},\n    ${dark}\n  )`
  }
  return `light-dark(${light}, ${dark})`
}

/**
 * @param {string} name - Function input.
 * @param {DeclarationMap} lightDecls - Function input.
 * @param {DeclarationMap} darkDecls - Function input.
 * @param {string} component - Function input.
 * @returns {string | null} Function result.
 */
const resolveValue = (name, lightDecls, darkDecls, component) => {
  const light = lightDecls.get(name)
  if (light === undefined) {
    return null
  }
  const dark = darkDecls.get(name) ?? light
  if (light === dark) {
    const primitive = findPrimitiveAlias(name, light)
    if (primitive !== null) {
      return `var(${primitive})`
    }
  }
  const reference = findReferenceAlias(name, lightDecls, darkDecls, component)
  if (reference !== null) {
    return `var(${reference})`
  }
  if (light === dark) {
    return light
  }
  return emitLightDarkPair(light, dark)
}

/**
 * @param {string} component - Function input.
 * @param {DeclarationMap} lightDecls - Function input.
 * @param {DeclarationMap} darkDecls - Function input.
 * @returns {ValueLookup} Function result.
 */
const buildValueLookup = (component, lightDecls, darkDecls) => {
  /** @type {ValueLookup} */
  const lookup = (name) => {
    if (!isFigmaBoundForComponent(name, component)) {
      return null
    }
    if (!lightDecls.has(name)) {
      return null
    }
    return resolveValue(name, lightDecls, darkDecls, component)
  }
  return lookup
}

/**
 * @param {string} component - Function input.
 * @param {DeclarationMap} lightDecls - Function input.
 * @param {DeclarationMap} darkDecls - Function input.
 * @returns {void} Function result.
 */
const processComponent = (component, lightDecls, darkDecls) => {
  const componentFile = path.join(COMP_DIR_ATOMS, `_${component}.css`)
  if (!existsSync(componentFile)) {
    console.warn(`! skip ${component}: ${componentFile} not found`)
    return
  }
  let css = readFileSync(componentFile, "utf-8")
  css = stripSelectorBlocks(css)
  css = stripLeftoverComments(css)
  css = transformThemeBlock(
    css,
    buildValueLookup(component, lightDecls, darkDecls),
  )
  css = css.replace(BLANK_LINES_RE, "\n\n").replace(TRAILING_WS_RE, "\n")
  if (!css.endsWith("\n")) {
    css += "\n"
  }
  writeFileSync(componentFile, css)
  console.log(`✓ rewrote ${componentFile}`)
}

/** @returns {void} */
const main = () => {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    console.error("usage: apply-light-dark.mjs <comp> [<comp> ...]")
    process.exit(1)
  }
  const lightDecls = parseDecls(readFileSync(LIGHT_INPUT, "utf-8"))
  const darkDecls = parseDecls(readFileSync(DARK_INPUT, "utf-8"))
  for (const component of args) {
    processComponent(component, lightDecls, darkDecls)
  }
}

main()

#!/usr/bin/env node
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
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, "..", "..", "..", "..")
const LIGHT_INPUT = join(
  REPO_ROOT,
  "libs/ui/src/tokens/figma/light/variables.css"
)
const DARK_INPUT = join(
  REPO_ROOT,
  "libs/ui/src/tokens/figma/dark/variables.css"
)
const COMP_DIR_ATOMS = join(REPO_ROOT, "libs/ui/src/tokens/components/atoms")

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
const TEXT_PRIMITIVES = {
  "0.8rem": "--text-xs",
  "1rem": "--text-sm",
  "1.25rem": "--text-md",
  "1.56rem": "--text-lg",
  "1.95rem": "--text-xl",
  "2.44rem": "--text-2xl",
}
const SPACING_PRIMITIVES = {
  "0.19rem": "--spacing-50",
  "0.31rem": "--spacing-100",
  "0.63rem": "--spacing-150",
  "0.94rem": "--spacing-200",
  "1.25rem": "--spacing-250",
  "1.5625rem": "--spacing-300",
  "1.6875rem": "--spacing-350",
  "2rem": "--spacing-400",
  "2.25rem": "--spacing-450",
  "2.5625rem": "--spacing-500",
  "2.8125rem": "--spacing-550",
  "3.375rem": "--spacing-600",
  "3.6875rem": "--spacing-650",
  "3.9375rem": "--spacing-700",
  "4.5rem": "--spacing-750",
  "5.0625rem": "--spacing-800",
  "5.625rem": "--spacing-850",
  "6.1875rem": "--spacing-900",
  "6.75rem": "--spacing-950",
}
const RADIUS_PRIMITIVES = {
  "0rem": "--radius-none",
  "0.25rem": "--radius-sm",
  "0.5rem": "--radius-md",
  "0.75rem": "--radius-lg",
}
const BORDER_WIDTH_PRIMITIVES = {
  "0rem": "--border-width-none",
  "0.06rem": "--border-width-sm",
  "0.0625rem": "--border-width-sm",
  "0.13rem": "--border-width-md",
  "0.125rem": "--border-width-md",
  "0.19rem": "--border-width-lg",
  "0.1875rem": "--border-width-lg",
}
const PRIMITIVE_ALIAS_BY_PREFIX = {
  text: TEXT_PRIMITIVES,
  padding: SPACING_PRIMITIVES,
  spacing: SPACING_PRIMITIVES,
  radius: RADIUS_PRIMITIVES,
  "border-width": BORDER_WIDTH_PRIMITIVES,
}

const DECL_RE = /^\s*(--[a-z0-9-]+):\s*([^;]+);/gm
const THEME_OPEN_RE = /@theme(?:\s+static)?\s*\{/g
const INNER_DECL_RE = /^([ \t]*)(--[a-z0-9-]+):\s*([^;]+);/gm
const REF_ALIAS_RE = /^(--color-[a-z0-9-]+?)-(bg|fg|border)(-[a-z0-9-]+)?$/
const STALE_COMMENT_RE = [
  /\/\* Dark visuals: explicit \.dark\/\.always-dark, OR \.reverse inside a light parent\. \*\/\n/g,
  /\/\* Light visuals re-asserted: \.reverse inside a dark parent\. \*\/\n/g,
  /\/\* Dark mode — class-based path \*\/\n/g,
  /\/\* Dark mode — system-preference fallback \(suppressed by explicit light class\) \*\/\n/g,
]
const STRIP_BLOCK_RES = [
  /:is\(\.dark, \.always-dark\),\s*\n:is\(\.light, \.always-light\) \.reverse \{/,
  /:is\(\.dark, \.always-dark\) \.reverse \{/,
  /:is\(\.dark, \.always-dark\) \{/,
  /@media \(prefers-color-scheme: dark\) \{/,
  /@media \(prefers-color-scheme: light\) \{/,
]
const BLANK_LINES_RE = /\n{3,}/g
const TRAILING_WS_RE = /[ \t]+\n/g

function parseDecls(css) {
  const out = new Map()
  DECL_RE.lastIndex = 0
  for (const m of css.matchAll(DECL_RE)) {
    out.set(m[1], m[2].trim())
  }
  return out
}

function isFigmaBoundForComponent(name, component) {
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

function findClosingBrace(text, openIdx) {
  let depth = 0
  for (let i = openIdx; i < text.length; i += 1) {
    if (text[i] === "{") {
      depth += 1
    } else if (text[i] === "}") {
      depth -= 1
      if (depth === 0) {
        return i
      }
    }
  }
  return -1
}

function removeFirstBlock(text, startRegex) {
  const m = text.match(startRegex)
  if (!m) {
    return { text, removed: false }
  }
  const start = m.index
  const open = text.indexOf("{", start)
  const close = findClosingBrace(text, open)
  if (close === -1) {
    return { text, removed: false }
  }
  let end = close + 1
  while (end < text.length && text[end] === "\n") {
    end += 1
  }
  return { text: text.slice(0, start) + text.slice(end), removed: true }
}

function stripSelectorBlocks(css) {
  let work = css
  for (let pass = 0; pass < 30; pass += 1) {
    let changed = false
    for (const re of STRIP_BLOCK_RES) {
      const { text, removed } = removeFirstBlock(work, re)
      if (removed) {
        work = text
        changed = true
      }
    }
    if (!changed) {
      break
    }
  }
  return work
}

function stripLeftoverComments(css) {
  let work = css
  for (const re of STALE_COMMENT_RE) {
    work = work.replace(re, "")
  }
  return work.replace(BLANK_LINES_RE, "\n\n")
}

function transformThemeBlock(css, valueLookup) {
  THEME_OPEN_RE.lastIndex = 0
  const segments = []
  let match = THEME_OPEN_RE.exec(css)
  while (match !== null) {
    const startBrace = css.indexOf("{", match.index)
    const close = findClosingBrace(css, startBrace)
    if (close !== -1) {
      segments.push({ start: match.index, openBrace: startBrace, close })
      THEME_OPEN_RE.lastIndex = close + 1
    }
    match = THEME_OPEN_RE.exec(css)
  }
  let out = css
  // Process in reverse so indices don't shift.
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const { openBrace, close } = segments[i]
    const inner = out.slice(openBrace + 1, close)
    INNER_DECL_RE.lastIndex = 0
    const replaced = inner.replace(
      INNER_DECL_RE,
      (full, indent, name, value) => {
        const v = valueLookup(name, value.trim())
        if (v === null) {
          return full
        }
        return `${indent}${name}: ${v};`
      }
    )
    out = out.slice(0, openBrace + 1) + replaced + out.slice(close)
  }
  return out
}

// If a token like `--color-X-{bg|fg|border}-Y` has identical light + dark
// values to a reference token `--color-X-Y` in the same component, alias
// the derived token instead of duplicating the value. Matches the
// two-layer convention documented in libs/ui/CLAUDE.md.
function findReferenceAlias(name, lightDecls, darkDecls, component) {
  const m = name.match(REF_ALIAS_RE)
  if (!m) {
    return null
  }
  const refName = `${m[1]}${m[3] ?? ""}`
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
function findPrimitiveAlias(name, value) {
  if (!name.startsWith("--")) {
    return null
  }
  const body = name.slice(2)
  for (const [prefix, table] of Object.entries(PRIMITIVE_ALIAS_BY_PREFIX)) {
    if (body.startsWith(`${prefix}-`) || body === prefix) {
      const primitive = table[value]
      if (primitive) {
        return primitive
      }
    }
  }
  return null
}

function emitLightDarkPair(l, d) {
  if (l.length + d.length > 50) {
    return `light-dark(\n    ${l},\n    ${d}\n  )`
  }
  return `light-dark(${l}, ${d})`
}

function resolveValue(name, lightDecls, darkDecls, component) {
  const l = lightDecls.get(name)
  const d = darkDecls.get(name) ?? l
  if (l === d) {
    const primitive = findPrimitiveAlias(name, l)
    if (primitive) {
      return `var(${primitive})`
    }
  }
  const ref = findReferenceAlias(name, lightDecls, darkDecls, component)
  if (ref) {
    return `var(${ref})`
  }
  if (l === d) {
    return l
  }
  return emitLightDarkPair(l, d)
}

function buildValueLookup(component, lightDecls, darkDecls) {
  return (name, _originalValue) => {
    if (!isFigmaBoundForComponent(name, component)) {
      return null
    }
    if (!lightDecls.has(name)) {
      return null
    }
    return resolveValue(name, lightDecls, darkDecls, component)
  }
}

function processComponent(component, lightDecls, darkDecls) {
  const compFile = join(COMP_DIR_ATOMS, `_${component}.css`)
  if (!existsSync(compFile)) {
    console.warn(`! skip ${component}: ${compFile} not found`)
    return
  }
  let css = readFileSync(compFile, "utf8")
  css = stripSelectorBlocks(css)
  css = stripLeftoverComments(css)
  css = transformThemeBlock(
    css,
    buildValueLookup(component, lightDecls, darkDecls)
  )
  css = css.replace(BLANK_LINES_RE, "\n\n").replace(TRAILING_WS_RE, "\n")
  if (!css.endsWith("\n")) {
    css += "\n"
  }
  writeFileSync(compFile, css)
  console.log(`✓ rewrote ${compFile}`)
}

function main() {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    console.error("usage: apply-light-dark.mjs <comp> [<comp> ...]")
    process.exit(1)
  }
  const lightDecls = parseDecls(readFileSync(LIGHT_INPUT, "utf8"))
  const darkDecls = parseDecls(readFileSync(DARK_INPUT, "utf8"))
  for (const c of args) {
    processComponent(c, lightDecls, darkDecls)
  }
}

main()

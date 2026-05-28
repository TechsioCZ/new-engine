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
const LIGHT_INPUT = join(REPO_ROOT, "libs/ui/src/tokens/figma/light/variables.css")
const DARK_INPUT = join(REPO_ROOT, "libs/ui/src/tokens/figma/dark/variables.css")
const COMP_DIR_ATOMS = join(REPO_ROOT, "libs/ui/src/tokens/components/atoms")

const PROPERTY_PREFIXES = ["color", "padding", "spacing", "text", "radius", "border-width"]
const DECL_RE = /^\s*(--[a-z0-9-]+):\s*([^;]+);/gm

function parseDecls(css) {
  const out = new Map()
  DECL_RE.lastIndex = 0
  for (const m of css.matchAll(DECL_RE)) {
    out.set(m[1], m[2].trim())
  }
  return out
}

function isFigmaBoundForComponent(name, component) {
  if (!name.startsWith("--")) return false
  const body = name.slice(2)
  for (const prefix of PROPERTY_PREFIXES) {
    if (body.startsWith(`${prefix}-${component}-`)) return true
    if (body === `${prefix}-${component}`) return true
  }
  return false
}

function findClosingBrace(text, openIdx) {
  let depth = 0
  for (let i = openIdx; i < text.length; i++) {
    if (text[i] === "{") depth++
    else if (text[i] === "}") {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

function removeFirstBlock(text, startRegex) {
  const m = text.match(startRegex)
  if (!m) return { text, removed: false }
  const start = m.index
  const open = text.indexOf("{", start)
  const close = findClosingBrace(text, open)
  if (close === -1) return { text, removed: false }
  let end = close + 1
  while (end < text.length && text[end] === "\n") end++
  return { text: text.slice(0, start) + text.slice(end), removed: true }
}

function stripSelectorBlocks(css) {
  const candidates = [
    /:is\(\.dark, \.always-dark\),\s*\n:is\(\.light, \.always-light\) \.reverse \{/,
    /:is\(\.dark, \.always-dark\) \.reverse \{/,
    /:is\(\.dark, \.always-dark\) \{/,
    /@media \(prefers-color-scheme: dark\) \{/,
    /@media \(prefers-color-scheme: light\) \{/,
  ]
  for (let pass = 0; pass < 30; pass++) {
    let changed = false
    for (const re of candidates) {
      const { text, removed } = removeFirstBlock(css, re)
      if (removed) {
        css = text
        changed = true
      }
    }
    if (!changed) break
  }
  return css
}

function stripLeftoverComments(css) {
  // Remove comments that introduced the now-deleted selector blocks.
  const phrases = [
    /\/\* Dark visuals: explicit \.dark\/\.always-dark, OR \.reverse inside a light parent\. \*\/\n/g,
    /\/\* Light visuals re-asserted: \.reverse inside a dark parent\. \*\/\n/g,
    /\/\* Dark mode — class-based path \*\/\n/g,
    /\/\* Dark mode — system-preference fallback \(suppressed by explicit light class\) \*\/\n/g,
  ]
  for (const re of phrases) css = css.replace(re, "")
  // Collapse 3+ blank lines.
  css = css.replace(/\n{3,}/g, "\n\n")
  return css
}

function transformThemeBlock(css, valueLookup) {
  // Find every @theme static { ... } block (there may be only one).
  const themeOpenRe = /@theme(?:\s+static)?\s*\{/g
  let match
  const segments = []
  let lastIdx = 0
  while ((match = themeOpenRe.exec(css)) !== null) {
    const startBrace = css.indexOf("{", match.index)
    const close = findClosingBrace(css, startBrace)
    if (close === -1) continue
    segments.push({ start: match.index, openBrace: startBrace, close })
    themeOpenRe.lastIndex = close + 1
  }
  let out = css
  // Process in reverse so indices don't shift.
  for (let i = segments.length - 1; i >= 0; i--) {
    const { openBrace, close } = segments[i]
    const inner = out.slice(openBrace + 1, close)
    const replaced = inner.replace(
      /^([ \t]*)(--[a-z0-9-]+):\s*([^;]+);/gm,
      (full, indent, name, value) => {
        const v = valueLookup(name, value.trim())
        if (v === null) return full
        return `${indent}${name}: ${v};`
      }
    )
    out = out.slice(0, openBrace + 1) + replaced + out.slice(close)
  }
  return out
}

function buildValueLookup(component, lightDecls, darkDecls) {
  return (name, originalValue) => {
    if (!isFigmaBoundForComponent(name, component)) return null
    if (!lightDecls.has(name)) return null
    const l = lightDecls.get(name)
    const d = darkDecls.get(name) ?? l
    if (l === d) return l
    // Multi-line for readability when values are long.
    if (l.length + d.length > 50) {
      return `light-dark(\n    ${l},\n    ${d}\n  )`
    }
    return `light-dark(${l}, ${d})`
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
  css = transformThemeBlock(css, buildValueLookup(component, lightDecls, darkDecls))
  css = css.replace(/\n{3,}/g, "\n\n").replace(/[ \t]+\n/g, "\n")
  if (!css.endsWith("\n")) css += "\n"
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
  for (const c of args) processComponent(c, lightDecls, darkDecls)
}

main()

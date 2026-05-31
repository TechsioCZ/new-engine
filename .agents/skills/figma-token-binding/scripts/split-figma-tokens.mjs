#!/usr/bin/env node
/*
 * Split the full Figma token export into per-component fragments.
 *
 * Input:
 *   libs/ui/src/tokens/figma/light/variables.css
 *   libs/ui/src/tokens/figma/dark/variables.css
 *
 * Output (per component, e.g. "button"):
 *   libs/ui/src/tokens/figma/light/button.css   (wrapped in @theme static)
 *   libs/ui/src/tokens/figma/dark/button.css    (wrapped in :is(.dark, .always-dark))
 *
 * Sizing tokens identical in both modes appear only in the light file.
 *
 * Membership rule: a token belongs to component `X` iff its name matches
 *   --<property-prefix>-<X>(-…)?: …
 * where <property-prefix> is one of: color, padding, spacing, text, radius,
 * border-width. This excludes tokens for other components that happen to
 * contain the substring (e.g. `--color-product-card-button-*`).
 *
 * Usage:
 *   node split-figma-tokens.mjs <component>
 *   node split-figma-tokens.mjs --list
 *   node split-figma-tokens.mjs --all
 */

import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
// scripts/ → figma-token-binding/ → skills/ → .agents/ → repo root
const REPO_ROOT = resolve(__dirname, "..", "..", "..", "..")
const LIGHT_INPUT = join(
  REPO_ROOT,
  "libs/ui/src/tokens/figma/light/variables.css"
)
const DARK_INPUT = join(
  REPO_ROOT,
  "libs/ui/src/tokens/figma/dark/variables.css"
)
const OUT_DIR_LIGHT = join(REPO_ROOT, "libs/ui/src/tokens/figma/light")
const OUT_DIR_DARK = join(REPO_ROOT, "libs/ui/src/tokens/figma/dark")

const PROPERTY_PREFIXES = [
  "color",
  "padding",
  "spacing",
  "text",
  "radius",
  "border-width",
]

const DECL_RE = /^\s*(--[a-z0-9-]+):\s*([^;]+);/gm
const LEADING_LETTER_RE = /^[a-z]/

function parseDecls(css) {
  const out = new Map()
  DECL_RE.lastIndex = 0
  for (const m of css.matchAll(DECL_RE)) {
    out.set(m[1], m[2].trim())
  }
  return out
}

function tokensForComponent(decls, component) {
  const result = []
  for (const [name, value] of decls) {
    if (!name.startsWith("--")) {
      continue
    }
    const body = name.slice(2)
    for (const prefix of PROPERTY_PREFIXES) {
      if (body.startsWith(`${prefix}-${component}-`)) {
        result.push([name, value])
        break
      }
      if (body === `${prefix}-${component}`) {
        result.push([name, value])
        break
      }
    }
  }
  result.sort((a, b) => a[0].localeCompare(b[0]))
  return result
}

function listComponents(decls) {
  const components = new Set()
  for (const name of decls.keys()) {
    const body = name.slice(2)
    for (const prefix of PROPERTY_PREFIXES) {
      if (body.startsWith(`${prefix}-`)) {
        const rest = body.slice(prefix.length + 1)
        const first = rest.split("-")[0]
        if (first && LEADING_LETTER_RE.test(first)) {
          components.add(first)
        }
      }
    }
  }
  return [...components].sort()
}

function header(mode, component) {
  return [
    "/*",
    ` * ${component} tokens — Figma export (${mode.toUpperCase()} mode${mode === "dark" ? " override" : ""}).`,
    " *",
    " * Generated from tokens/figma/<mode>/variables.css via",
    " * .agents/skills/figma-token-binding/scripts/split-figma-tokens.mjs",
    " *",
    " * DO NOT EDIT BY HAND. Re-run the splitter after updating the Figma export.",
    " */",
    "",
  ].join("\n")
}

function emitLight(component, lightTokens) {
  const body = lightTokens.map(([n, v]) => `  ${n}: ${v};`).join("\n")
  return `${header("light", component)}@theme static {\n${body}\n}\n`
}

// Region markers wrap every generated override block so future runs of
// apply-reverse-blocks.mjs / apply-light-dark.mjs can scope their strip
// to this region only and leave hand-authored selectors at file root
// alone. Matches CodeRabbit feedback on #425.
const REGION_START = "/* === FIGMA-GENERATED OVERRIDES START === */"
const REGION_END = "/* === FIGMA-GENERATED OVERRIDES END === */"

function emitDark(component, lightTokens, darkTokens) {
  const lightMap = new Map(lightTokens)
  // Only tokens present in BOTH modes participate in reverse-block flipping.
  // Dark-only tokens (no light counterpart) cannot be reverted to a light
  // value, so they would emit `: undefined;` if left in `lightBody`. Skip
  // them here — they should live in their own dark-only declaration.
  const overrides = darkTokens.filter(
    ([n, v]) => lightMap.has(n) && lightMap.get(n) !== v
  )
  if (overrides.length === 0) {
    return `${header("dark", component)}/* No tokens differ between light and dark mode. */\n`
  }
  const darkBody = (indent) =>
    overrides.map(([n, v]) => `${indent}${n}: ${v};`).join("\n")
  const lightBody = (indent) =>
    overrides.map(([n]) => `${indent}${n}: ${lightMap.get(n)};`).join("\n")
  // Selector matrix:
  //   .dark           → dark values   (explicit-dark / system-dark)
  //   .light .reverse → dark values   (flip into dark inside an explicit light parent)
  //   .dark  .reverse → light values  (flip back to light inside an explicit dark parent)
  //   no class + .reverse (system pref-aware) → dark or light depending on system pref
  //
  // The system-pref blocks mirror the existing convention in tokens/_semantic.css.
  return [
    header("dark", component),
    `${REGION_START}\n`,
    "/* Dark visuals: explicit .dark/.always-dark, OR .reverse inside a light parent. */\n",
    ":is(.dark, .always-dark),\n",
    ":is(.light, .always-light) .reverse {\n",
    `${darkBody("  ")}\n`,
    "}\n",
    "\n",
    "/* Light visuals re-asserted: .reverse inside a dark parent. */\n",
    ":is(.dark, .always-dark) .reverse {\n",
    `${lightBody("  ")}\n`,
    "}\n",
    "\n",
    "@media (prefers-color-scheme: dark) {\n",
    "  /* System-preference dark, no explicit class. */\n",
    "  :root:not(.light):not(.always-light) {\n",
    `${darkBody("    ")}\n`,
    "  }\n",
    "\n",
    "  /* .reverse inside system-dark: revert to light values. */\n",
    "  .reverse:not(.light):not(.always-light):not(.dark):not(.always-dark) {\n",
    `${lightBody("    ")}\n`,
    "  }\n",
    "}\n",
    "\n",
    "@media (prefers-color-scheme: light) {\n",
    "  /* .reverse with system-light: use dark values. */\n",
    "  .reverse:not(.light):not(.always-light):not(.dark):not(.always-dark) {\n",
    `${darkBody("    ")}\n`,
    "  }\n",
    "}\n",
    `${REGION_END}\n`,
  ].join("")
}

function writeFragment(component, lightTokens, darkTokens) {
  const lightOut = join(OUT_DIR_LIGHT, `${component}.css`)
  const darkOut = join(OUT_DIR_DARK, `${component}.css`)
  writeFileSync(lightOut, emitLight(component, lightTokens))
  writeFileSync(darkOut, emitDark(component, lightTokens, darkTokens))
  console.log(`✓ wrote ${lightOut}`)
  console.log(`✓ wrote ${darkOut}`)
  console.log(
    `  ${lightTokens.length} tokens (${darkTokens.filter(([n, v]) => lightTokens.find(([ln]) => ln === n)?.[1] !== v).length} differ in dark)`
  )
}

function main() {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    console.error("usage: split-figma-tokens.mjs <component> | --list | --all")
    process.exit(1)
  }

  const lightCss = readFileSync(LIGHT_INPUT, "utf8")
  const darkCss = readFileSync(DARK_INPUT, "utf8")
  const lightDecls = parseDecls(lightCss)
  const darkDecls = parseDecls(darkCss)

  if (args[0] === "--list") {
    for (const c of listComponents(lightDecls)) {
      console.log(c)
    }
    return
  }

  const components =
    args[0] === "--all" ? listComponents(lightDecls) : [args[0]]

  for (const component of components) {
    const lightTokens = tokensForComponent(lightDecls, component)
    const darkTokens = tokensForComponent(darkDecls, component)
    if (lightTokens.length === 0) {
      console.warn(`! no tokens found for component "${component}"`)
      continue
    }
    writeFragment(component, lightTokens, darkTokens)
  }
}

main()

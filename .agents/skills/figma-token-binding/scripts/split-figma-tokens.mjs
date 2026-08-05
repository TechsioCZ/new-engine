#!/usr/bin/env node
/// <reference types="node" />
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
import path from "node:path"
import process from "node:process"

/** @typedef {Map<string, string>} DeclarationMap */
/** @typedef {[string, string]} TokenEntry */
/** @typedef {"dark" | "light"} Mode */

const scriptDirectory = import.meta.dirname
// scripts/ → figma-token-binding/ → skills/ → .agents/ → repo root
const REPO_ROOT = path.resolve(scriptDirectory, "..", "..", "..", "..")
const LIGHT_INPUT = path.join(
  REPO_ROOT,
  "libs/ui/src/tokens/figma/light/variables.css",
)
const DARK_INPUT = path.join(
  REPO_ROOT,
  "libs/ui/src/tokens/figma/dark/variables.css",
)
const OUT_DIR_LIGHT = path.join(REPO_ROOT, "libs/ui/src/tokens/figma/light")
const OUT_DIR_DARK = path.join(REPO_ROOT, "libs/ui/src/tokens/figma/dark")

const PROPERTY_PREFIXES = [
  "color",
  "padding",
  "spacing",
  "text",
  "radius",
  "border-width",
]

const DECL_RE = /^\s*(?<name>--[a-z0-9-]+):\s*(?<value>[^;]+);/gmu
const LEADING_LETTER_RE = /^[a-z]/u

/**
 * @param {string} css - CSS source containing custom-property declarations.
 * @returns {DeclarationMap} Parsed declaration names and values.
 */
const parseDecls = (css) => {
  const declarations = new Map()
  DECL_RE.lastIndex = 0
  for (const match of css.matchAll(DECL_RE)) {
    const name = match.groups?.name
    const value = match.groups?.value
    if (name !== undefined && value !== undefined) {
      declarations.set(name, value.trim())
    }
  }
  return declarations
}

/**
 * @param {DeclarationMap} declarations - Available token declarations.
 * @param {string} component - Component name to match.
 * @returns {TokenEntry[]} Matching declarations sorted by token name.
 */
const tokensForComponent = (declarations, component) => {
  /** @type {TokenEntry[]} */
  const result = []
  for (const [name, value] of declarations) {
    const body = name.startsWith("--") ? name.slice(2) : name
    const matchesComponent = PROPERTY_PREFIXES.some(
      (prefix) =>
        body === `${prefix}-${component}` ||
        body.startsWith(`${prefix}-${component}-`),
    )
    if (matchesComponent) {
      const insertionIndex = result.findIndex(
        ([existingName]) => existingName.localeCompare(name) > 0,
      )
      if (insertionIndex === -1) {
        result.push([name, value])
      } else {
        result.splice(insertionIndex, 0, [name, value])
      }
    }
  }
  return result
}

/**
 * @param {DeclarationMap} declarations - Available token declarations.
 * @returns {string[]} Unique component names in lexical order.
 */
const listComponents = (declarations) => {
  /** @type {Set<string>} */
  const components = new Set()
  for (const name of declarations.keys()) {
    const body = name.slice(2)
    const prefix = PROPERTY_PREFIXES.find((candidate) =>
      body.startsWith(`${candidate}-`),
    )
    if (prefix !== undefined) {
      const rest = body.slice(prefix.length + 1)
      const [first] = rest.split("-")
      if (first !== undefined && LEADING_LETTER_RE.test(first)) {
        components.add(first)
      }
    }
  }
  /** @type {string[]} */
  const sortedComponents = []
  for (const component of components) {
    const insertionIndex = sortedComponents.findIndex(
      (existingComponent) => existingComponent > component,
    )
    if (insertionIndex === -1) {
      sortedComponents.push(component)
    } else {
      sortedComponents.splice(insertionIndex, 0, component)
    }
  }
  return sortedComponents
}

/**
 * @param {Mode} mode - Theme mode represented by the fragment.
 * @param {string} component - Component name included in the banner.
 * @returns {string} Generated-file header.
 */
const header = (mode, component) =>
  [
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

/**
 * @param {string} component - Component name used in output metadata.
 * @param {TokenEntry[]} lightTokens - Light-mode token declarations.
 * @returns {string} Complete light-mode fragment.
 */
const emitLight = (component, lightTokens) => {
  const body = lightTokens
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n")
  return `${header("light", component)}@theme static {\n${body}\n}\n`
}

// Region markers wrap every generated override block so future runs of
// apply-reverse-blocks.mjs / apply-light-dark.mjs can scope their strip
// to this region only and leave hand-authored selectors at file root
// alone. Matches CodeRabbit feedback on #425.
const REGION_START = "/* === FIGMA-GENERATED OVERRIDES START === */"
const REGION_END = "/* === FIGMA-GENERATED OVERRIDES END === */"

/**
 * @param {string} component - Component name used in output metadata.
 * @param {TokenEntry[]} lightTokens - Light-mode token declarations.
 * @param {TokenEntry[]} darkTokens - Dark-mode token declarations.
 * @returns {string} Complete dark-mode override fragment.
 */
const emitDark = (component, lightTokens, darkTokens) => {
  const lightMap = new Map(lightTokens)
  // Only tokens present in BOTH modes participate in reverse-block flipping.
  // Dark-only tokens (no light counterpart) cannot be reverted to a light
  // value, so they would emit `: undefined;` if left in `lightBody`. Skip
  // them here — they should live in their own dark-only declaration.
  const overrides = darkTokens.filter(
    ([name, value]) => lightMap.has(name) && lightMap.get(name) !== value,
  )
  if (overrides.length === 0) {
    return `${header("dark", component)}/* No tokens differ between light and dark mode. */\n`
  }
  /** @param {string} indent - Indentation applied to each declaration. */
  const darkBody = (indent) =>
    overrides.map(([name, value]) => `${indent}${name}: ${value};`).join("\n")
  /** @param {string} indent - Indentation applied to each declaration. */
  const lightBody = (indent) =>
    overrides
      .map(([name]) => `${indent}${name}: ${lightMap.get(name)};`)
      .join("\n")
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

/**
 * @param {string} component - Component name used for output filenames.
 * @param {TokenEntry[]} lightTokens - Light-mode token declarations.
 * @param {TokenEntry[]} darkTokens - Dark-mode token declarations.
 * @returns {void} Writes both component fragments.
 */
const writeFragment = (component, lightTokens, darkTokens) => {
  const lightOutput = path.join(OUT_DIR_LIGHT, `${component}.css`)
  const darkOutput = path.join(OUT_DIR_DARK, `${component}.css`)
  writeFileSync(lightOutput, emitLight(component, lightTokens))
  writeFileSync(darkOutput, emitDark(component, lightTokens, darkTokens))
  const lightMap = new Map(lightTokens)
  const differingTokenCount = darkTokens.filter(
    ([name, value]) => lightMap.get(name) !== value,
  ).length
  console.log(`✓ wrote ${lightOutput}`)
  console.log(`✓ wrote ${darkOutput}`)
  console.log(
    `  ${lightTokens.length} tokens (${differingTokenCount} differ in dark)`,
  )
}

const main = () => {
  const args = process.argv.slice(2)
  const [command] = args
  if (command === undefined) {
    console.error("usage: split-figma-tokens.mjs <component> | --list | --all")
    process.exit(1)
  }

  const lightCss = readFileSync(LIGHT_INPUT, "utf-8")
  const darkCss = readFileSync(DARK_INPUT, "utf-8")
  const lightDeclarations = parseDecls(lightCss)
  const darkDeclarations = parseDecls(darkCss)

  if (command === "--list") {
    for (const component of listComponents(lightDeclarations)) {
      console.log(component)
    }
    return
  }

  const components =
    command === "--all" ? listComponents(lightDeclarations) : [command]

  for (const component of components) {
    const lightTokens = tokensForComponent(lightDeclarations, component)
    const darkTokens = tokensForComponent(darkDeclarations, component)
    if (lightTokens.length === 0) {
      console.warn(`! no tokens found for component "${component}"`)
      continue
    }
    writeFragment(component, lightTokens, darkTokens)
  }
}

main()

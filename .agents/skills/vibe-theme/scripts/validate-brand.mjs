#!/usr/bin/env node
/// <reference types="node" />
/*
 * Standalone validator for a code-authored ("vibed") brand. NOT wired into the
 * CI-blocking `pnpm validate:tokens` chain — run it by hand while iterating on
 * a brand, promote it into CI only once it's proven.
 *
 * Usage:
 *   node .agents/skills/vibe-theme/scripts/validate-brand.mjs <brand>
 *
 * Checks (against the base brand: figma/light + figma/dark):
 *   [ERROR]   both figma/<brand>/ and figma/<brand>-dark/ exist
 *   [ERROR]   token-NAME set of each mode === base mode (no missing / extra)
 *   [ERROR]   <brand> light name set === <brand>-dark name set
 *   [ERROR]   no alias→literal downgrade: a token that aliases (var(...)) in
 *             base must not become a raw color literal in the brand — that
 *             breaks the two-layer rule ("component tokens must alias"). Only
 *             primitive scales are allowed to hold literals.
 *   [WARN]    WCAG AA contrast on a curated set of fg/bg pairs (best-effort;
 *             skips pairs it can't resolve to a concrete color).
 *
 * Exit code is non-zero if any ERROR is found. WARN never fails the run.
 */

import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import process from "node:process"

const SCRIPT_DIR = import.meta.dirname
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..", "..", "..", "..")
const FIGMA_DIR = path.join(REPO_ROOT, "libs/ui/src/tokens/figma")

const DECL_RE = /^\s*(?<name>--[a-z0-9-]+):\s*(?<value>[^;]+);/gmu

/**
 * fg / bg pairs to check for AA contrast, with the minimum ratio. 4.5 is AA for
 * normal-size text (badge/button labels are small, so they use 4.5, not the 3.0
 * large-text threshold). Only pairs whose BOTH tokens exist in the per-mode
 * export can be checked — there is no page-background token in the export, so an
 * "accent text on page" pair is intentionally omitted rather than left dead.
 *
 * @typedef {readonly [string, string, string, number]} ContrastPair
 * @type {readonly ContrastPair[]}
 */
const CONTRAST_PAIRS = [
  [
    "--color-button-fg-primary",
    "--color-bg-primary-base",
    "button primary",
    4.5,
  ],
  [
    "--color-badge-fg-primary",
    "--color-badge-bg-primary",
    "badge primary",
    4.5,
  ],
]

let errors = 0
let warns = 0
/** @param {string} message - Message to report. */
const err = (message) => {
  errors += 1
  console.error(`  ✗ ${message}`)
}
/** @param {string} message - Message to report. */
const warn = (message) => {
  warns += 1
  console.warn(`  ⚠ ${message}`)
}
/** @param {string} message - Message to report. */
const ok = (message) => {
  console.log(`  ✓ ${message}`)
}

/**
 * @typedef {Map<string, string>} TokenMap
 * @param {string} relativeDirectory - Directory relative to the Figma token root.
 * @returns {TokenMap | null} Parsed declarations, or null when the file is absent.
 */
const parseDecls = (relativeDirectory) => {
  const file = path.join(FIGMA_DIR, relativeDirectory, "variables.css")
  if (!existsSync(file)) {
    return null
  }
  const css = readFileSync(file, "utf-8")
  /** @type {TokenMap} */
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
 * @param {string} label - Human-readable validation label.
 * @param {TokenMap} brandMap - Brand declarations to validate.
 * @param {TokenMap} baseMap - Reference declarations to compare against.
 */
const checkParity = (label, brandMap, baseMap) => {
  const brandNames = new Set(brandMap.keys())
  const baseNames = new Set(baseMap.keys())
  const missing = [...baseNames].filter((name) => !brandNames.has(name))
  const extra = [...brandNames].filter((name) => !baseNames.has(name))
  if (missing.length === 0 && extra.length === 0) {
    ok(`${label}: name parity with base (${brandNames.size} tokens)`)
    return
  }
  if (missing.length > 0) {
    err(
      `${label}: missing ${missing.length} base tokens, e.g. ${missing.slice(0, 5).join(", ")}`,
    )
  }
  if (extra.length > 0) {
    err(
      `${label}: ${extra.length} tokens not in base, e.g. ${extra.slice(0, 5).join(", ")}`,
    )
  }
}

// Primitive scale names may legitimately hold raw literals.
const PRIMITIVE_RE =
  /^--color-(?:primary|secondary|tertiary|neutral|gray|grey)-(?:alpha-)?\d+$/u

/**
 * @param {string} label - Human-readable validation label.
 * @param {TokenMap} brandMap - Brand declarations to validate.
 * @param {TokenMap} baseMap - Reference declarations to compare against.
 */
const checkAliasDowngrade = (label, brandMap, baseMap) => {
  let count = 0
  for (const [name, baseValue] of baseMap) {
    const brandValue = brandMap.get(name)
    if (brandValue === undefined) {
      continue
    }
    const baseAliases = baseValue.startsWith("var(")
    const brandLiteral = !brandValue.startsWith("var(")
    if (baseAliases && brandLiteral && !PRIMITIVE_RE.test(name)) {
      count += 1
      if (count <= 8) {
        err(`${label}: ${name} downgraded alias→literal (was ${baseValue})`)
      }
    }
  }
  if (count === 0) {
    ok(`${label}: no alias→literal downgrades`)
  } else if (count > 8) {
    err(`${label}: …and ${count - 8} more alias→literal downgrades`)
  }
}

/* ---------- color resolution + WCAG contrast (best-effort) ---------- */

/**
 * @param {string} name - Token name to resolve.
 * @param {TokenMap} map - Token declarations containing aliases.
 * @param {Set<string>} [seen] - Names already visited during recursion.
 * @returns {string | null} Resolved token value, or null for cycles and missing names.
 */
const resolveVar = (name, map, seen = new Set()) => {
  if (seen.has(name)) {
    return null
  }
  seen.add(name)
  const value = map.get(name)
  if (value === undefined) {
    return null
  }
  const match = /^var\((?<name>--[a-z0-9-]+)\)$/u.exec(value)
  const referencedName = match?.groups?.name
  if (referencedName !== undefined) {
    return resolveVar(referencedName, map, seen)
  }
  return value
}

/** @param {number} component - Normalized sRGB component. */
const srgbToLinear = (component) =>
  component <= 0.03928
    ? component / 12.92
    : ((component + 0.055) / 1.055) ** 2.4

/**
 * @typedef {[number, number, number]} LinearRgb
 * @param {string} hex - Hex color string.
 * @returns {LinearRgb | null} Linear RGB components, or null for invalid input.
 */
const hexToLinear = (hex) => {
  let normalized = hex.replace("#", "")
  if (normalized.length === 3) {
    normalized = normalized.replaceAll(/./gu, "$&$&")
  }
  if (normalized.length !== 6) {
    return null
  }
  const red = Number.parseInt(normalized.slice(0, 2), 16) / 255
  const green = Number.parseInt(normalized.slice(2, 4), 16) / 255
  const blue = Number.parseInt(normalized.slice(4, 6), 16) / 255
  return [srgbToLinear(red), srgbToLinear(green), srgbToLinear(blue)]
}

/**
 * @param {string} value - OKLCH color string.
 * @returns {LinearRgb | null} Linear RGB components, or null for invalid input.
 */
const oklchToLinear = (value) => {
  const match =
    /^oklch\(\s*(?<lightness>[\d.]+%?)\s+(?<chroma>[\d.]+)\s+(?<hue>[\d.]+)(?:\s*\/\s*[\d.]+)?\s*\)$/u.exec(
      value,
    )
  const lightnessText = match?.groups?.lightness
  const chromaText = match?.groups?.chroma
  const hueText = match?.groups?.hue
  if (
    lightnessText === undefined ||
    chromaText === undefined ||
    hueText === undefined
  ) {
    return null
  }
  let lightness = Number(lightnessText)
  if (lightnessText.endsWith("%")) {
    lightness /= 100
  }
  const chroma = Number(chromaText)
  const hue = (Number(hueText) * Math.PI) / 180
  const a = chroma * Math.cos(hue)
  const b = chroma * Math.sin(hue)
  const lPrime = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const mPrime = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const sPrime = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * lPrime - 3.3077115913 * mPrime + 0.2309699292 * sPrime,
    -1.2684380046 * lPrime + 2.6097574011 * mPrime - 0.3413193965 * sPrime,
    -0.0041960863 * lPrime - 0.7034186147 * mPrime + 1.707614701 * sPrime,
  ]
}

const NAMED_COLORS = new Map([
  ["black", "#000000"],
  ["white", "#ffffff"],
])

/**
 * @param {string | null} value - Concrete color value to convert.
 * @returns {LinearRgb | null} Linear RGB components, or null for unsupported input.
 */
const toLinear = (value) => {
  if (value === null || value.length === 0) {
    return null
  }
  const normalized = value.trim()
  const namedColor = NAMED_COLORS.get(normalized)
  if (namedColor !== undefined) {
    return hexToLinear(namedColor)
  }
  if (normalized.startsWith("#")) {
    return hexToLinear(normalized)
  }
  if (normalized.startsWith("oklch(")) {
    return oklchToLinear(normalized)
  }
  return null
}

/** @param {LinearRgb} linear - Linear RGB components. */
const luminance = (linear) => {
  const [red, green, blue] = linear.map((component) =>
    Math.min(Math.max(component, 0), 1),
  )
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

/**
 * @param {LinearRgb} first - First linear RGB color.
 * @param {LinearRgb} second - Second linear RGB color.
 */
const contrast = (first, second) => {
  const firstLuminance = luminance(first)
  const secondLuminance = luminance(second)
  const high = Math.max(firstLuminance, secondLuminance)
  const low = Math.min(firstLuminance, secondLuminance)
  return (high + 0.05) / (low + 0.05)
}

/**
 * @param {string} label - Human-readable validation label.
 * @param {TokenMap} brandMap - Brand declarations to check.
 */
const checkContrast = (label, brandMap) => {
  for (const [
    foregroundName,
    backgroundName,
    pairLabel,
    minimum,
  ] of CONTRAST_PAIRS) {
    const foreground = toLinear(resolveVar(foregroundName, brandMap))
    const background = toLinear(resolveVar(backgroundName, brandMap))
    if (foreground === null || background === null) {
      // Skip unresolved gradients and unknown color forms.
      continue
    }
    const ratio = contrast(foreground, background)
    if (ratio < minimum) {
      warn(
        `${label}: ${pairLabel} contrast ${ratio.toFixed(2)}:1 < ${minimum}:1 (${foregroundName} on ${backgroundName})`,
      )
    } else {
      ok(`${label}: ${pairLabel} contrast ${ratio.toFixed(2)}:1`)
    }
  }
}

const main = () => {
  const brand = process.argv.at(2)
  if (brand === undefined || brand.length === 0) {
    console.error("usage: validate-brand.mjs <brand>")
    process.exit(1)
  }

  const baseLight = parseDecls("light")
  const baseDark = parseDecls("dark")
  const brandLight = parseDecls(brand)
  const brandDark = parseDecls(`${brand}-dark`)

  console.log(`Validating brand "${brand}"\n`)

  if (baseLight === null) {
    err("figma/light/variables.css not found")
  }
  if (baseDark === null) {
    err("figma/dark/variables.css not found")
  }
  if (brandLight === null) {
    err(`figma/${brand}/variables.css not found`)
  }
  if (brandDark === null) {
    err(`figma/${brand}-dark/variables.css not found`)
  }
  if (
    baseLight === null ||
    baseDark === null ||
    brandLight === null ||
    brandDark === null
  ) {
    console.log(`\n${errors} error(s).`)
    process.exit(1)
  }

  console.log("Parity:")
  checkParity(`${brand} (light)`, brandLight, baseLight)
  checkParity(`${brand}-dark`, brandDark, baseDark)
  checkParity(`${brand} light↔dark`, brandLight, brandDark)

  console.log("\nTwo-layer discipline:")
  checkAliasDowngrade(`${brand} (light)`, brandLight, baseLight)
  checkAliasDowngrade(`${brand}-dark`, brandDark, baseDark)

  console.log("\nContrast (WCAG AA, best-effort):")
  checkContrast(`${brand} (light)`, brandLight)
  checkContrast(`${brand}-dark`, brandDark)

  console.log(`\n${errors} error(s), ${warns} warning(s).`)
  process.exit(errors > 0 ? 1 : 0)
}

main()

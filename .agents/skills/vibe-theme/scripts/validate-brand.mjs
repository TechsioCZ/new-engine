#!/usr/bin/env node
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
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, "..", "..", "..", "..")
const FIGMA_DIR = join(REPO_ROOT, "libs/ui/src/tokens/figma")

const DECL_RE = /^\s*(--[a-z0-9-]+):\s*([^;]+);/gm

/** fg / bg pairs to check for AA contrast, with the minimum ratio. */
const CONTRAST_PAIRS = [
  ["--color-button-fg-primary", "--color-bg-primary-base", "button primary", 4.5],
  ["--color-fg-accent-primary", "--color-bg", "accent text on page", 4.5],
  ["--color-badge-fg-primary", "--color-badge-bg-primary", "badge primary", 3.0],
]

let errors = 0
let warns = 0
const err = (m) => {
  errors += 1
  console.error(`  ✗ ${m}`)
}
const warn = (m) => {
  warns += 1
  console.warn(`  ⚠ ${m}`)
}
const ok = (m) => console.log(`  ✓ ${m}`)

function parseDecls(relDir) {
  const file = join(FIGMA_DIR, relDir, "variables.css")
  if (!existsSync(file)) {
    return null
  }
  const css = readFileSync(file, "utf8")
  const out = new Map()
  DECL_RE.lastIndex = 0
  for (const m of css.matchAll(DECL_RE)) {
    out.set(m[1], m[2].trim())
  }
  return out
}

function checkParity(label, brandMap, baseMap) {
  const brandNames = new Set(brandMap.keys())
  const baseNames = new Set(baseMap.keys())
  const missing = [...baseNames].filter((n) => !brandNames.has(n))
  const extra = [...brandNames].filter((n) => !baseNames.has(n))
  if (missing.length === 0 && extra.length === 0) {
    ok(`${label}: name parity with base (${brandNames.size} tokens)`)
    return
  }
  if (missing.length) {
    err(`${label}: missing ${missing.length} base tokens, e.g. ${missing.slice(0, 5).join(", ")}`)
  }
  if (extra.length) {
    err(`${label}: ${extra.length} tokens not in base, e.g. ${extra.slice(0, 5).join(", ")}`)
  }
}

// Primitive scale names may legitimately hold raw literals.
const PRIMITIVE_RE =
  /^--color-(primary|secondary|tertiary|neutral|gray|grey)-(alpha-)?\d+$/

function checkAliasDowngrade(label, brandMap, baseMap) {
  let count = 0
  for (const [name, baseVal] of baseMap) {
    const brandVal = brandMap.get(name)
    if (brandVal === undefined) {
      continue
    }
    const baseAliases = baseVal.startsWith("var(")
    const brandLiteral = !brandVal.startsWith("var(")
    if (baseAliases && brandLiteral && !PRIMITIVE_RE.test(name)) {
      count += 1
      if (count <= 8) {
        err(`${label}: ${name} downgraded alias→literal (was ${baseVal})`)
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

function resolveVar(name, map, seen = new Set()) {
  if (seen.has(name)) {
    return null
  }
  seen.add(name)
  let val = map.get(name)
  if (val === undefined) {
    return null
  }
  const m = val.match(/^var\((--[a-z0-9-]+)\)$/)
  if (m) {
    return resolveVar(m[1], map, seen)
  }
  return val
}

function srgbToLinear(c) {
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function hexToLinear(hex) {
  let h = hex.replace("#", "")
  if (h.length === 3) {
    h = h.split("").map((x) => x + x).join("")
  }
  if (h.length !== 6) {
    return null
  }
  const r = Number.parseInt(h.slice(0, 2), 16) / 255
  const g = Number.parseInt(h.slice(2, 4), 16) / 255
  const b = Number.parseInt(h.slice(4, 6), 16) / 255
  return [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)]
}

function oklchToLinear(str) {
  const m = str.match(
    /^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*[\d.]+)?\s*\)$/
  )
  if (!m) {
    return null
  }
  let L = Number.parseFloat(m[1])
  if (m[1].endsWith("%")) {
    L /= 100
  }
  const C = Number.parseFloat(m[2])
  const H = (Number.parseFloat(m[3]) * Math.PI) / 180
  const a = C * Math.cos(H)
  const b = C * Math.sin(H)
  const l_ = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m_ = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s_ = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ]
}

const NAMED = { white: "#ffffff", black: "#000000" }

function toLinear(value) {
  if (!value) {
    return null
  }
  const v = value.trim()
  if (NAMED[v]) {
    return hexToLinear(NAMED[v])
  }
  if (v.startsWith("#")) {
    return hexToLinear(v)
  }
  if (v.startsWith("oklch(")) {
    return oklchToLinear(v)
  }
  return null
}

function luminance(lin) {
  const [r, g, b] = lin.map((c) => Math.min(Math.max(c, 0), 1))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a, b) {
  const la = luminance(a)
  const lb = luminance(b)
  const hi = Math.max(la, lb)
  const lo = Math.min(la, lb)
  return (hi + 0.05) / (lo + 0.05)
}

function checkContrast(label, brandMap) {
  for (const [fgName, bgName, pairLabel, min] of CONTRAST_PAIRS) {
    const fg = toLinear(resolveVar(fgName, brandMap))
    const bg = toLinear(resolveVar(bgName, brandMap))
    if (!fg || !bg) {
      continue // unresolved (e.g. gradient / unknown color form) — skip
    }
    const ratio = contrast(fg, bg)
    if (ratio < min) {
      warn(
        `${label}: ${pairLabel} contrast ${ratio.toFixed(2)}:1 < ${min}:1 (${fgName} on ${bgName})`
      )
    } else {
      ok(`${label}: ${pairLabel} contrast ${ratio.toFixed(2)}:1`)
    }
  }
}

function main() {
  const brand = process.argv[2]
  if (!brand) {
    console.error("usage: validate-brand.mjs <brand>")
    process.exit(1)
  }

  const baseLight = parseDecls("light")
  const baseDark = parseDecls("dark")
  const brandLight = parseDecls(brand)
  const brandDark = parseDecls(`${brand}-dark`)

  console.log(`Validating brand "${brand}"\n`)

  if (!brandLight) {
    err(`figma/${brand}/variables.css not found`)
  }
  if (!brandDark) {
    err(`figma/${brand}-dark/variables.css not found`)
  }
  if (!(brandLight && brandDark)) {
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

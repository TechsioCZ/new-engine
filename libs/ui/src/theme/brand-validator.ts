/*
 * The brand validator. A brand passes when it is safe to apply (see
 * `brandDefinitionIssues`), overrides only tokens the foundation has and
 * meets WCAG AA on the checked foreground/background pairs in every mode it
 * declares. It also reports breaks of the two-layer rule: a token that aliases
 * in the foundation should not become a raw literal; only primitive scales
 * hold literals.
 *
 * It carries the whole token foundation, so run it where brands are written
 * (a server, a build or a script), not in the browser.
 */
import { foundationTokens } from "./foundation-tokens"
import {
  type BrandDefinition,
  brandDefinitionIssues,
  type ColorMode,
  defineBrand,
} from "./theme-config"

/** Errors block a brand: unsafe data, a token the foundation lacks, or a
 * checked pair below WCAG AA. Warnings report a two-layer break (an alias
 * turned into a literal), which the kit's own Figma brands still have. */
export type BrandValidation =
  | {
      readonly ok: true
      readonly brand: BrandDefinition
      readonly warnings: readonly string[]
    }
  | {
      readonly ok: false
      readonly errors: readonly string[]
      readonly warnings: readonly string[]
    }

/* Foreground/background pairs with their minimum ratio: 4.5 is AA for
 * normal-size text, which button and badge labels are. */
const CONTRAST_PAIRS = [
  ["--color-button-fg-primary", "--color-bg-primary-base", "button primary"],
  ["--color-badge-fg-primary", "--color-badge-bg-primary", "badge primary"],
] as const
const AA = 4.5

// Primitive scale names may legitimately hold raw literals.
const PRIMITIVE =
  /^--color-[a-z]+-(?:alpha-)?\d+$|^--color-(?:white|black)(?:-\d+)?$/
const ALIAS = /^var\(\s*(--[a-z0-9-]+)\s*(?:,[\s\S]*)?\)$/i
const LIGHT_DARK = /^light-dark\(([\s\S]*)\)$/i

// A derived value (light-dark(), color-mix(), calc() over tokens) still aliases.
const OPAQUE_HEX_ALPHA = /^f+$/i
const HEX6 = /^[\da-f]{6}$/i

const isAlias = (value: string) => value.includes("var(")

function splitTopLevel(value: string): string[] {
  const parts: string[] = []
  let depth = 0
  let start = 0
  for (let index = 0; index < value.length; index++) {
    const char = value[index]
    if (char === "(") {
      depth += 1
    } else if (char === ")") {
      depth -= 1
    } else if (char === "," && depth === 0) {
      parts.push(value.slice(start, index).trim())
      start = index + 1
    }
  }
  parts.push(value.slice(start).trim())
  return parts
}

function resolveValue(
  value: string,
  mode: ColorMode,
  tokens: BrandDefinition["tokens"],
  seen: Set<string>
): string | null {
  const trimmed = value.trim()
  const pair = trimmed.match(LIGHT_DARK)
  if (pair?.[1] !== undefined) {
    const [light, dark] = splitTopLevel(pair[1])
    const chosen = mode === "light" ? light : dark
    return chosen ? resolveValue(chosen, mode, tokens, seen) : null
  }
  const alias = trimmed.match(ALIAS)
  if (alias?.[1] !== undefined) {
    return resolveToken(alias[1], mode, tokens, seen)
  }
  return trimmed
}

function resolveToken(
  name: string,
  mode: ColorMode,
  tokens: BrandDefinition["tokens"],
  seen = new Set<string>()
): string | null {
  if (seen.has(name)) {
    return null
  }
  seen.add(name)
  const value = tokens[name] ?? foundationTokens[name]
  return value === undefined ? null : resolveValue(value, mode, tokens, seen)
}

type Linear = readonly [number, number, number]

const srgbToLinear = (c: number) =>
  c <= 0.040_45 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4

function hexToLinear(hex: string): Linear | null {
  let h = hex.slice(1)
  const alpha =
    h.length === 4 || h.length === 8 ? h.slice((h.length / 4) * 3) : ""
  if (alpha !== "" && !OPAQUE_HEX_ALPHA.test(alpha)) {
    return null
  }
  if (h.length === 3 || h.length === 4) {
    h = [...h.slice(0, 3)].map((x) => x + x).join("")
  }
  h = h.slice(0, 6)
  if (!HEX6.test(h)) {
    return null
  }
  const channel = (offset: number) =>
    srgbToLinear(Number.parseInt(h.slice(offset, offset + 2), 16) / 255)
  return [channel(0), channel(2), channel(4)]
}

const OKLCH =
  /^oklch\(\s*([\d.]+%?)\s+([\d.]+|none)\s+([\d.]+|none)(?:\s*\/\s*([\d.]+%?))?\s*\)$/i
const RGB =
  /^rgba?\(\s*([\d.]+%?)[\s,]+([\d.]+%?)[\s,]+([\d.]+%?)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i

/* A colour with any transparency shows what lies behind it, which a pair of
 * tokens cannot say, so only opaque colours have a contrast. */
const opaque = (alpha: string | undefined) =>
  alpha === undefined ||
  Number.parseFloat(alpha) / (alpha.endsWith("%") ? 100 : 1) >= 1

function rgbToLinear(value: string): Linear | null {
  const m = value.match(RGB)
  if (!(m?.[1] && m[2] && m[3] && opaque(m[4]))) {
    return null
  }
  const channel = (part: string) =>
    srgbToLinear(
      Math.min(Number.parseFloat(part) / (part.endsWith("%") ? 100 : 255), 1)
    )
  return [channel(m[1]), channel(m[2]), channel(m[3])]
}

function oklchToLinear(value: string): Linear | null {
  const m = value.match(OKLCH)
  if (!(m?.[1] && m[2] && m[3] && opaque(m[4]))) {
    return null
  }
  const lightness = Number.parseFloat(m[1]) / (m[1].endsWith("%") ? 100 : 1)
  const chroma = m[2] === "none" ? 0 : Number.parseFloat(m[2])
  const hue = ((m[3] === "none" ? 0 : Number.parseFloat(m[3])) * Math.PI) / 180
  const a = chroma * Math.cos(hue)
  const b = chroma * Math.sin(hue)
  const l = (lightness + 0.396_337_777_4 * a + 0.215_803_757_3 * b) ** 3
  const mm = (lightness - 0.105_561_345_8 * a - 0.063_854_172_8 * b) ** 3
  const s = (lightness - 0.089_484_177_5 * a - 1.291_485_548 * b) ** 3
  return [
    4.076_741_662_1 * l - 3.307_711_591_3 * mm + 0.230_969_929_2 * s,
    -1.268_438_004_6 * l + 2.609_757_401_1 * mm - 0.341_319_396_5 * s,
    -0.004_196_086_3 * l - 0.703_418_614_7 * mm + 1.707_614_701 * s,
  ]
}

function toLinear(value: string | null): Linear | null {
  if (value === null) {
    return null
  }
  const v = value.toLowerCase()
  if (v === "white") {
    return [1, 1, 1]
  }
  if (v === "black") {
    return [0, 0, 0]
  }
  if (v.startsWith("#")) {
    return hexToLinear(v)
  }
  if (v.startsWith("rgb")) {
    return rgbToLinear(v)
  }
  return v.startsWith("oklch(") ? oklchToLinear(v) : null
}

function luminance(linear: Linear): number {
  const [r, g, b] = linear.map((c) => Math.min(Math.max(c, 0), 1)) as [
    number,
    number,
    number,
  ]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio of two colour tokens in one mode of a brand, or null
 * when either does not resolve to a colour the validator can read. */
export function brandContrast(
  brand: BrandDefinition,
  mode: ColorMode,
  foreground: string,
  background: string
): number | null {
  const fg = toLinear(resolveToken(foreground, mode, brand.tokens))
  const bg = toLinear(resolveToken(background, mode, brand.tokens))
  if (!(fg && bg)) {
    return null
  }
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((x, y) => y - x) as [
    number,
    number,
  ]
  return (hi + 0.05) / (lo + 0.05)
}

/** Validate untrusted brand data against the token foundation. */
export function validateBrand(input: unknown): BrandValidation {
  const issues = brandDefinitionIssues(input)
  if (issues.length > 0) {
    return { ok: false, errors: issues, warnings: [] }
  }
  const brand = defineBrand(input)
  const errors: string[] = []
  const warnings: string[] = []
  for (const [name, value] of Object.entries(brand.tokens)) {
    const base = foundationTokens[name]
    if (base === undefined) {
      errors.push(`${name}: not a token of the foundation`)
    } else if (isAlias(base) && !isAlias(value) && !PRIMITIVE.test(name)) {
      warnings.push(`${name}: must alias another token, as the foundation does`)
    }
  }
  for (const mode of brand.modes) {
    for (const [fg, bg, label] of CONTRAST_PAIRS) {
      const ratio = brandContrast(brand, mode, fg, bg)
      if (ratio === null) {
        errors.push(
          `${label} (${mode}): contrast cannot be checked; give ${fg} and ${bg} opaque hex, rgb() or oklch() colours`
        )
      } else if (ratio < AA) {
        errors.push(
          `${label} (${mode}): contrast ${ratio.toFixed(2)}:1 is below ${AA}:1 (${fg} on ${bg})`
        )
      }
    }
  }
  return errors.length > 0
    ? { ok: false, errors, warnings }
    : { ok: true, brand, warnings }
}

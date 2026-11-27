/*
 * Brand themes are data. A brand is a `BrandDefinition`: a key (the
 * `data-theme` value), a label, the colour modes it supports and the token
 * overrides that make it differ from the shared foundation. Applications pass
 * the brands they offer to `AppThemeProvider` at runtime, so adding a brand
 * needs no kit release; the kit's own Figma brands are exported as the same
 * data from `./built-in-brands`.
 *
 * Two orthogonal axes:
 *   - brand  → applied as `data-theme="<key>"` on <html> (or on a `BrandScope`)
 *   - mode   → applied as a `.light` / `.dark` class driving `color-scheme`
 *
 * A brand declares which modes it ships: light only, dark only, or both. A
 * single-mode brand locks the mode; only a brand with both offers a switch.
 *
 * The attribute-less `:root` / `@theme` layer (figma/light + figma/dark) is the
 * shared token foundation every brand overrides. It is not a selectable brand.
 */

import type { UIDefaults } from "./ui-provider"

export type ColorMode = "light" | "dark"

/** What the user can pick for the mode axis. `system` follows the OS. */
export type ModeSetting = ColorMode | "system"

/** Custom-property overrides keyed by their `--name`. A brand with both modes
 * may give a token `light-dark(<light>, <dark>)`. */
export type BrandTokens = Readonly<Record<string, string>>

export type BrandDefinition = {
  /** `data-theme` value: lowercase kebab-case. */
  readonly key: string
  /** Human label shown in togglers. */
  readonly label: string
  /** Concrete modes this brand ships, light first. */
  readonly modes: readonly ColorMode[]
  /** Tokens that differ from the shared foundation. */
  readonly tokens: BrandTokens
  /** Component style defaults (size, appearance, per-component) this brand
   * applies through AppThemeProvider, on top of the md + solid baseline. */
  readonly defaults?: UIDefaults
}

/** localStorage keys used by the provider for persistence. */
export const BRAND_STORAGE_KEY = "ui-brand"
export const MODE_STORAGE_KEY = "ui-mode"

const KEY = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/
const TOKEN_NAME = /^--[a-z0-9]+(?:-{1,2}[a-z0-9]+)*$/
/* Token values are written into a stylesheet, so only the characters CSS
 * values for colour, size and alias tokens need are admitted: no quotes,
 * braces, semicolons, angle brackets, backslashes, at-rules or url(). */
const TOKEN_VALUE = /^[a-z0-9 .,%()#/*+-]+$/i
const MAX_KEY = 64
const MAX_LABEL = 120
const MAX_NAME = 128
const MAX_VALUE = 512
const COLOR_MODES: readonly ColorMode[] = ["light", "dark"]

export class BrandDefinitionError extends Error {
  readonly issues: readonly string[]
  constructor(issues: readonly string[]) {
    super(`Invalid brand definition: ${issues.join("; ")}`)
    this.name = "BrandDefinitionError"
    this.issues = issues
  }
}

function balanced(value: string): boolean {
  let depth = 0
  for (const char of value) {
    if (char === "(") {
      depth += 1
    } else if (char === ")") {
      depth -= 1
      if (depth < 0) {
        return false
      }
    }
  }
  return depth === 0
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

function defaultsIssues(value: unknown): string[] {
  if (value === undefined) {
    return []
  }
  if (!isRecord(value)) {
    return ["defaults must be an object"]
  }
  const issues: string[] = []
  for (const key of ["size", "appearance"] as const) {
    if (value[key] !== undefined && typeof value[key] !== "string") {
      issues.push(`defaults.${key} must be a string`)
    }
  }
  if (value.components !== undefined) {
    if (isRecord(value.components)) {
      for (const [name, entry] of Object.entries(value.components)) {
        if (
          !(
            isRecord(entry) &&
            Object.values(entry).every((v) => typeof v === "string")
          )
        ) {
          issues.push(`defaults.components.${name} must map to strings`)
        }
      }
    } else {
      issues.push("defaults.components must be an object")
    }
  }
  return issues
}

/** Everything that makes a value unsafe or malformed as a brand, without
 * comparing it to the token foundation (see `validateBrand` for that). */
export function brandDefinitionIssues(input: unknown): string[] {
  if (!isRecord(input)) {
    return ["a brand must be an object"]
  }
  const issues: string[] = []
  const { key, label, modes, tokens } = input
  if (typeof key !== "string" || key.length > MAX_KEY || !KEY.test(key)) {
    issues.push(
      `key must be lowercase kebab-case, at most ${MAX_KEY} characters`
    )
  }
  if (
    typeof label !== "string" ||
    label.trim() === "" ||
    label.length > MAX_LABEL
  ) {
    issues.push(`label must be 1–${MAX_LABEL} characters`)
  }
  const modeList = Array.isArray(modes) ? modes : []
  if (
    modeList.length === 0 ||
    modeList.some((mode) => !COLOR_MODES.includes(mode)) ||
    new Set(modeList).size !== modeList.length
  ) {
    issues.push('modes must be "light", "dark" or both, each once')
  }
  if (isRecord(tokens)) {
    for (const [name, value] of Object.entries(tokens)) {
      if (name.length > MAX_NAME || !TOKEN_NAME.test(name)) {
        issues.push(`${name}: not a token name`)
        continue
      }
      if (
        typeof value !== "string" ||
        value.trim() === "" ||
        value.length > MAX_VALUE ||
        !TOKEN_VALUE.test(value) ||
        value.includes("/*") ||
        !balanced(value)
      ) {
        issues.push(`${name}: not a safe token value`)
      }
    }
  } else {
    issues.push("tokens must be an object of --name: value pairs")
  }
  return [...issues, ...defaultsIssues(input.defaults)]
}

/** Parse untrusted data (JSON from a store or an API) into a brand. Throws
 * `BrandDefinitionError` listing every problem. */
export function defineBrand(input: unknown): BrandDefinition {
  const issues = brandDefinitionIssues(input)
  if (issues.length > 0) {
    throw new BrandDefinitionError(issues)
  }
  const brand = input as BrandDefinition
  const modes = COLOR_MODES.filter((mode) => brand.modes.includes(mode))
  return {
    key: brand.key,
    label: brand.label,
    modes,
    tokens: { ...brand.tokens },
    ...(brand.defaults === undefined ? {} : { defaults: brand.defaults }),
  }
}

/** A new brand derived from `base`: its tokens, then `patch.tokens` on top.
 * Use it for a subtree that alters the inherited brand (see `BrandScope`). */
export function extendBrand(
  base: BrandDefinition,
  patch: Pick<BrandDefinition, "key"> & Partial<Omit<BrandDefinition, "key">>
): BrandDefinition {
  return defineBrand({
    key: patch.key,
    label: patch.label ?? base.label,
    modes: patch.modes ?? base.modes,
    tokens: { ...base.tokens, ...patch.tokens },
    defaults: patch.defaults ?? base.defaults,
  })
}

const SCHEME_SCOPES = ".light, .dark, .always-light, .always-dark, .reverse"

/** The stylesheet that applies a brand wherever `data-theme="<key>"` is set.
 * Like the kit's compiled brands it is scoped up to the next nested brand, and
 * it re-declares the tokens at nested scheme switches so aliases re-resolve. */
export function brandStylesheet(brand: BrandDefinition): string {
  const issues = brandDefinitionIssues(brand)
  if (issues.length > 0) {
    throw new BrandDefinitionError(issues)
  }
  const declarations = Object.entries(brand.tokens)
    .map(([name, value]) => `    ${name}: ${value};`)
    .join("\n")
  return `@scope ([data-theme="${brand.key}"]) to ([data-theme]) {\n  :scope,\n  :scope :where(${SCHEME_SCOPES}) {\n${declarations}\n  }\n}\n`
}

/** Baseline every AppThemeProvider starts from before brand defaults. */
export const BASE_UI_DEFAULTS = {
  size: "md",
  appearance: "solid",
} as const satisfies UIDefaults

/** Component style defaults for a brand, merged over BASE_UI_DEFAULTS. */
export function brandUIDefaults(brand: BrandDefinition): UIDefaults {
  return { ...BASE_UI_DEFAULTS, ...brand.defaults }
}

/** Whether a brand ships both modes (and therefore allows mode switching). */
export function brandSwitchesMode(brand: BrandDefinition): boolean {
  return brand.modes.length > 1
}

/** Mode settings a brand allows in a toggler: its only mode, or all three. */
export function availableModeSettings(brand: BrandDefinition): ModeSetting[] {
  return brandSwitchesMode(brand)
    ? ["light", "dark", "system"]
    : [...brand.modes]
}

/** The mode a brand renders in, given the request and the OS appearance. */
export function resolveAppearance(
  brand: BrandDefinition,
  requested: ModeSetting,
  system: ColorMode
): ColorMode {
  const wanted = requested === "system" ? system : requested
  return brand.modes.includes(wanted) ? wanted : (brand.modes[0] ?? "light")
}

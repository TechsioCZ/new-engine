/*
 * Theme registry — the single source of truth for brand themes and the modes
 * each one supports. Consumed by the runtime provider/hook, the Storybook
 * toolbars, and (kept in sync by hand) the merge-figma-themes.mjs BRANDS list.
 *
 * Two orthogonal axes:
 *   - brand  → applied as `data-theme="<attr>"` on <html>
 *   - mode   → applied as a `.light` / `.dark` class driving `color-scheme`
 *
 * A brand that only ships a light variant declares `modes: ["light"]`; its
 * dark control is then hidden and the mode is locked to light.
 *
 * The attribute-less `:root` / `@theme` layer (figma/light + figma/dark) is the
 * shared token foundation every brand overrides. It is not a selectable brand.
 */

import type { UIDefaults } from "./ui-provider"

export type ColorMode = "light" | "dark"

/** What the user can pick for the mode axis. `system` follows the OS. */
export type ModeSetting = ColorMode | "system"

export type BrandConfig = {
  /** Human label shown in togglers. */
  label: string
  /** Concrete modes this brand ships. Light-only brands omit "dark". */
  modes: ColorMode[]
  /** `data-theme` attribute value for this brand. */
  attr: string
  /** Component style defaults (size, appearance, per-component) this brand
   * applies through AppThemeProvider, on top of the md + solid baseline. */
  defaults?: UIDefaults
}

export const THEMES = {
  business: { label: "Business", modes: ["light"], attr: "business" },
  akros: { label: "Akros", modes: ["light"], attr: "akros" },
  n1: { label: "N1", modes: ["light"], attr: "n1" },
} as const satisfies Record<string, BrandConfig>

export type BrandKey = keyof typeof THEMES

export const DEFAULT_BRAND: BrandKey = "business"
export const DEFAULT_MODE: ModeSetting = "system"

/** localStorage keys used by the provider for persistence. */
export const BRAND_STORAGE_KEY = "ui-brand"
export const MODE_STORAGE_KEY = "ui-mode"

export function brandKeys(): BrandKey[] {
  return Object.keys(THEMES) as BrandKey[]
}

export function getBrand(key: BrandKey): BrandConfig {
  return THEMES[key]
}

export function isBrandKey(value: string): value is BrandKey {
  return Object.hasOwn(THEMES, value)
}

/** Baseline every AppThemeProvider starts from before brand defaults. */
export const BASE_UI_DEFAULTS = {
  size: "md",
  appearance: "solid",
} as const satisfies UIDefaults

/** Component style defaults for a brand, merged over BASE_UI_DEFAULTS. */
export function brandUIDefaults(key: BrandKey): UIDefaults {
  const defaults = getBrand(key).defaults
  return { ...BASE_UI_DEFAULTS, ...defaults }
}

/** `data-theme` value for a brand. */
export function brandAttr(key: BrandKey): string {
  return getBrand(key).attr
}

/** Whether a brand ships a dark variant (and therefore allows mode switching). */
export function brandSupportsDark(key: BrandKey): boolean {
  return getBrand(key).modes.includes("dark")
}

/** Mode settings a brand allows in a toggler. Light-only brands get just light. */
export function availableModeSettings(key: BrandKey): ModeSetting[] {
  return brandSupportsDark(key) ? ["light", "dark", "system"] : ["light"]
}

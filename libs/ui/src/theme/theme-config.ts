/*
 * Theme registry — the single source of truth for brand themes and the modes
 * each one supports. Consumed by the runtime provider/hook, the Storybook
 * toolbars, and (kept in sync by hand) the merge-figma-themes.mjs BRANDS list.
 *
 * Two orthogonal axes:
 *   - brand  → applied as `data-theme="<attr>"` on <html> (base has no attr)
 *   - mode   → applied as a `.light` / `.dark` class driving `color-scheme`
 *
 * A brand that only ships a light variant declares `modes: ["light"]`; its
 * dark control is then hidden and the mode is locked to light.
 */

export type ColorMode = "light" | "dark"

/** What the user can pick for the mode axis. `system` follows the OS. */
export type ModeSetting = ColorMode | "system"

export interface BrandConfig {
  /** Human label shown in togglers. */
  label: string
  /** Concrete modes this brand ships. Light-only brands omit "dark". */
  modes: ColorMode[]
  /**
   * `data-theme` attribute value for this brand. Omitted for the base brand,
   * which is the default `:root` / `@theme` and needs no attribute.
   */
  attr?: string | undefined
}

export const THEMES = {
  base: { label: "Default", modes: ["light", "dark"] },
  neo: { attr: "neo", label: "Neo (Red)", modes: ["light", "dark"] },
} as const satisfies Record<string, BrandConfig>

export type BrandKey = keyof typeof THEMES

export const DEFAULT_BRAND: BrandKey = "base"
export const DEFAULT_MODE: ModeSetting = "system"

/** localStorage keys used by the provider for persistence. */
export const BRAND_STORAGE_KEY = "ui-brand"
export const MODE_STORAGE_KEY = "ui-mode"

export const isBrandKey = (value: string): value is BrandKey =>
  Object.hasOwn(THEMES, value)

export const brandKeys = (): BrandKey[] =>
  Object.keys(THEMES).filter(isBrandKey)

export const getBrand = (key: BrandKey): BrandConfig => THEMES[key]

/** `data-theme` value for a brand, or `undefined` for the attribute-less base. */
export const brandAttr = (key: BrandKey): string | undefined =>
  getBrand(key).attr

/** Whether a brand ships a dark variant (and therefore allows mode switching). */
export const brandSupportsDark = (key: BrandKey): boolean =>
  getBrand(key).modes.includes("dark")

/** Mode settings a brand allows in a toggler. Light-only brands get just light. */
export const availableModeSettings = (key: BrandKey): ModeSetting[] =>
  brandSupportsDark(key) ? ["light", "dark", "system"] : ["light"]

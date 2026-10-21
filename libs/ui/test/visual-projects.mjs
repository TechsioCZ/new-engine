import { THEMES } from "../src/theme/theme-config.ts"

/** @typedef {"base" | "neo" | "business" | "akros"} VisualBrand */
/** @typedef {"light" | "dark"} VisualColorScheme */

/** Resolve the canvas theme exactly like the Storybook brand-lock decorator.
 * Locked stories are captured consistently in every project, not skipped: the
 * completeness gate still requires every story/project identity, including Akros.
 * @param {Record<string, unknown>} globals
 * @param {unknown} [brandLock]
 * @returns {{brand: VisualBrand, mode: VisualColorScheme}}
 */
export function resolveVisualTheme(globals, brandLock) {
  const brand = brandLock ?? globals.brand
  if (typeof brand !== "string" || !Object.hasOwn(THEMES, brand)) {
    throw new Error(`Unsupported declared story brand: ${String(brand)}`)
  }
  if (globals.mode !== "light" && globals.mode !== "dark") {
    throw new Error(`Unsupported declared story mode: ${String(globals.mode)}`)
  }
  const typedBrand = /** @type {VisualBrand} */ (brand)
  const mode =
    globals.mode === "dark" && THEMES[typedBrand].modes.includes("dark")
      ? "dark"
      : "light"
  return { brand: typedBrand, mode }
}

/** Supported brand/mode pairs, shared by accessibility and visual checks. */
export function createThemeMatrix() {
  return Object.entries(THEMES).flatMap(([brand, config]) =>
    config.modes.map((mode) => ({ brand, mode }))
  )
}

/**
 * Brand × device × color-scheme projects. Device settings come from
 * Playwright's "Desktop Chrome" and "iPhone 15" descriptors in the config.
 * @param {string} [brandsString]
 */
export function createVisualMatrix(
  brandsString = Object.keys(THEMES).join(",")
) {
  const brands = [
    ...new Set(
      brandsString
        .split(",")
        .map((brand) => brand.trim())
        .filter(Boolean)
    ),
  ]
  if (!brands.length) {
    throw new Error("At least one visual brand is required")
  }
  return brands.flatMap((brand) => {
    if (!Object.hasOwn(THEMES, brand)) {
      throw new Error(
        `Unsupported visual brand: ${brand}. Choose base, neo, business or akros.`
      )
    }
    const typedBrand = /** @type {VisualBrand} */ (brand)
    return [false, true].flatMap((isMobile) =>
      THEMES[typedBrand].modes.map((colorScheme) => ({
        brand: typedBrand,
        name: `${brand === "base" ? "" : `${brand}-`}${isMobile ? "mobile" : "desktop"}-${colorScheme}`,
        colorScheme,
        isMobile,
      }))
    )
  })
}

import { THEMES } from "../src/theme/theme-config.ts"

/** @typedef {"base" | "neo" | "business" | "akros"} VisualBrand */
/** @typedef {"light" | "dark"} VisualColorScheme */

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

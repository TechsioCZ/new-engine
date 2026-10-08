/** @typedef {"base" | "neo" | "business" | "akros"} VisualBrand */
/** @typedef {"light" | "dark"} VisualColorScheme */

/** @type {Record<VisualBrand, VisualColorScheme[]>} */
const brandColorSchemes = {
  base: ["light", "dark"],
  neo: ["light", "dark"],
  business: ["light"],
  akros: ["light"],
}

/**
 * Brand × device × color-scheme projects. Device settings come from
 * Playwright's "Desktop Chrome" and "iPhone 15" descriptors in the config.
 * @param {string} [brandsString]
 */
export function createVisualMatrix(brandsString = "base,neo,business") {
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
    if (!Object.hasOwn(brandColorSchemes, brand)) {
      throw new Error(
        `Unsupported visual brand: ${brand}. Choose base, neo, business or akros.`
      )
    }
    const typedBrand = /** @type {VisualBrand} */ (brand)
    return [false, true].flatMap((isMobile) =>
      brandColorSchemes[typedBrand].map((colorScheme) => ({
        brand: typedBrand,
        name: `${brand === "base" ? "" : `${brand}-`}${isMobile ? "mobile" : "desktop"}-${colorScheme}`,
        colorScheme,
        isMobile,
      }))
    )
  })
}

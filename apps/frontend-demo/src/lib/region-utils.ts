import type { StoreRegion } from "@medusajs/types"

const getBrowserCountryCode = (): string | undefined => {
  if (typeof navigator === "undefined") {
    return undefined
  }

  const locale = navigator.languages?.[0] ?? navigator.language
  const localeParts = locale?.split("-")

  if (!localeParts || localeParts.length < 2) {
    return undefined
  }

  return localeParts[1]?.toLowerCase()
}

export function resolveRegionCountryCode(
  region: StoreRegion | null | undefined
): string | undefined {
  if (!region?.countries?.length) {
    return undefined
  }

  const countryCodes = region.countries
    .map((country) => country.iso_2?.toLowerCase())
    .filter((code): code is string => Boolean(code))

  if (countryCodes.length === 0) {
    return undefined
  }

  const browserCountryCode = getBrowserCountryCode()
  if (browserCountryCode && countryCodes.includes(browserCountryCode)) {
    return browserCountryCode
  }

  if (countryCodes.includes("cz")) {
    return "cz"
  }

  return countryCodes[0]
}

import type { StoreRegion } from "@medusajs/types"

const extractCountryCodeFromLocale = (locale: string): string | undefined => {
  const localeParts = locale
    .replaceAll("_", "-")
    .split("-")
    .map((part) => part.trim())
    .filter(Boolean)

  if (localeParts.length < 2) {
    return undefined
  }

  const regionPart = localeParts
    .slice(1)
    .find((part) => /^[a-z]{2}$/i.test(part) || /^[0-9]{3}$/.test(part))

  return regionPart?.toLowerCase()
}

const getBrowserCountryCode = (): string | undefined => {
  if (typeof navigator === "undefined") {
    return undefined
  }

  const locale = navigator.languages?.[0] ?? navigator.language
  if (!locale) {
    return undefined
  }

  return extractCountryCodeFromLocale(locale)
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

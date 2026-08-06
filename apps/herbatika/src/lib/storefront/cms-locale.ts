import type { HerbatikaLocale } from "./market-context"

export type CmsLocale = "sk" | "cs" | "hu" | "ro"

const CMS_LOCALE_BY_MARKET_LOCALE = {
  "sk-SK": "sk",
  "cs-CZ": "cs",
  "hu-HU": "hu",
  "ro-RO": "ro",
} as const satisfies Record<HerbatikaLocale, CmsLocale>

/** Maps the storefront's BCP 47 locale to Payload's configured locale code. */
export const resolveCmsLocale = (locale: HerbatikaLocale): CmsLocale =>
  CMS_LOCALE_BY_MARKET_LOCALE[locale]

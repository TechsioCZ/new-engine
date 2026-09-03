import type { IconType } from "@techsio/ui-kit/atoms/icon"
import type { Market } from "@/lib/url/types"

const FOOTER_MARKETS: readonly Readonly<{
  code: string
  icon: IconType
  locale: string
  market: Market
}>[] = [
  { code: "SK", icon: "token-icon-sk", locale: "sk-SK", market: "sk" },
  { code: "CZ", icon: "token-icon-cz", locale: "cs-CZ", market: "cz" },
  { code: "HU", icon: "token-icon-hu", locale: "hu-HU", market: "hu" },
  { code: "RO", icon: "token-icon-ro", locale: "ro-RO", market: "ro" },
]

export type FooterMarketAlternates = Readonly<Record<string, string>>

const validatedMarketAlternateHref = (href: string): string | null => {
  try {
    const url = new URL(href)
    if (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.hash
    ) {
      return url.href
    }
  } catch {
    // Invalid alternate links fail closed and are not rendered.
  }
  return null
}

export const resolveFooterMarketLinks = (
  activeMarket: Market,
  alternates: FooterMarketAlternates = {}
) =>
  FOOTER_MARKETS.flatMap(({ code, icon, locale, market }) => {
    const href = validatedMarketAlternateHref(alternates[locale] ?? "")
    return href
      ? [{ active: market === activeMarket, code, href, icon, market }]
      : []
  })

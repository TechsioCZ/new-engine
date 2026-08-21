// Pages Router callers import this module exclusively through getServerSideProps.
// Do not add the App-Router-only `server-only` marker here.

import { buildPath, type PublicRouteTarget } from "@/lib/url/public-url"
import type { Market } from "@/lib/url/types"
import { fetchCmsJsonOrThrow } from "./cms-client"
import type { CmsFooterNavigation } from "./cms-types"
import type { HerbatikaLocale } from "./market-context"

type CmsFooterNavigationResponse = {
  footerNavigation?: CmsFooterNavigation | null
}

const MARKET_BY_LOCALE = {
  "cs-CZ": "cz",
  "hu-HU": "hu",
  "ro-RO": "ro",
  "sk-SK": "sk",
} as const satisfies Record<HerbatikaLocale, Market>

const FALLBACK_INFORMATION_ITEMS = [
  { slot: "blog", target: { kind: "article" } },
  { slot: "about", target: { kind: "static", page: "about" } },
  { slot: "faq", target: { kind: "static", page: "faq" } },
  { slot: "brands", target: { kind: "brand" } },
] as const satisfies readonly {
  slot: "about" | "blog" | "brands" | "faq"
  target: PublicRouteTarget
}[]

export const getMarketFooterNavigation = (
  locale: HerbatikaLocale
): CmsFooterNavigation => {
  const market = MARKET_BY_LOCALE[locale]
  return {
    columns: [
      {
        items: FALLBACK_INFORMATION_ITEMS.map(({ slot, target }) => ({
          href: buildPath(target, market),
          slot,
          type: "internal" as const,
        })),
        slot: "information",
      },
    ],
  }
}

export const fetchCmsFooterNavigation = async (locale: HerbatikaLocale) => {
  const fallback = getMarketFooterNavigation(locale)
  try {
    const response = await fetchCmsJsonOrThrow<CmsFooterNavigationResponse>(
      "navigation/footer",
      { locale }
    )

    const navigation = response.footerNavigation
    return navigation?.columns.length ? navigation : fallback
  } catch (error) {
    console.error("Failed to fetch CMS footer navigation", error)
    return fallback
  }
}

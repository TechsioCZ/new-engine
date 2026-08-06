import {
  buildAccountUrl,
  buildCartUrl,
  buildCheckoutUrl,
  buildSearchUrl,
  getMarketOrigin,
} from "@/lib/url/builder"
import type { Market } from "@/lib/url/types"

/** Internal/API surfaces and non-indexable storefront flows are blocked. */
export function buildRobotsTxt(market: Market): string {
  const disallowed = [
    "/~sf/",
    "/api/",
    buildCartUrl(market),
    buildCheckoutUrl(market),
    buildAccountUrl(market),
    buildSearchUrl(market),
  ]
    .map((path) => `Disallow: ${path}`)
    .join("\n")
  return `User-agent: *\n${disallowed}\n\nSitemap: ${getMarketOrigin(market)}/sitemap.xml\n`
}

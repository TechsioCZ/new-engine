import { getMarketOrigin } from "@/lib/url/builder"
import type { Market } from "@/lib/url/types"

/** Internal and API routes are blocked; noindex public flows remain crawlable. */
export function buildRobotsTxt(market: Market): string {
  return `User-agent: *\nDisallow: /~sf/\nDisallow: /api/\n\nSitemap: ${getMarketOrigin(market)}/sitemap.xml\n`
}

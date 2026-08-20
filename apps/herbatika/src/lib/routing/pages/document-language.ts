import {
  DEFAULT_MARKET_CONTEXT,
  getHerbatikaMarketContext,
  type HerbatikaLocale,
} from "@/lib/storefront/market-context"
import { parseMarket } from "@/lib/url/segments"

export const resolvePagesDocumentHtmlLang = (
  trustedMarket: string | readonly string[] | undefined
): HerbatikaLocale => {
  const market =
    typeof trustedMarket === "string" ? parseMarket(trustedMarket) : null
  return market
    ? getHerbatikaMarketContext(market).htmlLang
    : DEFAULT_MARKET_CONTEXT.htmlLang
}

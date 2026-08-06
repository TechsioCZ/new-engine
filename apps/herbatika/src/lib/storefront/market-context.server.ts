import { assertServerOnly } from "@/lib/server-guard"
import {
  getHerbatikaMarketContext,
  type HerbatikaMarketCode,
  type HerbatikaMarketContext,
  resolveMarketContext,
} from "./market-context"

assertServerOnly("storefront/market-context.server")

export type HerbatikaServerMarketContext = Omit<
  HerbatikaMarketContext,
  "salesChannelId"
> & {
  salesChannelId: string
}

export type RequestServerContext = {
  cookieHeader?: string
  host?: string
  market: HerbatikaMarketCode
  trustedMarket?: string
}

export type MarketServerContextInput = {
  host?: string | null
  market?: HerbatikaMarketCode | null
  trustedMarket?: string | null
}

/**
 * Server-only runtime binding. Configure all deployed markets with:
 * MARKET_SALES_CHANNEL_SK, MARKET_SALES_CHANNEL_CZ,
 * MARKET_SALES_CHANNEL_HU, and MARKET_SALES_CHANNEL_RO.
 */
const SALES_CHANNEL_ENV_BY_MARKET = {
  sk: "MARKET_SALES_CHANNEL_SK",
  cz: "MARKET_SALES_CHANNEL_CZ",
  hu: "MARKET_SALES_CHANNEL_HU",
  ro: "MARKET_SALES_CHANNEL_RO",
} as const satisfies Record<HerbatikaMarketCode, string>

const isMarketCode = (value: unknown): value is HerbatikaMarketCode =>
  value === "sk" || value === "cz" || value === "hu" || value === "ro"

export const resolveMarketSalesChannelId = (
  market: HerbatikaMarketCode,
  environment: Record<string, string | undefined> = process.env
): string => {
  const environmentName = SALES_CHANNEL_ENV_BY_MARKET[market]
  const salesChannelId = environment[environmentName]?.trim()

  if (!salesChannelId) {
    throw new Error(
      `Missing server runtime environment variable ${environmentName} for market ${market}`
    )
  }

  return salesChannelId
}

/** Pure market resolver shared by Pages and App Router request adapters. */
export const resolveMarketServerContext = ({
  host,
  market,
  trustedMarket,
}: MarketServerContextInput): HerbatikaServerMarketContext => {
  let marketContext: HerbatikaMarketContext | null
  if (market) {
    marketContext = getHerbatikaMarketContext(market)
  } else if (isMarketCode(trustedMarket)) {
    marketContext = getHerbatikaMarketContext(trustedMarket)
  } else {
    marketContext = resolveMarketContext({ host })
  }

  if (!marketContext) {
    throw new Error("Unknown storefront host; market context is unavailable")
  }

  return {
    ...marketContext,
    salesChannelId: resolveMarketSalesChannelId(marketContext.code),
  }
}

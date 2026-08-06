import "server-only"

import { headers } from "next/headers"
import { cache } from "react"
import {
  type HerbatikaMarketCode,
  type HerbatikaMarketContext,
  resolveMarketContext,
} from "./market-context"

export type HerbatikaServerMarketContext = Omit<
  HerbatikaMarketContext,
  "salesChannelId"
> & {
  salesChannelId: string
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

export const getMarketServerContext = cache(
  async (): Promise<HerbatikaServerMarketContext> => {
    const headerStore = await headers()
    const marketContext = resolveMarketContext({
      acceptLanguage: headerStore.get("accept-language"),
      host:
        headerStore.get("x-forwarded-host") ??
        headerStore.get("host") ??
        undefined,
    })

    return {
      ...marketContext,
      salesChannelId: resolveMarketSalesChannelId(marketContext.code),
    }
  }
)

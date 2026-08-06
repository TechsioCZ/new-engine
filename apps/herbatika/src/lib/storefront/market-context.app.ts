import { headers } from "next/headers"
import { cache } from "react"
import { assertServerOnly } from "@/lib/server-guard"
import {
  type RequestServerContext,
  resolveMarketServerContext,
} from "./market-context.server"

assertServerOnly("storefront/market-context.app")

export const getAppRequestServerContext = cache(
  async (): Promise<RequestServerContext> => {
    const headerStore = await headers()
    const marketContext = resolveMarketServerContext({
      host: headerStore.get("host"),
      trustedMarket: headerStore.get("x-sf-market"),
    })

    return {
      cookieHeader: headerStore.get("cookie") ?? undefined,
      host: headerStore.get("host") ?? undefined,
      market: marketContext.code,
      trustedMarket: headerStore.get("x-sf-market") ?? undefined,
    }
  }
)

export const getMarketServerContext = cache(async () =>
  resolveMarketServerContext(await getAppRequestServerContext())
)

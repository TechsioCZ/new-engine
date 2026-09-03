import "server-only"

import { headers } from "next/headers"
import { cache } from "react"
import { resolveMarketRequestContext } from "./market-context"

export const getMarketServerContext = cache(async () => {
  const headerStore = await headers()
  const context = resolveMarketRequestContext({
    forwardedHost: headerStore.get("x-forwarded-host"),
    host: headerStore.get("host"),
    trustedCanonicalOrigin: headerStore.get("x-sf-canonical-origin"),
    trustedMarket: headerStore.get("x-sf-market"),
  })
  if (!context) {
    throw new Error("Unknown storefront host")
  }
  return context
})

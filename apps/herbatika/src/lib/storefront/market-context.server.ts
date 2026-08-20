import "server-only"

import { headers } from "next/headers"
import { cache } from "react"
import { resolveConfiguredMarketRuntimeBindingByHost } from "@/lib/market/market-runtime.server"
import {
  getHerbatikaMarketContext,
  resolveMarketRequestHost,
} from "./market-context"

export const getMarketServerContext = cache(async () => {
  const headerStore = await headers()

  const host = resolveMarketRequestHost({
    forwardedHost: headerStore.get("x-forwarded-host"),
    host: headerStore.get("host"),
  })
  const binding = resolveConfiguredMarketRuntimeBindingByHost(host)
  if (!binding) {
    throw new Error("Unknown storefront host")
  }
  return getHerbatikaMarketContext(
    binding.market,
    new URL(binding.canonicalOrigin).hostname
  )
})

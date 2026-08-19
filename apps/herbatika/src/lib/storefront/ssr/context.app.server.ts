import "server-only"

import { headers } from "next/headers"
import { resolveConfiguredMarketRuntimeBindingByHost } from "@/lib/market/market-runtime.server"
import { getRegionServerContext } from "./context"

/** App Router adapter. Pages SSR must pass its trusted market explicitly. */
export const getAppRegionServerContext = async () => {
  const headerStore = await headers()
  const binding = resolveConfiguredMarketRuntimeBindingByHost(
    headerStore.get("host")
  )
  if (!binding) {
    throw new Error("Request host does not belong to an enabled market")
  }

  const trustedMarket = headerStore.get("x-sf-market")
  if (trustedMarket && trustedMarket !== binding.market) {
    throw new Error("Trusted market header does not match request host")
  }

  return getRegionServerContext({ market: binding.market })
}

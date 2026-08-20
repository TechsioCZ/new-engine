// Pages Router rejects the App-Router-only `server-only` marker. Keep this
// module reachable only from server entry points.

import {
  createMedusaSdk,
  type MedusaSdk,
} from "@techsio/storefront-data/shared/medusa-client"
import type { MarketCode } from "@/lib/market/market-runtime"
import { getConfiguredMarketRuntime } from "@/lib/market/market-runtime.server"
import { createMarketSdkAuthority } from "./market-sdk-authority"
import { resolveMedusaBackendUrl } from "./runtime-env"

let marketSdkAuthority:
  | ReturnType<typeof createMarketSdkAuthority<MedusaSdk>>
  | undefined

const getMarketSdkAuthority = () => {
  marketSdkAuthority ??= createMarketSdkAuthority({
    baseUrl: resolveMedusaBackendUrl(),
    createSdk: createMedusaSdk,
    runtime: getConfiguredMarketRuntime(),
  })
  return marketSdkAuthority
}

export const getMarketStorefrontSdk = (market: MarketCode) =>
  getMarketSdkAuthority()(market)
